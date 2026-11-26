const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const NOTICE = 'เว็บตัวอย่าง ไม่มีการขายหรือจัดส่งจริง ห้ามโอนเงิน';

test('a demo banner without a close control is the first thing on the page', () => {
    const banner = html.match(/<body>\s*(?:<!--[\s\S]*?-->\s*)*<div id="demoBanner"[^>]*>([\s\S]*?)<\/div>/);
    assert.ok(banner, 'demoBanner must be the first element in body');
    assert.ok(banner[1].includes(NOTICE));
    assert.doesNotMatch(banner[0], /<button|onclick/);
});

test('the payment dialog warns before the QR picture', () => {
    const start = html.indexOf('id="paymentModal"');
    const qr = html.indexOf('class="qr-section"', start);
    assert.ok(start > 0 && qr > start);
    const beforeQr = html.slice(start, qr);
    assert.match(beforeQr, /class="demo-notice"/);
    assert.ok(beforeQr.includes(NOTICE));
});

const order = { items: [{ id: 'max_1', name: 'ทดสอบ', qty: 1, price: 45 }], subtotal: 45, shippingCost: 50, discountAmount: 0, total: 95 };

test('both shop mails carry the demo notice', async () => {
    const { receiptHtml, welcomeHtml } = await import('../../supabase/functions/order-email/templates.mjs');
    const siteUrl = 'https://example.test/';
    const view = { siteUrl, orderId: 'MAX-123456', dateText: 'วันนี้', customer: { name: 'ผู้ทดสอบ', email: 'a@example.test' }, order };
    for (const mail of [receiptHtml(view, { images: true }), receiptHtml(view, { images: false }), welcomeHtml({ siteUrl, name: 'ผู้ทดสอบ', referralCode: 'MAXTEST' })])
        assert.ok(mail.includes(NOTICE));
});

test('the plain text copy of both mails carries the demo notice', async () => {
    const { createOrderMailHandler } = await import('../../supabase/functions/order-email/handler.mjs');
    const sent = [];
    const handler = createOrderMailHandler({
        siteUrl: 'https://example.test/',
        backend: {
            getUser: async () => ({ id: 'u1', email: 'a@example.test', email_confirmed_at: 'now' }),
            getProfile: async () => ({ name: 'ผู้ทดสอบ', referral_code: 'MAXTEST', consent_at: 'now' }),
            claimSend: async () => true,
            createOrder: async () => ({ id: 'MAX-123456', ...order })
        },
        sendMail: async message => sent.push(message)
    });
    for (const body of [{ kind: 'welcome' }, { kind: 'order', order: { id: 'MAX-123456', items: [{ id: 'max_1', qty: 1 }], shipping: 'express', coupon: '' } }]) {
        const response = await handler(new Request('https://fn.example.test/order-email', {
            method: 'POST', headers: { Origin: 'https://example.test', Authorization: 'Bearer valid' }, body: JSON.stringify(body)
        }));
        assert.equal(response.status, 200);
    }
    assert.equal(sent.length, 2);
    for (const message of sent) assert.ok(message.body.includes(NOTICE));
});

test('the browser mail templates and the standalone copies carry the demo notice', () => {
    for (const id of ['welcomeEmailTemplate', 'orderReceiptTemplate']) {
        const block = html.match(new RegExp(`<template id="${id}">([\\s\\S]*?)</template>`));
        assert.ok(block && block[1].includes(NOTICE), id);
    }
    for (const file of ['subscribe_welcome_email.html', 'order_summary_email.html'])
        assert.ok(fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8').includes(NOTICE), file);
});

test('the browser plain text mail paths add the demo notice', () => {
    assert.match(html, /const txtContent = DEMO_NOTICE \+/);
    assert.match(html, /formData\.append\('message', DEMO_NOTICE \+ '\\n\\n' \+ msgText\);/);
    assert.ok(html.includes(`const DEMO_NOTICE = '${NOTICE}';`));
});
