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
