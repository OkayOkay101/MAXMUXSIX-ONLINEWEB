const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'line_bot_smart_apps_script.js'), 'utf8');
const STEP1 = 'ORDER_STEP_1_SELECT_PRODUCT';
const STEP2 = 'ORDER_STEP_2_QUANTITY';
const STEP3 = 'ORDER_STEP_3_CONTACT_INFO';
const MINUTE = 60 * 1000;

function createBot({ step = null, data = {}, updatedAt = new Date(), faq = [] } = {}) {
    const replies = [];
    const rows = {
        Chat_History: [], Orders: [], FAQ: faq,
        User_State: step ? [['U1', step, JSON.stringify(data), updatedAt]] : []
    };
    const sheet = name => ({
        appendRow: row => rows[name].push(row),
        getDataRange: () => ({ getValues: () => [['header'], ...rows[name] || []] }),
        getRange: () => ({ setValues: ([values]) => { rows.User_State[0].splice(1, 3, ...values); } }),
        deleteRow: index => { rows[name].splice(index - 2, 1); }
    });
    const sandbox = {
        console: { log() {}, warn() {}, error() {} },
        PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'test-token' }) },
        UrlFetchApp: { fetch: (url, options) => {
            replies.push(...JSON.parse(options.payload).messages);
            return { getResponseCode: () => 200, getContentText: () => '{}' };
        } }
    };
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox);
    return {
        rows, replies,
        say: text => sandbox.handleUserMessage({ getSheetByName: sheet }, 'r1', 'U1', text),
        step: () => rows.User_State[0] ? rows.User_State[0][1] : null,
        data: () => JSON.parse(rows.User_State[0][2]),
        updatedAt: () => rows.User_State[0][3],
        buttons: () => replies[replies.length - 1].quickReply.items.map(i => i.action.text || i.action.type)
    };
}

for (const text of ['ชุดคลาสสิก (3 กระบอก)', 'ชุดครอบครัว (5 กระบอก)', 'ชุดจุใจ (10 กระบอก)', 'คลาสสิก', 'ชุดครอบครัว', 'จุใจ(10 กระบอก)']) {
    test(`step 1 accepts the set name "${text}"`, () => {
        const bot = createBot({ step: STEP1 });
        bot.say(text);
        assert.equal(bot.step(), STEP2);
        assert.equal(bot.data().product, text);
    });
}

for (const text of ['ชุดครอบครัวราคาเท่าไหร่', 'เอาอันนั้น', '3', 'พิกัด: ถนนทดสอบ']) {
    test(`step 1 does not take "${text}" as a product`, () => {
        const bot = createBot({ step: STEP1 });
        bot.say(text);
        assert.equal(bot.step(), STEP1);
        assert.deepEqual(bot.data(), {});
        assert.ok(bot.buttons().includes('ชุดคลาสสิก (3 กระบอก)'));
    });
}

for (const text of ['1', '99', '2 ชุด', '10ชุด']) {
    test(`step 2 accepts the quantity "${text}"`, () => {
        const bot = createBot({ step: STEP2 });
        bot.say(text);
        assert.equal(bot.step(), STEP3);
        assert.equal(bot.data().quantity, text);
    });
}

for (const text of ['0', '100', 'สองชุด', 'ส่ง 5 ชุดฟรีไหม']) {
    test(`step 2 does not take "${text}" as a quantity`, () => {
        const bot = createBot({ step: STEP2 });
        bot.say(text);
        assert.equal(bot.step(), STEP2);
        assert.ok(bot.buttons().includes('1 ชุด'));
    });
}

for (const text of [
    'ผู้รับทดสอบ 0800000000 บ้านร้านคนส่ง ถนนทดสอบ', 'ทดสอบ 080-000-0000', 'ทดสอบ 038 000 000',
    'พิกัด: 13.0, 100.9', 'รับเองที่หน้าร้าน'
]) {
    test(`step 3 saves the order for "${text}"`, () => {
        const bot = createBot({ step: STEP3, data: { product: 'จุใจ', quantity: '1' } });
        bot.say(text);
        assert.equal(bot.rows.Orders.length, 1);
        assert.equal(bot.rows.Orders[0][4], text);
        assert.equal(bot.step(), null);
    });
}

