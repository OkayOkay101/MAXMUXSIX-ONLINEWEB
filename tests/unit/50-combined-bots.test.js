const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8').replace(/\r\n/g, '\n');
const KEY = 'k'.repeat(32);

function load(file) {
    const writes = [];
    const sheet = { getRange: () => ({ setValue: value => writes.push(value) }) };
    const sandbox = {
        console: { log() {}, warn() {}, error() {} },
        PropertiesService: { getScriptProperties: () => ({ getProperty: name => (name === 'LINE_WEBHOOK_KEY' ? KEY : null) }) },
        Utilities: { formatDate: () => 'now' }
    };
    vm.createContext(sandbox);
    vm.runInContext(read(file), sandbox);
    return { sandbox, writes, ss: { getSheetByName: () => sheet } };
}

for (const file of ['line_bot_apps_script.js', 'line_bot_smart_apps_script.js']) {
    test(file + ': webhook key is compared in constant time and only the exact key passes', () => {
        const { sandbox } = load(file);
        assert.equal(sandbox.isTrustedWebhook({ parameter: { key: KEY } }), true);
        for (const bad of [KEY.slice(1), KEY + 'k', 'x'.repeat(32), '', undefined, [KEY]])
            assert.equal(sandbox.isTrustedWebhook({ parameter: { key: bad } }), false);
        assert.match(sandbox.isTrustedWebhook.toString(), /constantTimeEqual\(/);
    });

    test(file + ': broadcast status cannot become a sheet formula', () => {
        const bot = load(file);
        bot.sandbox.updateBroadcastStatus(bot.ss, '=CMD', 'detail');
        assert.equal(bot.writes[0].startsWith("'=CMD"), true);
    });
}

test('the kept smart bot carries demo text instead of payment account numbers', () => {
    const source = read('line_bot_smart_apps_script.js');
    const config = source.match(/const SHOP_CONFIG = \{[\s\S]*?\n\};/)[0];
    for (const key of ['promptPay', 'bankAccount']) {
        const value = config.match(new RegExp(key + ': "([^"]*)"'))[1];
        assert.match(value, /เว็บตัวอย่าง/);
        assert.doesNotMatch(value, /\d/);
    }
});

test('each bot file says that only one of them may be installed', () => {
    for (const file of ['line_bot_apps_script.js', 'line_bot_smart_apps_script.js'])
        assert.match(read(file), /เลือกติดตั้งเพียงไฟล์เดียว/);
});

test('smart bot logs a rejected LINE reply and a failed chat history write', () => {
    const errors = [];
    const sandbox = {
        console: { log() {}, warn() {}, error: (...args) => errors.push(args.join(' ')) },
        PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'test-token' }) },
        UrlFetchApp: { fetch: () => ({ getResponseCode: () => 401, getContentText: () => 'invalid token' }) }
    };
    vm.createContext(sandbox);
    vm.runInContext(read('line_bot_smart_apps_script.js'), sandbox);
    sandbox.sendLineReply('r1', []);
    sandbox.logChat({ getSheetByName: () => null }, 'U1', 'text', 'reply');
    assert.equal(errors.length, 2);
    assert.match(errors[0], /LINE reply failed: 401/);
    assert.match(errors[1], /Chat_History write failed/);
});
