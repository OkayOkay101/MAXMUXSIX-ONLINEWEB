const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createGasInstance, TEST_RELAY_TOKEN } = require('../helpers/gas-loader');

const read = file => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

// 1. google_apps_script.js hardening
test('legacy GAS order relay rejects query-string tokens and requires POST body token', () => {
    const env = createGasInstance();
    const res = env.gas.doPost({
        parameter: { token: TEST_RELAY_TOKEN, to: 'buyer@example.com', subject: 'hi' }
    }).getJson();
    assert.equal(res.success, false);
    assert.equal(env.sentEmails.length, 0);
});

test('legacy GAS order relay rejects multi-recipient and header-injected addresses', () => {
    for (const badTo of [
        'a@example.com,b@example.com',
        'a@example.com;b@example.com',
        'Buyer <a@example.com>',
        'a@example.com\r\nBcc: evil@example.com',
        'a@example.com\nb@example.com'
    ]) {
        const env = createGasInstance();
        const res = env.gas.doPost({
            postData: { contents: JSON.stringify({ token: TEST_RELAY_TOKEN, to: badTo, subject: 'ok' }) }
        }).getJson();
        assert.equal(res.success, false, badTo);
        assert.equal(env.sentEmails.length, 0, badTo);
    }
});

test('legacy GAS order relay ignores caller fromName, strips CRLF from subject, hides quota in doGet and hides raw exceptions', () => {
    const env = createGasInstance();
    const res = env.gas.doPost({
        postData: {
            contents: JSON.stringify({
                token: TEST_RELAY_TOKEN,
                to: 'buyer@example.com',
                subject: 'Order\r\nBcc: evil@example.com',
                fromName: 'Spoofed Bank'
            })
        }
    }).getJson();
    assert.equal(res.success, true);
    assert.equal(env.sentEmails[0].name, 'MAXMUXSIX ข้าวหลามเตาถ่าน');
    assert.ok(!/[\r\n]/.test(env.sentEmails[0].subject));

    const health = env.gas.doGet().getJson();
    assert.equal(health.status, 'online');
    assert.equal(Object.hasOwn(health, 'remainingDailyQuota'), false);

    env.gas.MailApp.sendEmail = () => { throw new Error('INTERNAL_SECRET_DIAGNOSTIC'); };
    const failed = env.gas.doPost({
        postData: { contents: JSON.stringify({ token: TEST_RELAY_TOKEN, to: 'buyer@example.com', subject: 'ok' }) }
    }).getJson();
    assert.equal(failed.success, false);
    assert.equal(failed.message.includes('INTERNAL_SECRET_DIAGNOSTIC'), false);
});

test('legacy GAS order relay does not send or release lock when lock acquisition fails', () => {
    const env = createGasInstance();
    let releases = 0;
    env.setLockAcquired(false);
    env.gas.LockService.getScriptLock = () => ({
        tryLock: () => false,
        releaseLock: () => { releases++; }
    });
    const res = env.gas.doPost({
        postData: { contents: JSON.stringify({ token: TEST_RELAY_TOKEN, to: 'buyer@example.com', subject: 'ok' }) }
    }).getJson();
    assert.equal(res.success, false);
    assert.equal(env.sentEmails.length, 0);
    assert.equal(releases, 0);
});

// 2. line_bot_apps_script.js hardening
function createLineBot(properties = {}, lockAcquired = true) {
    const fetched = [];
    const updates = [];
    let lockAttempts = 0;
    let lockReleases = 0;
    const sheet = name => ({
        appendRow: () => {},
        getDataRange: () => ({ getValues: () => [['id', 'step', 'json', 'now'], ['U1', 'OLD', '{}', 'now']] }),
        getRange: (...args) => ({
            setValues: vals => updates.push({ name, args, vals }),
            setValue: val => updates.push({ name, args, val })
        })
    });
    const sandbox = {
        console: { log() {}, error() {}, warn() {} },
        ContentService: { createTextOutput: text => ({ text }) },
        PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties[key] ?? null }) },
        LockService: { getScriptLock: () => ({
            tryLock: () => { lockAttempts++; return lockAcquired; },
            releaseLock: () => { lockReleases++; }
        }) },
        SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: sheet }) },
        Utilities: { formatDate: () => 'now' },
        UrlFetchApp: { fetch: (url, opts) => { fetched.push({ url, opts }); return { getResponseCode: () => 200, getContentText: () => '{}' }; } }
    };
    vm.createContext(sandbox);
    vm.runInContext(read('line_bot_smart_apps_script.js'), sandbox);
    return { sandbox, fetched, updates, ss: { getSheetByName: sheet }, lockStats: () => ({ lockAttempts, lockReleases }) };
}

