const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8').replace(/\r\n/g, '\n');

test('the GAS script offered by the copy button matches google_apps_script.js', () => {
    const literal = read('index.html').match(/const GAS_SCRIPT_CODE = (`(?:\\[\s\S]|[^`\\])*`);/);
    assert.ok(literal, 'GAS_SCRIPT_CODE template literal not found');
    assert.doesNotMatch(literal[1], /(?<!\\)\$\{/, 'unescaped interpolation would change the copied script');
    const embedded = vm.runInNewContext(literal[1]);
    const source = read('google_apps_script.js');
    assert.equal(embedded.trim(), source.slice(source.indexOf('var SECURITY_CONFIG')).trim());
});

function createLineBot(properties, lockAcquired = true) {
    const fetched = [];
    const errors = [];
    let sheetAccess = 0;
    const sandbox = {
        console: { log() {}, warn() {}, error: (...args) => errors.push(args.join(' ')) },
        ContentService: { createTextOutput: text => ({ text }) },
        PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties[key] ?? null }) },
        LockService: { getScriptLock: () => ({ tryLock: () => lockAcquired, releaseLock() {} }) },
        SpreadsheetApp: { getActiveSpreadsheet: () => { sheetAccess++; return {}; } },
        UrlFetchApp: { fetch: (url, options) => { fetched.push({ url, options }); return { getResponseCode: () => 200, getContentText: () => '{}' }; } }
    };
    vm.createContext(sandbox);
    vm.runInContext(read('line_bot_smart_apps_script.js'), sandbox);
    return { sandbox, fetched, errors, sheetAccess: () => sheetAccess };
}

test('a busy LINE webhook logs the skipped events and asks each sender to resend', () => {
    const key = 's'.repeat(32);
    const bot = createLineBot({ LINE_WEBHOOK_KEY: key, LINE_CHANNEL_ACCESS_TOKEN: 'test-token' }, false);
    const result = bot.sandbox.doPost({
        parameter: { key },
        postData: { contents: JSON.stringify({ events: [
            { type: 'message', replyToken: 'r1', source: { userId: 'U-private' }, message: { type: 'text', text: 'private text' } },
            { type: 'unfollow', source: { userId: 'U-private' } }
        ] }) }
    });
    assert.equal(result.text, 'OK');
    assert.equal(bot.sheetAccess(), 0);
    assert.equal(bot.fetched.length, 1);
    const payload = JSON.parse(bot.fetched[0].options.payload);
    assert.equal(payload.replyToken, 'r1');
    assert.match(payload.messages[0].text, /ส่งข้อความ.*อีกครั้ง/);
    assert.equal(bot.errors.length, 1);
    assert.match(bot.errors[0], /2/);
    assert.doesNotMatch(bot.errors[0], /U-private|private text|r1/);
});

test('sendLineReply logs why it cannot reply when the access token is missing', () => {
    const bot = createLineBot({});
    bot.sandbox.sendLineReply('r1', [{ type: 'text', text: 'hi' }]);
    assert.equal(bot.fetched.length, 0);
    assert.equal(bot.errors.length, 1);
    assert.match(bot.errors[0], /LINE_CHANNEL_ACCESS_TOKEN/);
});
