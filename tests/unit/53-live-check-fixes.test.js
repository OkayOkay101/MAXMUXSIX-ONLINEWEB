const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

const rules = css => [...css.matchAll(/\.cart-quick-toast\s*\{([^}]*)\}/g)].map(m => m[1]);

test('cart toast sizes to its text, not to the half screen left of left:50%', () => {
    const [base] = rules(html);
    assert.match(base, /(^|;|\s)width:\s*max-content;/);
    assert.match(base, /max-width:\s*90vw;/);
    assert.match(base, /box-sizing:\s*border-box;/);
});

test('on phones the cart toast sits above the floating cart button', () => {
    const [, phone] = rules(html);
    // ปุ่มตะกร้าลอย: bottom 78px + สูงราว 53px
    assert.ok(Number(phone.match(/bottom:\s*(\d+)px/)[1]) >= 140);
});

test('the meta tags carry no directive that browsers ignore and log as errors', () => {
    const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/)[1];
    assert.doesNotMatch(csp, /frame-ancestors/);
    assert.doesNotMatch(html, /<meta[^>]*http-equiv="X-Frame-Options"/i);
    assert.match(html.split('</head>')[0], /<script src="assets\/js\/frame-guard\.js"><\/script>/);
});
