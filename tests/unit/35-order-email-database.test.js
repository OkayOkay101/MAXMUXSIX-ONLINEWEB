const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
let db;
const ids = Array.from({ length: 8 }, (_, i) => `${i + 1}${'0'.repeat(7)}-0000-4000-8000-000000000000`);
const migration = name => fs.readFileSync(path.join(__dirname, '../../supabase/migrations', name), 'utf8');
before(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}', email_confirmed_at timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;`);
    await db.exec(migration('202610120001_membership.sql'));
    // Mirrors the event-trigger helper that exists in the hosted project.
    await db.exec(`CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN END $$;
      GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO anon, authenticated;`);
    await db.exec(migration('202611260001_order_mail_limit.sql'));
    for (const id of ids) await db.query('INSERT INTO auth.users(id,email,email_confirmed_at) VALUES ($1,$2,now())', [id, `${id}@example.com`]);
});
after(async () => { if (db) await db.close(); });
const claim = async (id, kind) => (await db.query('SELECT public.server_claim_mail_send($1,$2) AS ok', [id, kind])).rows[0].ok;

test('member gets 5 order mails and 1 welcome mail per 24 hours', async () => {
    for (let i = 0; i < 5; i++) assert.equal(await claim(ids[0], 'order'), true);
    assert.equal(await claim(ids[0], 'order'), false);
    assert.equal(await claim(ids[0], 'welcome'), true);
    assert.equal(await claim(ids[0], 'welcome'), false);
    await db.exec("UPDATE private.mail_log SET created_at = now() - interval '25 hours'");
    assert.equal(await claim(ids[0], 'order'), true);
});

test('all members together are capped at 20 per 24 hours so signup mail keeps relay capacity', async () => {
    await db.exec('DELETE FROM private.mail_log');
    let allowed = 0;
    for (const id of ids) for (let i = 0; i < 5; i++) if (await claim(id, 'order')) allowed++;
    assert.equal(allowed, 20);
});

test('unknown kinds are refused and browser roles cannot claim or read the log', async () => {
    await assert.rejects(claim(ids[0], 'marketing'));
    for (const role of ['anon', 'authenticated']) {
        await db.exec(`SET ROLE ${role}`);
        try {
            await assert.rejects(db.query(`SELECT public.server_claim_mail_send('${ids[0]}','order')`), /permission denied/);
            await assert.rejects(db.query('SELECT * FROM private.mail_log'), /permission denied/);
        } finally { await db.exec('RESET ROLE'); }
    }
});

test('rls_auto_enable is no longer executable by browser roles', async () => {
    const { rows } = await db.query(`SELECT has_function_privilege('anon','public.rls_auto_enable()','execute') AS a,
        has_function_privilege('authenticated','public.rls_auto_enable()','execute') AS b`);
    assert.deepEqual(rows[0], { a: false, b: false });
});
