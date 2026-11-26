const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createAppInstance } = require('../helpers/app-loader');

const SITE = 'https://maxmuxsix-demo.vercel.app/';
const MEMBER = '11111111-1111-4111-8111-111111111111';
const MIGRATION = fs.readFileSync(path.resolve(__dirname, '../../supabase/migrations/202611260002_shop_orders.sql'), 'utf8');
// The catalog the database is seeded with.
const CATALOG = [...MIGRATION.matchAll(/\('(max_\d)', '([^']+)', (\d+)\)/g)]
    .map(([, id, name, price]) => ({ id, name, price: Number(price) }));
const DELIVERY = { name: 'สมชาย ใจดี', phone: '081-234-5678', address: '99/1 ถนนสุขุมวิท กรุงเทพฯ 10110' };

function stored(items) {
    const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
    return { id: 'MAX-654321', items, subtotal, discountAmount: 7, shippingCost: 50, total: subtotal + 43 };
}

// Goes through the real signed relay, so its 32 KiB limit applies.
async function send(body, result) {
    const { createOrderMailHandler } = await import('../../supabase/functions/order-email/handler.mjs');
    const { sendRelayMessages } = await import('../../supabase/functions/send-auth-email/relay.mjs');
    const sent = [], created = [];
    const relay = { projectUrl: 'https://lxvxffrexegvqzeojztw.supabase.co', siteUrl: SITE, relaySecret: 'fixture',
        gasUrl: 'https://script.google.com/macros/s/fixture/exec', upstreamTimeoutMs: 3500 };
    const handler = createOrderMailHandler({
        siteUrl: SITE,
        backend: {
            getUser: async () => ({ id: MEMBER, email: 'member@example.com', email_confirmed_at: 'now' }),
            getProfile: async () => ({ name: 'ผู้สมัคร <i>', referral_code: 'MAXABCD1234', consent_at: 'now' }),
            claimSend: async () => true,
            createOrder: async (id, order) => { created.push(order); return result; }
        },
        sendMail: (message, eventId) => sendRelayMessages([message], eventId, relay, {
            fetchImpl: async (url, options) => {
                sent.push({ message, bytes: Buffer.byteLength(options.body) });
                return new Response(JSON.stringify({ success: true, eventId }));
            }
        })
    });
    const response = await handler(new Request('https://p.supabase.co/functions/v1/order-email', {
        method: 'POST', headers: { Origin: 'https://maxmuxsix-demo.vercel.app', Authorization: 'Bearer valid' }, body: JSON.stringify(body)
    }));
    return { status: response.status, sent, created };
}
const orderBody = (items, extra = {}) => ({ kind: 'order', order: {
    id: 'MAX-654321', items: items.map(({ id, qty }) => ({ id, qty })), shipping: 'express', coupon: '', ...extra } });
const twoItems = () => CATALOG.slice(0, 2).map(item => ({ ...item, qty: 2 }));

test('the seeded catalog was read for these tests', () => {
    assert.equal(CATALOG.length, 8);
});

test('order mail is the full receipt: design, product pictures, delivery details, totals', async () => {
    const items = twoItems();
    const result = await send(orderBody(items, { delivery: DELIVERY }), stored(items));
    assert.equal(result.status, 200);
    const { htmlBody, body } = result.sent[0].message;
    for (const part of ['<!DOCTYPE html>', 'ใบสรุปคำสั่งซื้อ', 'ข้อมูลผู้รับและการจัดส่ง', 'รายการสินค้าที่สั่งซื้อ', 'ยอดชำระสุทธิ', '#FAA307',
        `src="${SITE}max_1.jpg"`, `src="${SITE}max_2.jpg"`, items[0].name, 'MAX-654321', 'member@example.com',
        DELIVERY.name, DELIVERY.phone, DELIVERY.address, `${stored(items).total} บาท`, `${SITE}?orderId=MAX-654321`]) {
        assert.ok(htmlBody.includes(part), `missing: ${part}`);
    }
    assert.ok(!htmlBody.includes('{{'));
    assert.ok(body.includes(DELIVERY.address), 'the plain text copy keeps the address');
});

test('delivery details are used in the mail only, never passed to the order database', async () => {
    const items = twoItems();
    const result = await send(orderBody(items, { delivery: DELIVERY }), stored(items));
    assert.deepEqual(Object.keys(result.created[0]).sort(), ['coupon', 'id', 'items', 'shipping']);
});

test('the receipt claims nothing the server did not check', async () => {
    const items = twoItems();
    const { htmlBody } = (await send(orderBody(items, { delivery: DELIVERY }), stored(items))).sent[0].message;
    assert.ok(!htmlBody.includes('แจ้งชำระเงินเรียบร้อย'));
    assert.ok(!htmlBody.includes('08X-XXX-XXXX'));
    assert.ok(htmlBody.includes('วันที่ส่งเมล'));
    assert.ok(!htmlBody.includes('ใบเสร็จ'), 'a receipt would say the money arrived');
    assert.ok(!htmlBody.includes('กำลังคัดสรร'), 'nobody has confirmed the kitchen started');
});

test('markup typed into delivery fields stays text', async () => {
    const items = twoItems();
    const delivery = { name: '<img src=x onerror=1>', phone: '"><a href=//evil>', address: 'บ้าน\n<script>x</script>' };
    const { htmlBody } = (await send(orderBody(items, { delivery }), stored(items))).sent[0].message;
    assert.ok(!htmlBody.includes('<img src=x') && !htmlBody.includes('<a href=//evil') && !htmlBody.includes('<script>'));
    assert.ok(htmlBody.includes('&lt;script&gt;'));
});

test('a page that sends no delivery details still gets the receipt, without address rows', async () => {
    const items = twoItems();
    const result = await send(orderBody(items), stored(items));
    assert.equal(result.status, 200);
    const { htmlBody } = result.sent[0].message;
    assert.ok(htmlBody.includes('ใบสรุปคำสั่งซื้อ'));
    assert.ok(!htmlBody.includes('ที่อยู่จัดส่ง') && !htmlBody.includes('เบอร์ติดต่อ'));
    assert.ok(htmlBody.includes('ผู้สมัคร &lt;i&gt;'), 'falls back to the escaped profile name');
});

test('malformed or oversized delivery details are rejected', async () => {
    const items = twoItems();
    for (const delivery of [
        null, 'x', { ...DELIVERY, email: 'victim@example.com' }, { name: 'a', phone: 'b' }, { ...DELIVERY, name: 5 },
        { ...DELIVERY, name: 'x'.repeat(101) }, { ...DELIVERY, phone: '0'.repeat(31) }, { ...DELIVERY, address: 'x'.repeat(1001) }
    ]) {
        const result = await send(orderBody(items, { delivery }), stored(items));
        assert.equal(result.status, 400, JSON.stringify(delivery)?.slice(0, 60));
        assert.equal(result.sent.length, 0);
    }
});

test('all eight products with the longest address keep pictures and fit the relay', async () => {
    const items = CATALOG.map(item => ({ ...item, qty: 99 }));
    const delivery = { name: 'ก'.repeat(100), phone: '0'.repeat(30), address: 'ข'.repeat(1000) };
    const result = await send(orderBody(items, { delivery }), stored(items));
    assert.equal(result.status, 200);
    const { htmlBody } = result.sent[0].message;
    assert.equal((htmlBody.match(/<img /g) || []).length, 8);
    assert.ok(htmlBody.includes('ข'.repeat(1000)));
});

test('an order too big for pictures keeps the design without them', async () => {
    const items = Array.from({ length: 17 }, (_, i) => ({ id: `max_${i}`, name: 'ข้าวหลาม'.repeat(2), qty: 1, price: 50 }));
    const result = await send(orderBody(items, { delivery: { ...DELIVERY, address: 'ข'.repeat(1000) } }), stored(items));
    assert.equal(result.status, 200);
    const { htmlBody } = result.sent[0].message;
    assert.ok(htmlBody.startsWith('<!DOCTYPE html>'), 'still the designed receipt');
    assert.ok(!htmlBody.includes('<img '));
});

test('an order too big for the full design is still sent in a smaller layout', async () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: `max_${i}`, name: 'ข้าวหลาม'.repeat(10), qty: 99, price: 10000 }));
    const delivery = { name: 'ก'.repeat(100), phone: '0'.repeat(30), address: '<'.repeat(1000) };
    const result = await send(orderBody(items, { delivery }), stored(items));
    assert.equal(result.status, 200);
    assert.ok(result.sent[0].bytes <= 32 * 1024);
    assert.ok(result.sent[0].message.htmlBody.includes('MAX-654321'));
    assert.ok(result.sent[0].message.htmlBody.includes(`${stored(items).total} บาท`));
});