test('LINE bot reads LINE_CHANNEL_ACCESS_TOKEN from Script Properties instead of source constants', () => {
    const source = read('line_bot_smart_apps_script.js');
    assert.doesNotMatch(source, /const\s+CHANNEL_ACCESS_TOKEN\s*=/);
    const missing = createLineBot({});
    assert.equal(missing.sandbox.executeLineBroadcast([{ type: 'text', text: 'hi' }]).success, false);
    assert.equal(missing.fetched.length, 0);

    const configured = createLineBot({ LINE_CHANNEL_ACCESS_TOKEN: 'prop-line-token' });
    assert.equal(configured.sandbox.executeLineBroadcast([{ type: 'text', text: 'hi' }]).success, true);
    assert.equal(configured.fetched[0].opts.headers.Authorization, 'Bearer prop-line-token');
});

test('LINE bot sanitizes setUserState update and updateBroadcastStatus against formula injection and locks doPost', () => {
    const key = 's'.repeat(32);
    const bot = createLineBot({ LINE_WEBHOOK_KEY: key });
    bot.sandbox.setUserState(bot.ss, 'U1', '=HYPERLINK("x")', { a: 1 });
    assert.equal(bot.updates[0].vals[0][0], '\'=HYPERLINK("x")');

    bot.sandbox.updateBroadcastStatus(bot.ss, '=CMD', 'detail');
    assert.equal(bot.updates[1].val.startsWith("'=CMD"), true);

    bot.sandbox.doPost({
        parameter: { key },
        postData: { contents: JSON.stringify({ events: [{ type: 'unfollow', source: { userId: 'U1' } }] }) }
    });
    assert.deepEqual(bot.lockStats(), { lockAttempts: 1, lockReleases: 1 });

    const busy = createLineBot({ LINE_WEBHOOK_KEY: key }, false);
    busy.sandbox.doPost({
        parameter: { key },
        postData: { contents: JSON.stringify({ events: [{ type: 'unfollow', source: { userId: 'U1' } }] }) }
    });
    assert.deepEqual(busy.lockStats(), { lockAttempts: 1, lockReleases: 0 });
});

// 3. Edge Function bounded streaming body checks (without Content-Length)
test('order-email and admin-users reject oversized chunked streams without draining them', async () => {
    const { createOrderMailHandler } = await import('../../supabase/functions/order-email/handler.mjs');
    const { createHandler } = await import('../../supabase/functions/admin-users/handler.mjs');
    const ADMIN = '11111111-1111-4111-8111-111111111111';

    let orderChunks = 0;
    let orderCanceled = false;
    const orderStream = new ReadableStream({
        pull(controller) {
            orderChunks++;
            controller.enqueue(new TextEncoder().encode('x'.repeat(4096)));
            if (orderChunks >= 10) controller.close();
        },
        cancel() { orderCanceled = true; }
    });
    const orderHandler = createOrderMailHandler({
        backend: {
            getUser: async () => ({ id: ADMIN, email: 'm@example.com', email_confirmed_at: 'now' }),
            getProfile: async () => ({ name: 'M', referral_code: 'MAX1', consent_at: 'now' }),
            claimSend: async () => { throw new Error('must not claim quota'); }
        },
        sendMail: async () => { throw new Error('must not send'); },
        siteUrl: 'https://shop.example/'
    });
    const orderRes = await orderHandler(new Request('https://p.supabase.co/functions/v1/order-email', {
        method: 'POST',
        headers: { Origin: 'https://shop.example', Authorization: 'Bearer valid' },
        body: orderStream,
        duplex: 'half'
    }));
    assert.equal(orderRes.status, 400);
    assert.equal(orderCanceled, true);
    assert.ok(orderChunks < 10);

    let adminChunks = 0;
    let adminCanceled = false;
    const adminStream = new ReadableStream({
        pull(controller) {
            adminChunks++;
            controller.enqueue(new TextEncoder().encode('x'.repeat(2048)));
            if (adminChunks >= 10) controller.close();
        },
        cancel() { adminCanceled = true; }
    });
    const adminHandler = createHandler({
        backend: {
            getUser: async () => ({ id: ADMIN, email_confirmed_at: 'now' }),
            adminIds: async () => [ADMIN],
            getProfiles: async () => [{ id: ADMIN, consent_at: 'now' }]
        },
        siteUrl: 'https://shop.example/'
    });
    const adminRes = await adminHandler(new Request('https://p.supabase.co/functions/v1/admin-users', {
        method: 'POST',
        headers: { Origin: 'https://shop.example', Authorization: 'Bearer valid' },
        body: adminStream,
        duplex: 'half'
    }));
    assert.equal(adminRes.status, 400);
    assert.equal(adminCanceled, true);
    assert.ok(adminChunks < 10);
});

// 4. supabase/config.toml parity
test('supabase/config.toml configures verify_jwt = false for order-email', () => {
    const toml = read('supabase/config.toml');
    assert.match(toml, /\[functions\.order-email\]\s+verify_jwt\s*=\s*false/);
});
