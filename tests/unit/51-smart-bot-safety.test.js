const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'line_bot_smart_apps_script.js'), 'utf8');
const DEMO = 'เว็บตัวอย่าง';

function createBot({ fetchThrows = false, failSheet = null, state = null } = {}) {
    const errors = [];
    const replies = [];
    const rows = { Chat_History: [], Orders: [], User_State: state ? [['U1', state, '{}', 'now']] : [] };
    const sheet = name => ({
        appendRow: row => {
            if (name === failSheet) throw new Error('sheet down');
            rows[name].push(row);
        },
        getDataRange: () => ({ getValues: () => [['header'], ...rows[name] || []] }),
        getRange: () => ({ setValues: ([values]) => { rows.User_State[0].splice(1, 3, ...values); }, setValue() {} }),
        deleteRow: index => { rows[name].splice(index - 2, 1); }
    });
    const sandbox = {
        console: { log() {}, warn() {}, error: (...args) => errors.push(args.join(' ')) },
        PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'test-token' }) },
        UrlFetchApp: { fetch: (url, options) => {
            if (fetchThrows) throw new Error('network down');
            replies.push(...JSON.parse(options.payload).messages);
            return { getResponseCode: () => 200, getContentText: () => '{}' };
        } }
    };
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox);
    const ss = { getSheetByName: sheet };
    const say = text => sandbox.handleUserMessage(ss, 'r1', 'U1', text);
    return { sandbox, rows, errors, replies, say, replyText: () => replies.map(m => m.text).join('\n') };
}

test('a failed LINE reply still records the message and the order step', () => {
    const bot = createBot({ fetchThrows: true });
    bot.say('สั่งซื้อ');
    assert.equal(bot.rows.Chat_History.length, 1);
    assert.equal(bot.rows.User_State[0][1], 'ORDER_STEP_1_SELECT_PRODUCT');
    assert.match(bot.errors.join('\n'), /LINE reply failed/);
});

test('an order that could not be saved is not reported as saved', () => {
    const bot = createBot({ failSheet: 'Orders', state: 'ORDER_STEP_3_CONTACT_INFO' });
    bot.say('ข้อมูลทดสอบ');
    assert.doesNotMatch(bot.replyText(), /บันทึกคำสั่งซื้อเรียบร้อย/);
    assert.match(bot.replyText(), /บันทึกคำสั่งซื้อไม่สำเร็จ/);
    assert.equal(bot.rows.User_State.length, 1, 'the member can retry the last step');
    assert.match(bot.errors.join('\n'), /Orders write failed/);
});

test('every message typed during the order steps is kept in chat history', () => {
    for (const step of ['ORDER_STEP_1_SELECT_PRODUCT', 'ORDER_STEP_2_QUANTITY', 'ORDER_STEP_3_CONTACT_INFO']) {
        const bot = createBot({ state: step });
        bot.say('ข้อความทดสอบ');
        assert.equal(bot.rows.Chat_History.length, 1, step);
        assert.equal(bot.rows.Chat_History[0][2], 'ข้อความทดสอบ');
    }
});

test('the smart bot never asks for money or real details, and promises nothing it cannot do', () => {
    const payment = createBot();
    payment.say('เลขบัญชี');
    assert.doesNotMatch(payment.replyText(), /ส่งรูปสลิป/);

    const admin = createBot();
    admin.say('ติดต่อแอดมิน');
    assert.doesNotMatch(admin.replyText(), /แจ้งเตือนแอดมินให้แล้ว/);

    const contact = createBot({ state: 'ORDER_STEP_2_QUANTITY' });
    contact.say('1 ชุด');
    assert.match(contact.replyText(), /ข้อมูลสมมติ/);

    const done = createBot({ state: 'ORDER_STEP_3_CONTACT_INFO' });
    done.say('ข้อมูลทดสอบ');
    assert.ok(done.replyText().includes(DEMO));
    assert.doesNotMatch(done.replyText(), /เลขพัสดุ|บัญชีโอนเงิน/);
    assert.doesNotMatch(String(done.rows.Orders[0][5]), /สลิป/);
});

test('a broadcast gets quick reply buttons only when the sheet lists them', () => {
    const messages = createBot().sandbox.buildBroadcastMessages({ text: 'ข่าว', imageUrl: '', quickReplyItems: [] });
    assert.equal(messages[messages.length - 1].quickReply, undefined);
});

test('quick reply labels fit the 20 character limit', () => {
    const labels = [...source.matchAll(/label: "([^"]*)"/g)].map(m => m[1]);
    assert.ok(labels.length > 10);
    assert.deepEqual(labels.filter(label => label.length > 20), []);
});
