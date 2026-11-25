const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { createAppInstance } = require('../helpers/app-loader');
let db;
const A = '11111111-0000-4000-8000-000000000000';
const B = '22222222-0000-4000-8000-000000000000';
const migration = name => fs.readFileSync(path.join(__dirname, '../../supabase/migrations', name), 'utf8');
before(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}', email_confirmed_at timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;`);
    await db.exec(migration('202610120001_membership.sql'));
    await db.exec(migration('202611260001_order_mail_limit.sql'));
    await db.exec(migration('202611260002_shop_orders.sql'));
    for (const id of [A, B]) await db.query('INSERT INTO auth.users(id,email,email_confirmed_at) VALUES ($1,$2,now())', [id, `${id}@example.com`]);
});
after(async () => { if (db) await db.close(); });

let ref = 100000;
async function order(lines, { member = A, id = `MAX-${++ref}`, shipping = 'pickup', coupon = '' } = {}) {
    const { rows } = await db.query('SELECT public.server_create_order($1,$2,$3::jsonb,$4,$5) AS o',
        [member, id, typeof lines === 'string' ? lines : JSON.stringify(lines), shipping, coupon]);
    return rows[0].o;
}
const codeOf = async id => (await db.query('SELECT referral_code FROM public.profiles WHERE id=$1', [id])).rows[0].referral_code;

test('prices, names, shipping and totals come from the server catalog', async () => {
    const result = await order([{ id: 'max_1', qty: 2 }, { id: 'max_8', qty: 1 }], { shipping: 'cold', id: 'MAX-111111' });
    assert.equal(result.id, 'MAX-111111');
    assert.deepEqual(result.items.map(i => [i.id, i.qty, i.price]), [['max_1', 2, 45], ['max_8', 1, 65]]);
    assert.match(result.items[0].name, /ข้าวหลาม/);
    assert.deepEqual([result.subtotal, result.discountAmount, result.shippingCost, result.total], [155, 0, 85, 240]);
});

test('the seeded catalog matches the prices and names shown on the page', async () => {
    const { app } = createAppInstance();
    // JSON round trip: the page arrays come from another vm realm.
    const shown = JSON.parse(JSON.stringify(app.currentProducts.map(p => [p.id, p.name, p.price]))).sort();
    const { rows } = await db.query('SELECT id,name,price FROM private.products WHERE active ORDER BY id');
    assert.deepEqual(rows.map(r => [r.id, r.name, r.price]), shown);
});

test('coupons follow the shop rules and round like the page does', async () => {
    const five = [{ id: 'max_6', qty: 1 }];
    assert.equal((await order([{ id: 'max_1', qty: 3 }], { coupon: 'MAX10' })).discountAmount, 0);
    assert.equal((await order([{ id: 'max_1', qty: 3 }, { id: 'max_2', qty: 1 }], { coupon: 'max10' })).discountAmount, 18);
    assert.equal((await order([{ id: 'max_1', qty: 1 }], { coupon: 'WELCOME10' })).discountAmount, 5);
    assert.equal((await order(five, { coupon: 'FREE100' })).discountAmount, 0);
});

test('a referral code discounts only when it belongs to another member', async () => {
    const lines = [{ id: 'max_3', qty: 2 }];
    assert.equal((await order(lines, { coupon: await codeOf(B) })).discountAmount, 10);
    assert.equal((await order(lines, { coupon: await codeOf(A) })).discountAmount, 0);
    assert.equal((await order(lines, { coupon: 'MAX0000' })).discountAmount, 0);
});

test('the same order number returns the stored order; different content under it is refused', async () => {
    const first = await order([{ id: 'max_1', qty: 1 }], { id: 'MAX-222222' });
    await db.exec("UPDATE private.products SET price = 99 WHERE id = 'max_1'");
    try {
        assert.deepEqual(await order([{ id: 'max_1', qty: 1 }], { id: 'MAX-222222' }), first);
        assert.equal(await order([{ id: 'max_1', qty: 9 }], { id: 'MAX-222222' }), null);
    } finally { await db.exec("UPDATE private.products SET price = 45 WHERE id = 'max_1'"); }
    const { rows } = await db.query("SELECT count(*)::int AS n FROM private.shop_orders WHERE order_ref = 'MAX-222222'");
    assert.equal(rows[0].n, 1);
});

test('invalid orders are refused and nothing is stored', async () => {
    const count = async () => (await db.query('SELECT count(*)::int AS n FROM private.shop_orders')).rows[0].n;
    const before = await count();
    await db.exec("UPDATE private.products SET active = false WHERE id = 'max_2'");
    const good = [{ id: 'max_1', qty: 1 }];
    try {
        for (const [lines, options] of [
            [[], {}], ['{}', {}], ['[1]', {}], [[{ id: 'max_1', qty: 0 }], {}], [[{ id: 'max_1', qty: 100 }], {}],
            [[{ id: 'max_1', qty: 1.5 }], {}], [[{ id: 'max_1', qty: '1' }], {}], [[{ id: 'nope', qty: 1 }], {}],
            [[{ id: 'max_2', qty: 1 }], {}], [[...good, ...good], {}], [Array(21).fill(good[0]), {}],
            [good, { shipping: 'free' }], [good, { id: 'MAX-1' }], [good, { coupon: 'x'.repeat(41) }]
        ]) assert.equal(await order(lines, options), null, JSON.stringify([lines, options]).slice(0, 90));
    } finally { await db.exec("UPDATE private.products SET active = true WHERE id = 'max_2'"); }
    assert.equal(await count(), before);
});

test('one member can store at most 20 orders per 24 hours', async () => {
    await db.exec('DELETE FROM private.shop_orders');
    for (let i = 0; i < 20; i++) assert.ok(await order([{ id: 'max_1', qty: 1 }]));
    assert.equal(await order([{ id: 'max_1', qty: 1 }]), null);
    assert.ok(await order([{ id: 'max_1', qty: 1 }], { member: B }));
});

test('browser roles cannot create orders or read the catalog and order tables', async () => {
    for (const role of ['anon', 'authenticated']) {
        await db.exec(`SET ROLE ${role}`);
        try {
            await assert.rejects(order([{ id: 'max_1', qty: 1 }]), /permission denied/);
            for (const table of ['private.products', 'private.shop_orders']) {
                await assert.rejects(db.query(`SELECT * FROM ${table}`), /permission denied/);
            }
        } finally { await db.exec('RESET ROLE'); }
    }
});