test('welcome mail is the full design with the member name, codes and catalog prices', async () => {
    const result = await send({ kind: 'welcome' });
    assert.equal(result.status, 200);
    const { htmlBody } = result.sent[0].message;
    assert.ok(!htmlBody.includes('คำสั่งซื้อแรก'), 'the database gives WELCOME10 on every order');
    for (const part of ['<!DOCTYPE html>', 'ยินดีต้อนรับสมาชิกใหม่', 'WELCOME10', 'MAXABCD1234', 'ผู้สมัคร &lt;i&gt;', 'เมนูขายดีที่ต้องลอง']) {
        assert.ok(htmlBody.includes(part), `missing: ${part}`);
    }
    const cards = [...htmlBody.matchAll(/(max_\d)\.jpg"[^>]*alt="([^"]+)"[\s\S]*?(\d+) บาท/g)];
    assert.equal(cards.length, 4);
    for (const [, id, name, price] of cards) {
        assert.deepEqual({ id, name, price: Number(price) }, CATALOG.find(item => item.id === id));
    }
    assert.ok(!htmlBody.includes('⭐'), 'no customer review the shop cannot show a source for');
    assert.ok(!htmlBody.includes('ยกเลิกการรับข่าวสาร'), 'no unsubscribe link that does nothing');
});

test('the browser sends the delivery details typed at checkout, cut to the server limits', async () => {
    const { createMembership } = require('../../assets/js/cloud-auth');
    let body;
    const user = { id: 'm', email: 'buyer@example.com', email_confirmed_at: 'now' };
    const client = {
        auth: { getSession: async () => ({ data: { session: { user } }, error: null }), getUser: async () => ({ data: { user }, error: null }) },
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'm', name: 'B', referral_code: 'MAXA', consent_at: 'now' }, error: null }) }) }) }),
        rpc: async () => ({ data: false, error: null }),
        functions: { invoke: async (name, options) => { body = options.body; return { data: { ok: true, recipient: user.email }, error: null }; } }
    };
    const service = createMembership({ config: { url: 'https://t.supabase.co', publishableKey: 'sb_publishable_t', redirectUrl: 'https://s.example/' }, createClient: () => client });
    await service.refresh();
    await service.sendMail('order', user.email, { id: 'MAX-123456', shippingMethod: 'express', items: [], name: 'n'.repeat(150), phone: '081', address: 'a'.repeat(1200) });
    assert.deepEqual(body.order.delivery, { name: 'n'.repeat(100), phone: '081', address: 'a'.repeat(1000) });
});

