const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SAMPLE = /081-?234|0812345678|123-4-56789|สมศักดิ์|undefined/;

function load(status = 200) {
  const sent = [], rows = [], errors = [];
  const sheet = {
    appendRow: r => rows.push(r),
    getDataRange: () => ({ getValues: () => [[]] }),
    getRange: () => ({ setValues() {} }),
    deleteRow() {}
  };
  const ss = { getSheetByName: () => sheet };
  const sandbox = {
    console: { log() {}, error: m => errors.push(String(m)) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    UrlFetchApp: {
      fetch: (url, o) => {
        sent.push(JSON.parse(o.payload));
        return { getResponseCode: () => status, getContentText: () => '{"message":"Authentication failed"}' };
      }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', '..', 'line_bot_apps_script.js'), 'utf8'), sandbox);
  const replyText = (run) => { sent.length = 0; run(); return sent.map(p => p.messages.map(m => m.text || JSON.stringify(m)).join('\n')).join('\n'); };
  return { sandbox, ss, sent, rows, errors, replyText };
}

for (const [name, input] of [['payment', 'เลขบัญชี'], ['store', 'ที่อยู่ร้าน'], ['contact', 'ติดต่อแอดมิน']]) {
  test(`${name} reply holds no sample phone or account`, () => {
    const b = load();
    const text = b.replyText(() => b.sandbox.handleUserMessage(b.ss, 'r', 'U1', input));
    assert.ok(text.length > 20);
    assert.doesNotMatch(text, SAMPLE);
  });
}

test('payment reply asks the customer to wait for the admin', () => {
  const b = load();
  const text = b.replyText(() => b.sandbox.handleUserMessage(b.ss, 'r', 'U1', 'เลขบัญชี'));
  assert.match(text, /รอแอดมินแจ้งช่องทางชำระเงิน/);
  assert.match(text, /อย่าเพิ่งโอนเงิน/);
});

test('contact reply does not claim the admin was notified', () => {
  const b = load();
  const text = b.replyText(() => b.sandbox.handleUserMessage(b.ss, 'r', 'U1', 'ติดต่อแอดมิน'));
  assert.doesNotMatch(text, /แจ้งเตือนแอดมิน|แจ้งแอดมิน/);
  assert.match(text, /พิมพ์ข้อความทิ้งไว้ในแชทนี้/);
  assert.match(text, /รอแอดมินเข้ามาตอบ/);
});

test('order confirmation gives no transfer account', () => {
  const b = load();
  const text = b.replyText(() => b.sandbox.handleMultiStepFlow(b.ss, 'r', 'U1', 'ชื่อ ที่อยู่', { step: 'ORDER_STEP_3_CONTACT_INFO', data: { product: 'A', quantity: '1' } }));
  assert.doesNotMatch(text, SAMPLE);
  assert.match(text, /อย่าเพิ่งโอนเงิน/);
});

test('customer text cannot become a sheet formula', () => {
  const b = load();
  b.sandbox.logChat(b.ss, 'U1', '=HYPERLINK("x")', 'ok');
  b.sandbox.saveOrderToSheet(b.ss, 'U1', { product: '+1', quantity: '@a', customerInfo: '-2' });
  const cells = b.rows.flat().filter(c => typeof c === 'string' && c !== '-');
  assert.ok(cells.length > 0);
  assert.deepStrictEqual(cells.filter(c => /^[=+\-@]/.test(c)), []);
});

test('a rejected LINE reply is written to the log', () => {
  const b = load(401);
  b.sandbox.sendLineReply('r', [{ type: 'text', text: 'x' }]);
  assert.match(b.errors.join('\n'), /LINE reply failed: 401/);
});
