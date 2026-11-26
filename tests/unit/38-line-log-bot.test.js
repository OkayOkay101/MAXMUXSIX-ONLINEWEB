const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Owner decision 2026-11-26: record every message in the Google Sheet and send one short acknowledgement.
const SOURCE = fs.readFileSync(path.join(__dirname, '..', '..', 'line_bot_apps_script.js'), 'utf8');
const KEY = 'k'.repeat(32);

function load({ status = 200, sheetFails = false } = {}) {
  const sent = [], errors = [], rows = {};
  const sheet = name => ({
    appendRow: r => { if (sheetFails) throw new Error('quota'); (rows[name] ||= []).push(Array.from(r)); },
    getDataRange: () => ({ getValues: () => [[]] })
  });
  const ss = { getSheetByName: sheet };
  const sandbox = {
    console: { log() {}, warn() {}, error: m => errors.push(String(m)) },
    ContentService: { createTextOutput: text => ({ text }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k === 'LINE_WEBHOOK_KEY' ? KEY : null) }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    UrlFetchApp: {
      fetch: (url, o) => {
        sent.push(JSON.parse(o.payload));
        return { getResponseCode: () => status, getContentText: () => '{"message":"Authentication failed"}' };
      }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox);
  const post = (...events) => sandbox.doPost({ parameter: { key: KEY }, postData: { contents: JSON.stringify({ events }) } });
  const say = text => post({ type: 'message', replyToken: 'r', source: { userId: 'U1' }, message: { type: 'text', text } });
  return { sandbox, ss, sent, errors, rows, post, say };
}

for (const text of ['เลขบัญชี', 'สั่งซื้อ', 'เมนูหลัก', 'ยกเลิก', 'ติดต่อแอดมิน', 'ข้อความอะไรก็ได้']) {
  test(`"${text}" is recorded once and gets only the short acknowledgement`, () => {
    const b = load();
    b.say(text);
    assert.strictEqual(b.rows.Chat_History.length, 1);
    assert.deepStrictEqual(b.rows.Chat_History[0].slice(1), ['U1', text, 'ตอบรับข้อความ']);
    assert.strictEqual(b.sent.length, 1);
    assert.deepStrictEqual(b.sent[0].messages, [{ type: 'text', text: 'ได้รับข้อความแล้วครับ ✅ กรุณารอแอดมินตอบกลับในแชตนี้' }]);
  });
}

test('only the chat log is written, never order, FAQ or conversation state sheets', () => {
  const b = load();
  b.say('สั่งซื้อ');
  b.say('2');
  assert.deepStrictEqual(Object.keys(b.rows), ['Chat_History']);
  assert.doesNotMatch(SOURCE, /insertSheet\("(FAQ|Orders|User_State)"\)/);
});

test('a new friend gets one greeting and is recorded', () => {
  const b = load();
  b.post({ type: 'follow', replyToken: 'r', source: { userId: 'U2' } });
  assert.strictEqual(b.sent[0].messages.length, 1);
  assert.match(b.sent[0].messages[0].text, /พิมพ์ข้อความ/);
  assert.strictEqual(b.sent[0].messages[0].quickReply, undefined);
  assert.deepStrictEqual(b.rows.Chat_History[0].slice(1, 3), ['U2', '[FOLLOW: เพิ่มเพื่อนใหม่]']);
});

test('a shared location is recorded', () => {
  const b = load();
  b.post({ type: 'message', replyToken: 'r', source: { userId: 'U1' }, message: { type: 'location', latitude: 13.3, longitude: 100.9 } });
  assert.strictEqual(b.rows.Chat_History[0][2], 'พิกัด: 13.3, 100.9');
});

test('stickers and images are ignored as before', () => {
  const b = load();
  b.post({ type: 'message', replyToken: 'r', source: { userId: 'U1' }, message: { type: 'sticker' } });
  assert.strictEqual(b.sent.length, 0);
  assert.strictEqual(b.rows.Chat_History, undefined);
});

test('customer text cannot become a sheet formula', () => {
  const b = load();
  for (const attack of ['=HYPERLINK("x")', '+1', '@a', '-2']) b.say(attack);
  const cells = b.rows.Chat_History.flat().filter(c => typeof c === 'string');
  assert.strictEqual(cells.filter(c => /^[=+\-@]/.test(c)).length, 0);
  assert.ok(cells.includes('\'=HYPERLINK("x")'));
});

test('the message is recorded even when LINE rejects the reply, and the rejection is logged', () => {
  const b = load({ status: 401 });
  b.say('สวัสดี');
  assert.strictEqual(b.rows.Chat_History.length, 1);
  assert.match(b.errors.join('\n'), /LINE reply failed: 401/);
});

test('a failed sheet write is visible in the execution log and the customer is still answered', () => {
  const b = load({ sheetFails: true });
  b.say('สวัสดี');
  assert.match(b.errors.join('\n'), /Chat_History write failed: .*quota/);
  assert.strictEqual(b.sent.length, 1);
});

test('broadcasts no longer attach buttons for the removed menu', () => {
  const b = load();
  const messages = b.sandbox.buildBroadcastMessages({ text: 'โปรใหม่' });
  assert.strictEqual(messages[0].quickReply, undefined);
  const custom = b.sandbox.buildBroadcastMessages({ text: 'โปรใหม่', quickReplyItems: ['สนใจ'] });
  assert.strictEqual(custom[0].quickReply.items[0].action.text, 'สนใจ');
});

test('no sample payment data or admin-notified claim remains in the bot', () => {
  assert.doesNotMatch(SOURCE, /081-?234|0812345678|123-4-56789|สมศักดิ์|แจ้งเตือนแอดมินให้แล้ว|พร้อมเพย์/);
});