function subscribeSetup(mailResult) {
    const alerts = [];
    const instance = createAppInstance({ globals: { alert: message => alerts.push(String(message)) } });
    instance.state.emailSettings = { provider: 'gas', gasToken: '' };
    instance.state.membership = { sendMail: async () => mailResult };
    const submit = async () => {
        instance.getElement('subscribeEmailInput').value = 'guest@example.com';
        await instance.app.handleQuickSubscribe(null, 'web_page');
        await new Promise(resolve => setImmediate(resolve));
    };
    return { instance, alerts, submit };
}

test('the subscribe box does not claim a welcome mail that was not sent', async () => {
    const f = subscribeSetup({ success: false, message: 'ส่งได้เฉพาะสมาชิก' });
    await f.submit();
    const box = f.instance.getElement('subscribeSuccessBox').innerHTML;
    assert.ok(!box.includes('ระบบได้จัดส่งอีเมลต้อนรับ'), box);
    assert.match(box, /ยังไม่ได้ส่งอีเมลต้อนรับ[\s\S]*ส่งได้เฉพาะสมาชิก/);
    assert.match(box, /WELCOME10/);
});

test('the subscribe box reports a confirmed welcome mail', async () => {
    const f = subscribeSetup({ success: true, message: 'sent' });
    await f.submit();
    assert.match(f.instance.getElement('subscribeSuccessBox').innerHTML, /ระบบได้จัดส่งอีเมลต้อนรับ[\s\S]*guest@example\.com/);
});

test('a blocked subscribe shows the warning and no sent notification', async () => {
    const f = subscribeSetup({ success: true, message: 'sent' });
    for (let i = 0; i < 20 && f.alerts.length === 0; i++) {
        f.instance.getElement('emailToastArea').innerHTML = '';
        await f.submit();
    }
    assert.equal(f.alerts.length, 1, 'the rate limit was reached and shown as a warning');
    assert.equal(f.instance.getElement('emailToastArea').innerHTML, '');
});
