const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createAppInstance } = require('../helpers/app-loader');

const record = () => ({ id: 'EML-1', to: 'buyer@example.com', toName: 'x', subject: 's', htmlContent: '<b>x</b>' });

function adminSend(fetchImpl) {
    const instance = createAppInstance({ globals: { fetch: fetchImpl } });
    instance.state.emailSettings = { provider: 'gas', gasUrl: 'https://script.google.com/macros/s/x/exec', gasToken: 't' };
    return instance.app.dispatchRealEmail(record());
}

test('a network error from the relay is reported as unconfirmed, not as sent', async () => {
    const result = await adminSend(async () => { throw new TypeError('Failed to fetch'); });
    assert.equal(result.success, false);
    assert.match(result.message, /ยืนยันผลการส่งไม่ได้/);
});

test('a non-JSON relay reply is reported as unconfirmed, not as sent', async () => {
    const result = await adminSend(async () => ({ json: async () => { throw new SyntaxError('Unexpected token <'); } }));
    assert.equal(result.success, false);
    assert.match(result.message, /ยืนยันผลการส่งไม่ได้/);
});

test('a confirmed relay reply is still reported as sent', async () => {
    const result = await adminSend(async () => ({ json: async () => ({ status: 'success' }) }));
    assert.equal(result.success, true);
});

test('the page has no simulated mail sender that claims delivery', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
    assert.ok(!html.includes('sendRealEmailAction'));
    assert.ok(!html.includes('จำลองการยิงผ่าน API Mail Service'));
});
