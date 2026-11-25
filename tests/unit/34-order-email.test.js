const { test } = require('node:test');
const assert = require('node:assert/strict');
const handlerModule = import('../../supabase/functions/order-email/handler.mjs');

const MEMBER = '11111111-1111-4111-8111-111111111111';
const ORDER = { id: 'MAX-123456', items: [{ id: 'max_1', qty: 2 }], shipping: 'express', coupon: '' };
// What the database returns: prices, names and totals never come from the request.
const STORED = { id: 'MAX-123456', items: [{ id: 'max_1', name: 'ข้าวหลาม <b>', qty: 2, price: 60 }], subtotal: 120, discountAmount: 12, shippingCost: 40, total: 148 };

async function fixture(overrides = {}) {
    const sent = [], claims = [], orders = [];
    const backend = {
        getUser: async token => token === 'valid' ? { id: MEMBER, email: 'member@example.com', email_confirmed_at: 'now' } : null,
        getProfile: async () => ({ name: '<script>ผู้ซื้อ', referral_code: 'MAXABCD1234', consent_at: 'now' }),
        claimSend: async (id, kind) => { claims.push([id, kind]); return true; },
        createOrder: async (id, order) => { orders.push([id, order]); return STORED; },
        ...overrides
    };
    const sendMail = overrides.sendMail || (async (message, eventId) => { sent.push({ message, eventId }); });
    const { createOrderMailHandler } = await handlerModule;
    const handler = createOrderMailHandler({ backend, sendMail, siteUrl: 'https://shop.example/store/' });
    const request = (body, headers = {}, method = 'POST') => handler(new Request('https://p.supabase.co/functions/v1/order-email', {
        method, headers: { Origin: 'https://shop.example', Authorization: 'Bearer valid', ...headers },
        ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {})
    }));
    return { request, sent, claims, orders };
}

test('order mail goes only to the verified account address, with server totals and escaped text', async () => {
    const f = await fixture();
    const result = await f.request({ kind: 'order', order: ORDER });
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { ok: true, recipient: 'member@example.com', order: STORED });
    assert.deepEqual(f.orders, [[MEMBER, ORDER]]);
    assert.equal(f.sent.length, 1);
    const { message, eventId } = f.sent[0];
    assert.deepEqual(Object.keys(message).sort(), ['body', 'htmlBody', 'messageId', 'subject', 'to']);
    assert.equal(message.to, 'member@example.com');
    assert.equal(message.messageId, 'primary');
    assert.match(message.subject, /MAX-123456/);
    assert.match(message.body, /148/);
    assert.ok(!message.htmlBody.includes('<script>') && !message.htmlBody.includes('<b>'));
    assert.match(message.htmlBody, /&lt;b&gt;/);
    assert.match(eventId, /^[A-Za-z0-9_-]{1,128}$/);
    assert.deepEqual(f.claims, [[MEMBER, 'order']]);
});

test('welcome mail takes name and referral code from the server profile', async () => {
    const f = await fixture();
    assert.equal((await f.request({ kind: 'welcome' })).status, 200);
    assert.match(f.sent[0].message.body, /MAXABCD1234/);
    assert.match(f.sent[0].message.body, /WELCOME10/);
});

test('client cannot choose recipient, subject, or HTML', async () => {
    const f = await fixture();
    for (const body of [
        { kind: 'order', order: ORDER, to: 'victim@example.com' },
        { kind: 'welcome', html: '<a>x</a>' },
        { kind: 'order', order: { ...ORDER, to: 'victim@example.com' } },
        { kind: 'order', order: { ...ORDER, items: [{ ...ORDER.items[0], html: 'x' }] } }
    ]) assert.equal((await f.request(body)).status, 400);
    assert.equal(f.sent.length, 0);
});

test('invalid order values are rejected before a quota slot is used', async () => {
    const f = await fixture();
    const item = ORDER.items[0];
    for (const order of [
        { ...ORDER, id: 'MAX-1\nBcc: x' }, { ...ORDER, items: [] }, { ...ORDER, items: Array(21).fill(item) },
        { ...ORDER, items: [{ ...item, id: 'x'.repeat(41) }] }, { ...ORDER, items: [{ ...item, id: 'a\r\nb' }] },
        { ...ORDER, items: [{ ...item, qty: 0 }] }, { ...ORDER, items: [{ ...item, price: 1 }] },
        { ...ORDER, items: [{ ...item, name: 'x' }] }, { ...ORDER, shipping: 'free' }, { ...ORDER, coupon: 'x'.repeat(41) },
        { ...ORDER, shippingCost: 0 }, { ...ORDER, discountAmount: 119 }
    ]) assert.equal((await f.request({ kind: 'order', order })).status, 400, JSON.stringify(order).slice(0, 80));
    assert.equal((await f.request('{bad')).status, 400);
    assert.equal((await f.request({ kind: 'order', order: ORDER, pad: 'x'.repeat(9000) })).status, 400);
    assert.deepEqual(f.claims, []);
    assert.deepEqual(f.orders, []);
});

