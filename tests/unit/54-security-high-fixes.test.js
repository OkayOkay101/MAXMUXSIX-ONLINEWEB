const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createAppInstance } = require('../helpers/app-loader');

const read = file => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

test('legacy gasToken and web3formsKey in localStorage are scrubbed on load and never persisted', () => {
    const app = createAppInstance({
        localStorage: {
            maxmuxsix_email_settings: JSON.stringify({
                provider: 'gas',
                gasUrl: 'https://script.google.com/macros/s/test/exec',
                gasToken: 'legacy-gas-secret',
                web3formsKey: 'legacy-web3forms-key',
                websiteUrl: 'https://maxmuxsix-demo.vercel.app/'
            })
        }
    });

    const storedOnLoad = JSON.parse(app.store.local.maxmuxsix_email_settings);
    assert.equal(Object.hasOwn(storedOnLoad, 'gasToken'), false);
    assert.equal(Object.hasOwn(storedOnLoad, 'web3formsKey'), false);
    assert.equal(app.state.emailSettings.gasToken, '');
    assert.equal(app.state.emailSettings.web3formsKey, '');

    app.state.emailSettings.gasToken = 'new-session-gas-token';
    app.app.autoSaveWeb3FormsKey('new-session-web3forms-key');
    app.app.autoSaveGasUrl('https://script.google.com/macros/s/updated/exec');

    const storedAfterSave = JSON.parse(app.store.local.maxmuxsix_email_settings);
    assert.equal(Object.hasOwn(storedAfterSave, 'gasToken'), false);
    assert.equal(Object.hasOwn(storedAfterSave, 'web3formsKey'), false);
    assert.equal(storedAfterSave.gasUrl, 'https://script.google.com/macros/s/updated/exec');
    assert.equal(app.state.emailSettings.gasToken, 'new-session-gas-token');
    assert.equal(app.state.emailSettings.web3formsKey, 'new-session-web3forms-key');

    app.app.clearSavedEmailSecrets();
    assert.equal(app.state.emailSettings.gasToken, '');
    assert.equal(app.state.emailSettings.web3formsKey, '');
});

test('index.html never writes gasToken or web3formsKey to localStorage', () => {
    const html = read('index.html');
    assert.doesNotMatch(html, /localStorage\.setItem\(['"]maxmuxsix_email_settings['"],\s*JSON\.stringify\(emailSettings\)\)/);
    assert.match(html, /function persistEmailSettings\(\)/);
});

test('send-auth-email allows 4500 ms deadline under 5 s hook ceiling and rejects > 4500 ms', async () => {
    const { createAuthEmailHandler } = await import('../../supabase/functions/send-auth-email/relay.mjs');
    const baseConfig = {
        projectUrl: 'https://lxvxffrexegvqzeojztw.supabase.co',
        siteUrl: 'https://maxmuxsix-demo.vercel.app/',
        gasUrl: 'https://script.google.com/macros/s/fixture_deployment/exec',
        relaySecret: 'fixture-secret'
    };

    const okHandler = createAuthEmailHandler({
        verify: () => { throw new Error('stop after config check'); },
        config: { ...baseConfig, upstreamTimeoutMs: 4500 }
    });
    const okRes = await okHandler(new Request('https://fixture.test/hook', {
        method: 'POST',
        body: '{}',
        headers: { 'webhook-id': 'msg_1', 'webhook-timestamp': '1700000000', 'webhook-signature': 'v1,abc' }
    }));
    assert.equal(okRes.status, 401);

    const overHandler = createAuthEmailHandler({
        verify: () => ({}),
        config: { ...baseConfig, upstreamTimeoutMs: 4501 }
    });
    const overRes = await overHandler(new Request('https://fixture.test/hook', {
        method: 'POST',
        body: '{}',
        headers: { 'webhook-id': 'msg_1', 'webhook-timestamp': '1700000000', 'webhook-signature': 'v1,abc' }
    }));
    assert.equal(overRes.status, 500);

    assert.match(read('supabase/functions/send-auth-email/index.ts'), /upstreamTimeoutMs:\s*4500/);
});
