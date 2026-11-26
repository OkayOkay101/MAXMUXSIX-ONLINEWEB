const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAppInstance } = require('../helpers/app-loader');

function setup(result) {
    const calls = [];
    let fetched = 0;
    const instance = createAppInstance({ globals: { fetch: async () => { fetched++; return { json: async () => ({ success: true }) }; } } });
    instance.state.membership = { sendMail: async (...args) => { calls.push(args); return result; } };
    return { instance, app: instance.app, calls, fetched: () => fetched };
}
const order = { id: 'MAX-123456', userId: 'm', name: 'x', email: 'buyer@example.com', total: 100, items: [{ name: 'a', qty: 1, price: 100 }] };

test('customer mail goes through the server function, never straight to the Apps Script relay', async () => {
    const f = setup({ success: true, message: 'sent' });
    f.instance.state.orders = [order];
    const result = await f.app.dispatchRealEmail({ id: 'ORD-EML-1', orderId: order.id, to: order.email, htmlContent: '<b>x</b>' });
    assert.equal(result.success, true);
    assert.equal(f.calls[0][0], 'order');
    assert.equal(f.calls[0][1], order.email);
    assert.equal(f.calls[0][2].id, order.id);
    assert.equal(f.fetched(), 0);
});

test('order mail ignores saved admin relay settings and still goes through the server function', async () => {
    for (const emailSettings of [
        { provider: 'gas', gasUrl: 'https://script.google.com/macros/s/x/exec', gasToken: 't' },
        { provider: 'web3forms', web3formsKey: 'k'.repeat(36) }
    ]) {
        const f = setup({ success: true, message: 'sent' });
        f.instance.state.emailSettings = emailSettings;
        f.instance.state.orders = [order];
        await f.app.dispatchRealEmail({ id: 'ORD-EML-1', orderId: order.id, to: order.email, htmlContent: '<b>x</b>' });
        assert.deepEqual([f.calls.length, f.fetched()], [1, 0], emailSettings.provider);
        assert.equal(f.calls[0][0], 'order');
    }
});

test('the notification shows the real result instead of claiming success early', async () => {
    const f = setup({ success: false, message: 'ยังส่งไม่ได้' });
    f.instance.state.orders = [order];
    f.app.sendOrderConfirmationEmail(order);
    await new Promise(resolve => setImmediate(resolve));
    assert.match(f.instance.getElement('email-toast-body').textContent, /⚠️ ยังส่งไม่ได้/);
    assert.ok(!f.instance.getElement('emailToastArea').innerHTML.includes('ส่งใบเสร็จคำสั่งซื้อแล้ว'));
});

const { createMembership } = require('../../assets/js/cloud-auth');
async function signedIn(invoke) {
    const user = { id: 'm', email: 'buyer@example.com', email_confirmed_at: 'now' };
    const client = {
        auth: { getSession: async () => ({ data: { session: { user } }, error: null }), getUser: async () => ({ data: { user }, error: null }) },
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'm', name: 'B', referral_code: 'MAXA', consent_at: 'now' }, error: null }) }) }) }),
        rpc: async () => ({ data: false, error: null }),
        functions: { invoke }
    };
    const service = createMembership({ config: { url: 'https://t.supabase.co', publishableKey: 'sb_publishable_t', redirectUrl: 'https://s.example/' }, createClient: () => client });
    await service.refresh();
    return service;
}
const serverOrder = { id: 'MAX-123456', items: [{ id: 'max_1', name: 'n', qty: 2, price: 45 }], subtotal: 90, discountAmount: 0, shippingCost: 50, total: 140 };

test('the browser sends ids, quantities, shipping choice and coupon, never prices', async () => {
    let body;
    const service = await signedIn(async (name, options) => { body = options.body; return { data: { ok: true, recipient: 'buyer@example.com', order: serverOrder }, error: null }; });
    const local = { id: 'MAX-123456', shippingCost: 50, shippingMethod: 'express', couponCode: 'WELCOME10', discountAmount: 89, total: 51, items: [{ id: 'max_1', name: 'cheap', qty: 2, price: 1 }] };
    const result = await service.sendMail('order', 'buyer@example.com', local);
    assert.deepEqual(body, { kind: 'order', order: { id: 'MAX-123456', items: [{ id: 'max_1', qty: 2 }], shipping: 'express', coupon: 'WELCOME10' } });
    assert.deepEqual(result.order, serverOrder);
});

test('orders saved before this change still resend with a shipping choice', async () => {
    const seen = [];
    const service = await signedIn(async (name, options) => { seen.push(options.body.order.shipping); return { data: { ok: true, recipient: 'x', order: serverOrder }, error: null }; });
    for (const shippingCost of [50, 85, 0]) await service.sendMail('order', 'buyer@example.com', { id: 'MAX-123456', shippingCost, items: [] });
    assert.deepEqual(seen, ['express', 'cold', 'pickup']);
});

test('the shop totals replace the browser totals on the saved order', async () => {
    const f = setup({ success: true, message: 'sent', order: serverOrder });
    f.instance.state.orders = [{ ...order, total: 1, subtotal: 1, discountAmount: 0, shippingCost: 50, items: [{ id: 'max_1', name: 'cheap', qty: 2, price: 1, image: 'max_1.jpg' }] }];
    await f.app.dispatchRealEmail({ id: 'E', orderId: order.id, to: order.email });
    const saved = f.instance.state.orders[0];
    assert.deepEqual([saved.total, saved.subtotal, saved.items[0].price, saved.items[0].image], [140, 90, 45, 'max_1.jpg']);
    assert.match(f.instance.store.local.maxmuxsix_orders, /"total":140/);
});

test('a placed order records the shipping choice and the coupon that was applied', () => {
    const { app, state, getElement } = createAppInstance();
    getElement('checkoutForm').reset = () => {};
    state.cart = [{ id: 'max_1', name: 'a', price: 45, qty: 4 }];
    getElement('couponCodeInput').value = 'max10';
    getElement('shippingMethodSelect').value = '85';
    app.applyCoupon();
    getElement('couponCodeInput').value = 'typed-later';
    app.confirmOrder({ preventDefault() {} });
    assert.deepEqual([state.orders[0].shippingMethod, state.orders[0].couponCode], ['cold', 'MAX10']);
});

test('an open receipt is redrawn with the shop totals', async () => {
    const f = setup({ success: true, message: 'sent', order: serverOrder });
    f.instance.state.orders = [{ ...order, total: 1, subtotal: 1, discountAmount: 0, shippingCost: 50, items: [{ id: 'max_1', name: 'cheap', qty: 2, price: 1 }] }];
    f.app.openOrderReceiptModal(order.id);
    const frame = f.instance.getElement('orderReceiptPreviewFrame');
    frame.srcdoc = 'old';
    await f.app.dispatchRealEmail({ id: 'E', orderId: order.id, to: order.email });
    assert.match(frame.srcdoc, /140/);
});
