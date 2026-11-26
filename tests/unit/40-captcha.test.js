const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createMembership } = require('../../assets/js/cloud-auth');
const { createCaptcha } = require('../../assets/js/captcha');
const { createAppInstance } = require('../helpers/app-loader');

const config = { url: 'https://test.supabase.co', publishableKey: 'sb_publishable_test', redirectUrl: 'https://shop.example/' };

function service(extra = {}) {
    const calls = [];
    const ok = name => async (...args) => { calls.push([name, ...args]); return { data: { session: null }, error: null }; };
    const client = {
        auth: {
            signUp: ok('signUp'), signInWithPassword: ok('signIn'), resetPasswordForEmail: ok('reset'),
            getSession: async () => ({ data: { session: null }, error: null })
        }
    };
    return { calls, client, service: createMembership({ config: { ...config, ...extra }, createClient: () => client }) };
}
const person = { name: 'A', email: 'a@example.com', password: 'password123', consent: true };

test('with a site key, login, signup and reset are refused without a captcha token', async () => {
    const s = service({ turnstileSiteKey: 'site' });
    await assert.rejects(s.service.login('a@example.com', 'password123'), /ไม่ใช่บอต/);
    await assert.rejects(s.service.register(person), /ไม่ใช่บอต/);
    await assert.rejects(s.service.resetPassword('a@example.com'), /ไม่ใช่บอต/);
    assert.deepEqual(s.calls, []);
});

test('the captcha token is forwarded to all three Supabase Auth calls', async () => {
    const s = service({ turnstileSiteKey: 'site' });
    await s.service.login('a@example.com', 'password123', 't1');
    await s.service.register(person, 't2');
    await s.service.resetPassword('a@example.com', 't3');
    const sent = Object.fromEntries(s.calls.map(([name, ...args]) => [name, args]));
    assert.equal(sent.signIn[0].options.captchaToken, 't1');
    assert.equal(sent.signUp[0].options.captchaToken, 't2');
    assert.equal(sent.signUp[0].options.data.name, 'A');
    assert.equal(sent.reset[1].captchaToken, 't3');
});

test('without a site key no token is required or sent', async () => {
    const s = service();
    await s.service.login('a@example.com', 'password123');
    assert.equal(s.calls[0][1].options, undefined);
});

test('a captcha rejection from the server is explained', async () => {
    const s = service({ turnstileSiteKey: 'site' });
    s.client.auth.signInWithPassword = async () => ({ data: {}, error: { code: 'captcha_failed' } });
    await assert.rejects(s.service.login('a@example.com', 'password123', 't'), /ยืนยันว่าไม่ใช่บอตไม่สำเร็จ/);
});

function fakeBrowser() {
    const scripts = [], rendered = [], resets = [];
    const window = {};
    const document = {
        createElement: () => ({}),
        head: { appendChild: s => scripts.push(s) },
        getElementById: id => ({ id })
    };
    const turnstile = {
        render: (el, options) => { rendered.push({ el, options }); return 'w' + rendered.length; },
        reset: id => resets.push(id)
    };
    return { window, document, scripts, rendered, resets, load() { window.turnstile = turnstile; scripts[0].onload(); } };
}

test('captcha stays off and loads nothing without a site key', () => {
    const b = fakeBrowser();
    const captcha = createCaptcha({ siteKey: '', window: b.window, document: b.document });
    captcha.show('login');
    assert.equal(b.scripts.length, 0);
    assert.equal(captcha.token('login'), '');
});

test('one script load, one widget per form, token read once then reset', () => {
    const b = fakeBrowser();
    const captcha = createCaptcha({ siteKey: 'site', window: b.window, document: b.document });
    captcha.show('login');
    captcha.show('register');
    assert.equal(b.scripts.length, 1);
    assert.equal(b.scripts[0].src, 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
    b.load();
    captcha.show('login');
    assert.deepEqual(b.rendered.map(r => r.el.id).sort(), ['captcha-login', 'captcha-register']);
    const login = b.rendered.find(r => r.el.id === 'captcha-login');
    login.options.callback('tok');
    assert.equal(captcha.token('login'), 'tok');
    captcha.reset('login');
    assert.equal(captcha.token('login'), '');
    assert.equal(b.resets.length, 1);
});

test('an expired or failed widget gives no token', () => {
    const b = fakeBrowser();
    const captcha = createCaptcha({ siteKey: 'site', window: b.window, document: b.document });
    captcha.show('reset');
    b.load();
    b.rendered[0].options.callback('tok');
    b.rendered[0].options['expired-callback']();
    assert.equal(captcha.token('reset'), '');
});

test('forms that have no captcha are ignored', () => {
    const b = fakeBrowser();
    const captcha = createCaptcha({ siteKey: 'site', window: b.window, document: b.document });
    captcha.show('password');
    assert.equal(b.scripts.length, 0);
});

test('page handlers pass the form token and reset it after the attempt', async () => {
    const seen = [], resets = [];
    const { app, getElement } = createAppInstance({ globals: {
        MaxmuxsixCaptcha: { createCaptcha: () => ({ show() {}, token: form => 'tok-' + form, reset: form => resets.push(form) }) },
        MaxmuxsixMembership: { createMembership: () => ({
            configured: true, start: async () => {},
            login: async (e, p, token) => { seen.push(token); throw new Error('no'); },
            register: async (input, token) => { seen.push(token); return { pendingConfirmation: true }; },
            resetPassword: async (email, token) => { seen.push(token); }
        }) }
    } });
    getElement('loginUserKey').value = 'a@example.com';
    await app.handleLogin({ preventDefault() {} });
    await app.handleRegister({ preventDefault() {} });
    await app.handlePasswordReset({ preventDefault() {} });
    assert.deepEqual(seen, ['tok-login', 'tok-register', 'tok-reset']);
    assert.deepEqual(resets, ['login', 'register', 'reset']);
});

test('the published auth config has a Turnstile site key', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'auth-config.js'), 'utf8');
    const window = {};
    new Function('window', source)(window);
    // Cloudflare's test keys start with 1x/2x/3x; real site keys start with 0x4 and are shorter than secret keys.
    assert.match(window.MAXMUXSIX_AUTH_CONFIG.turnstileSiteKey, /^0x4[A-Za-z0-9_-]{15,25}$/);
});

test('page has a captcha slot per form, loads the module and allows Turnstile in CSP', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
    for (const form of ['login', 'register', 'reset']) assert.ok(html.includes(`id="captcha-${form}"`), form);
    assert.ok(html.includes('<script src="assets/js/captcha.js"></script>'));
    assert.match(html, /script-src [^;]*https:\/\/challenges\.cloudflare\.com/);
    assert.match(html, /frame-src https:\/\/challenges\.cloudflare\.com;/);
});
