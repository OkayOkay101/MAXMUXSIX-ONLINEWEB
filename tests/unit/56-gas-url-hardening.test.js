const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAppInstance } = require('../helpers/app-loader');

const VALID = 'https://script.google.com/macros/s/AKfycbz-valid_deployment-id/exec';
const record = () => ({ id: 'EML-1', to: '[EMAIL]', toName: 'x', subject: 's', htmlContent: '<b>x</b>' });

test('safeGasUrl accepts only https Google Apps Script deployment URLs', () => {
    const { app } = createAppInstance();
    assert.equal(app.safeGasUrl(VALID), VALID);
    assert.equal(app.safeGasUrl(`  ${VALID}  `), VALID);

    for (const bad of [
        '',
        null,
        undefined,
        42,
        'http://script.google.com/macros/s/AKfycbz/exec',
        'https://evil.example/macros/s/AKfycbz/exec',
        'https://script.google.com.evil.example/macros/s/AKfycbz/exec',
        'https://script.google.com/macros/s/AKfycbz/exec?token=leak',
        'https://script.google.com/macros/s/AKfycbz/exec/extra',
        'javascript:alert(1)',
        'https://script.google.com/macros/s//exec'
    ]) {
        assert.equal(app.safeGasUrl(bad), '', String(bad));
    }
});

test('autoSaveGasUrl never persists a non-GAS URL', () => {
    const { app, state, store } = createAppInstance();
    app.autoSaveGasUrl('http://evil.example/collect');
    assert.equal(state.emailSettings.gasUrl, '');
    assert.equal(JSON.parse(store.local.maxmuxsix_email_settings).gasUrl, '');

    app.autoSaveGasUrl(VALID);
    assert.equal(state.emailSettings.gasUrl, VALID);
    assert.equal(JSON.parse(store.local.maxmuxsix_email_settings).gasUrl, VALID);
});

test('invalid partial input does not destroy the last valid gasUrl', () => {
    const { app, state, store } = createAppInstance();
    app.autoSaveGasUrl(VALID);
    app.autoSaveGasUrl('https://script.google.com/macros/s/part');
    assert.equal(state.emailSettings.gasUrl, '');
    assert.equal(JSON.parse(store.local.maxmuxsix_email_settings).gasUrl, VALID);
});

test('a tampered gasUrl cannot receive the relay token', async () => {
    let fetched = 0;
    const { app, state } = createAppInstance({ globals: { fetch: async () => { fetched++; return { json: async () => ({ status: 'success' }) }; } } });
    state.emailSettings = { provider: 'gas', gasUrl: 'http://evil.example/collect', gasToken: 's'.repeat(40) };

    const result = await app.dispatchRealEmail(record());
    assert.equal(fetched, 0);
    assert.equal(result.success, false);
    assert.match(result.message, /ไม่ถูกต้อง/);
});

test('a valid gasUrl still delivers with the configured token', async () => {
    const calls = [];
    const { app, state } = createAppInstance({ globals: { fetch: async (url, opts) => { calls.push({ url, opts }); return { json: async () => ({ status: 'success' }) }; } } });
    state.emailSettings = { provider: 'gas', gasUrl: VALID, gasToken: 's'.repeat(40) };

    const result = await app.dispatchRealEmail(record());
    assert.equal(result.success, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, VALID);
    assert.equal(JSON.parse(calls[0].opts.body).token, 's'.repeat(40));
});

test('a stale non-GAS gasUrl is scrubbed from localStorage on load', () => {
    const { state, store } = createAppInstance({
        localStorage: {
            maxmuxsix_email_settings: JSON.stringify({
                provider: 'gas',
                gasUrl: 'http://evil.example/collect',
                websiteUrl: 'https://maxmuxsix-demo.vercel.app/'
            })
        }
    });
    assert.equal(state.emailSettings.gasUrl, '');
    assert.equal(JSON.parse(store.local.maxmuxsix_email_settings).gasUrl, '');
});