for (const text of ['ค่าส่งเท่าไหร่', 'บ้านเลขที่ 99 ถนนทดสอบ', 'ทดสอบ 12345678', 'เลขพัสดุ 1234567890123']) {
    test(`step 3 does not save an order for "${text}"`, () => {
        const bot = createBot({ step: STEP3 });
        bot.say(text);
        assert.equal(bot.rows.Orders.length, 0);
        assert.equal(bot.step(), STEP3);
        assert.ok(bot.buttons().includes('รับเองที่หน้าร้าน'));
    });
}

test('a known question mid-order is answered, then the same step is asked again', () => {
    const before = new Date(Date.now() - 10 * MINUTE);
    const bot = createBot({ step: STEP2, data: { product: 'จุใจ' }, updatedAt: before });
    bot.say('ค่าส่งเท่าไหร่');
    assert.equal(bot.replies.length, 2);
    assert.match(bot.replies[0].text, /ข้อมูลการจัดส่ง/);
    assert.match(bot.replies[1].text, /จำนวน/);
    assert.equal(bot.step(), STEP2);
    assert.deepEqual(bot.data(), { product: 'จุใจ' });
    assert.equal(bot.updatedAt(), before, 'only a valid answer refreshes the timer');
    assert.equal(bot.rows.Chat_History.length, 1);
});

test('a sheet FAQ question mid-order is answered and the step is kept', () => {
    const bot = createBot({ step: STEP3, faq: [['อายุสินค้า', 'คำตอบทดสอบ']] });
    bot.say('อายุสินค้า');
    // "สินค้า" also matches the menu intent, which wins as it does outside the flow.
    assert.equal(bot.replies.length, 2);
    assert.equal(bot.step(), STEP3);
    const other = createBot({ step: STEP3, faq: [['เก็บได้กี่วัน', 'คำตอบทดสอบ']] });
    other.say('เก็บได้กี่วัน');
    assert.equal(other.replies[0].text, 'คำตอบทดสอบ');
    assert.equal(other.step(), STEP3);
});

test('an unknown message mid-order gets only the step prompt', () => {
    const bot = createBot({ step: STEP1 });
    bot.say('อืมมม');
    assert.equal(bot.replies.length, 1);
    assert.match(bot.replies[0].text, /ชุดสินค้า/);
});

test('asking to order again mid-order restarts at step 1', () => {
    const bot = createBot({ step: STEP3, data: { product: 'จุใจ', quantity: '1' } });
    bot.say('สั่งซื้อ');
    assert.equal(bot.step(), STEP1);
    assert.deepEqual(bot.data(), {});
    assert.equal(bot.replies.length, 1);
});

test('the cancel word still leaves the flow', () => {
    const bot = createBot({ step: STEP2 });
    bot.say('ยกเลิก');
    assert.equal(bot.step(), null);
});

for (const [name, updatedAt] of [
    ['older than 30 minutes', new Date(Date.now() - 31 * MINUTE)],
    ['without a readable time', 'not a date'],
    ['with an empty time', '']
]) {
    test(`a state ${name} is dropped and the message is handled normally`, () => {
        const bot = createBot({ step: STEP3, updatedAt });
        bot.say('ทดสอบ 0800000000');
        assert.equal(bot.rows.Orders.length, 0);
        assert.equal(bot.step(), null);
        assert.equal(bot.replies.length, 1);
        assert.match(bot.rows.Chat_History[0][3], /FALLBACK/);
    });
}

test('a state 29 minutes old is still active and a valid answer refreshes it', () => {
    const before = new Date(Date.now() - 29 * MINUTE);
    const bot = createBot({ step: STEP1, updatedAt: before });
    bot.say('คลาสสิก');
    assert.equal(bot.step(), STEP2);
    assert.ok(new Date(bot.updatedAt()).getTime() > before.getTime());
});