test('an order the database refuses sends no mail and uses no quota slot', async () => {
    const f = await fixture({ createOrder: async () => null });
    assert.equal((await f.request({ kind: 'order', order: ORDER })).status, 409);
    assert.equal(f.sent.length + f.claims.length, 0);
});

test('the Supabase backend creates orders through the service-only function', async () => {
    const { createSupabaseBackend } = await handlerModule;
    const calls = [];
    const backend = createSupabaseBackend({ rpc: async (...args) => { calls.push(args); return { data: STORED, error: null }; } });
    assert.deepEqual(await backend.createOrder(MEMBER, ORDER), STORED);
    assert.deepEqual(calls, [['server_create_order', { member_id: MEMBER, order_ref: ORDER.id, lines: ORDER.items, shipping_code: 'express', coupon_code: '' }]]);
});

test('wrong origin, method, missing login, unverified or unconsented member cannot send', async () => {
    const f = await fixture();
    assert.equal((await f.request({ kind: 'welcome' }, { Origin: 'https://evil.test' })).status, 403);
    assert.equal((await f.request(null, {}, 'GET')).status, 405);
    assert.equal((await f.request(null, {}, 'OPTIONS')).status, 204);
    assert.equal((await f.request({ kind: 'welcome' }, { Authorization: '' })).status, 401);
    assert.equal((await f.request({ kind: 'welcome' }, { Authorization: 'Bearer fake' })).status, 401);
    const unverified = await fixture({ getUser: async () => ({ id: MEMBER, email: 'a@b.co', email_confirmed_at: null }) });
    assert.equal((await unverified.request({ kind: 'welcome' })).status, 401);
    const noConsent = await fixture({ getProfile: async () => ({ name: 'x', referral_code: 'M', consent_at: null }) });
    assert.equal((await noConsent.request({ kind: 'welcome' })).status, 403);
    assert.equal(f.sent.length + unverified.sent.length + noConsent.sent.length, 0);
});

test('rate limit blocks the send', async () => {
    const f = await fixture({ claimSend: async () => false });
    assert.equal((await f.request({ kind: 'order', order: ORDER })).status, 429);
    assert.equal(f.sent.length, 0);
});

test('relay failure is reported honestly without leaking details', async () => {
    const f = await fixture({ sendMail: async () => { throw new Error('secret detail'); } });
    const result = await f.request({ kind: 'welcome' });
    assert.equal(result.status, 502);
    assert.ok(!(await result.text()).includes('secret detail'));
});

test('signed relay export reuses the auth mail envelope and requires confirmation', async () => {
    const { sendRelayMessages } = await import('../../supabase/functions/send-auth-email/relay.mjs');
    const config = { projectUrl: 'https://lxvxffrexegvqzeojztw.supabase.co', siteUrl: 'https://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/',
        relaySecret: 'fixture', gasUrl: 'https://script.google.com/macros/s/fixture/exec', upstreamTimeoutMs: 3500 };
    const message = { messageId: 'primary', to: 'a@example.com', subject: 's', htmlBody: '<p>h</p>', body: 'b' };
    let envelope;
    await sendRelayMessages([message], 'order_abc', config, { fetchImpl: async (url, options) => {
        envelope = JSON.parse(options.body);
        return new Response(JSON.stringify({ success: true, eventId: 'order_abc' }));
    } });
    assert.equal(envelope.eventId, 'order_abc');
    assert.deepEqual(JSON.parse(envelope.payload), { version: 1, messages: [message] });
    assert.ok(envelope.signature);
    await assert.rejects(sendRelayMessages([message], 'order_abc', config,
        { fetchImpl: async () => new Response(JSON.stringify({ success: false })) }));
    await assert.rejects(sendRelayMessages([message], 'order_abc', { ...config, relaySecret: '' }, { fetchImpl: async () => { throw new Error('must not fetch'); } }), /not configured/);
});
