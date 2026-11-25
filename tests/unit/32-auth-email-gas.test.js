const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createAuthGasInstance } = require('../helpers/auth-gas-loader');

const NOW = 1800000000000;
const SECRET = 'fixture-relay-secret';
const primary = { messageId: 'primary', to: 'buyer@example.test', subject: 'MAXMUXSIX ยืนยันอีเมล', body: 'รหัส fixture', htmlBody: '<p>รหัส fixture</p>' };
function envelope(messages = [primary], overrides = {}) {
    const value = { timestamp: NOW / 1000, eventId: 'evt-fixture', payload: JSON.stringify({ version: 1, messages }), ...overrides };
    value.signature = crypto.createHmac('sha256', SECRET).update(`${value.timestamp}.${value.eventId}.${value.payload}`).digest('base64');
    return value;
}
const post = (sender, value) => sender.gas.doPost({ postData: { contents: typeof value === 'string' ? value : JSON.stringify(value) } }).getJson();
function rejected(sender, value, code) {
    const result = post(sender, value);
    assert.equal(result.success, false);
    if (code) assert.equal(result.code, code);
    assert.equal(sender.sentEmails.length, 0);
    assert.deepEqual(Object.keys(result).sort(), ['code', 'success']);
}

test('valid signed mail is accepted once with a fixed sender and no extra mail options', () => {
    const sender = createAuthGasInstance();
    assert.deepEqual(post(sender, envelope()), { success: true, eventId: 'evt-fixture' });
    assert.deepEqual(sender.sentEmails, [{ to: primary.to, subject: primary.subject, body: primary.body, htmlBody: primary.htmlBody, name: 'MAXMUXSIX' }]);
    sender.setQuota(0);
    assert.deepEqual(post(sender, envelope()), { success: true, eventId: 'evt-fixture' });
    assert.equal(sender.sentEmails.length, 1);
    assert.equal(sender.lockState.releases, 2);
    assert.ok(sender.lockState.attempts.every(ms => ms <= 100));
});

for (const [label, change] of [
    ['unsigned', value => { delete value.signature; }],
    ['invalid signature', value => { value.signature = 'A'.repeat(43) + '='; }],
    ['altered payload', value => { value.payload += ' '; }],
    ['altered event ID', value => { value.eventId = 'other'; }],
    ['altered timestamp', value => { value.timestamp++; }]
]) test(`${label} envelope cannot send`, () => {
    const sender = createAuthGasInstance();
    const value = envelope(); change(value); rejected(sender, value);
});

test('trailing newline cannot bypass event ID or signature schema', () => {
    rejected(createAuthGasInstance(), envelope([primary], { eventId: 'evt-fixture\n' }));
    const value = envelope(); value.signature += '\n';
    rejected(createAuthGasInstance(), value);
});

for (const seconds of [-301, 301]) test(`timestamp ${seconds} seconds from now is rejected`, () => {
    rejected(createAuthGasInstance(), envelope([primary], { timestamp: NOW / 1000 + seconds }), 'EXPIRED_REQUEST');
});
for (const seconds of [-300, 300]) test(`timestamp boundary ${seconds} seconds is accepted`, () => {
    assert.equal(post(createAuthGasInstance(), envelope([primary], { timestamp: NOW / 1000 + seconds })).success, true);
});

test('malformed envelope, nested JSON, and UTF-8 byte overflow fail before send', () => {
    for (const value of ['{', 'null', '[]', '{}', envelope([], { payload: '{' }), 'ก'.repeat(11000)]) rejected(createAuthGasInstance(), value);
    const tooLarge = envelope([{ ...primary, body: 'ก'.repeat(11000) }]);
    rejected(createAuthGasInstance(), tooLarge, 'REQUEST_TOO_LARGE');
});

test('strict envelope and payload schemas reject additional or invalid fields', () => {
    const bad = [
        envelope([primary], { timestamp: NOW / 1000 + 0.5 }),
        envelope([primary], { eventId: 'x'.repeat(129) }),
        envelope([primary], { eventId: 'evt\nprivate' }),
        { ...envelope(), secret: 'extra' },
        envelope([primary], { payload: JSON.stringify({ version: 2, messages: [primary] }) }),
        envelope([primary], { payload: JSON.stringify({ version: 1, messages: [primary], extra: true }) })
    ];
    for (const value of bad) rejected(createAuthGasInstance(), value);
});

test('all message fields and recipient slots are validated before either send', () => {
    const badMessages = [[], [primary, primary, primary], [primary, primary], [{ ...primary, messageId: 'arbitrary' }],
        [primary, { ...primary, messageId: 'new', to: 'a@example.test,b@example.test' }],
        [{ ...primary, to: 'a@example.test\nb@example.test' }], [{ ...primary, to: 'a@example.test;b@example.test' }],
        [{ ...primary, to: 'Name <a@example.test>' }], [{ ...primary, to: 'bad@' }],
        [{ ...primary, subject: 'subject\r\nbcc: other@example.test' }], [{ ...primary, subject: '' }],
        [{ ...primary, body: '' }], [{ ...primary, htmlBody: '' }], [{ ...primary, bcc: 'extra@example.test' }]];
    for (const messages of badMessages) rejected(createAuthGasInstance(), envelope(messages));
});

test('missing configured secret fails closed', () => {
    const sender = createAuthGasInstance(); delete sender.properties.AUTH_RELAY_SECRET;
    rejected(sender, envelope(), 'CONFIG_ERROR');
});

test('quota is checked for every pending recipient before first send', () => {
    rejected(createAuthGasInstance({ quota: 0 }), envelope(), 'QUOTA_EXCEEDED');
    rejected(createAuthGasInstance({ quota: 1 }), envelope([{ ...primary, messageId: 'current' }, { ...primary, messageId: 'new', to: 'next@example.test' }]), 'QUOTA_EXCEEDED');
});

test('unavailable lock sends zero and is never released by this invocation', () => {
    const sender = createAuthGasInstance({ lockAcquired: false });
    rejected(sender, envelope(), 'BUSY');
    assert.equal(sender.lockState.releases, 0);
});

test('send exception is bounded and excludes exception text or email content', () => {
    const sender = createAuthGasInstance({ failSendAt: 1 });
    rejected(sender, envelope(), 'SEND_FAILED');
    assert.equal(sender.lockState.releases, 1);
});

test('pre-send property write failure prevents delivery', () => {
    rejected(createAuthGasInstance({ failPropertyWrite: true }), envelope(), 'STATE_UNAVAILABLE');
});

test('post-send property write failure returns ambiguous failure instead of success', () => {
    const sender = createAuthGasInstance({ failPropertyWrite: 2 });
    assert.deepEqual(post(sender, envelope()), { success: false, code: 'SEND_STATE_UNKNOWN' });
    assert.equal(sender.sentEmails.length, 1);
    assert.equal(sender.lockState.releases, 1);
});

test('unexpected provider exception cannot choose a response code or expose private text', () => {
    const sender = createAuthGasInstance();
    sender.gas.MailApp.getRemainingDailyQuota = () => { throw { authMailCode: 'private buyer@example.test token-fixture' }; };
    rejected(sender, envelope(), 'INTERNAL_ERROR');
});

test('partial email change resumes only missing slot with only one quota unit', () => {
    const sender = createAuthGasInstance({ failSendAt: 2 });
    const value = envelope([{ ...primary, messageId: 'current' }, { ...primary, messageId: 'new', to: 'next@example.test' }]);
    assert.deepEqual(post(sender, value), { success: false, code: 'SEND_FAILED' });
    assert.equal(sender.sentEmails.length, 1);
    sender.setQuota(1);
    assert.equal(post(sender, value).success, true);
    assert.deepEqual(sender.sentEmails.map(mail => mail.to), ['buyer@example.test', 'next@example.test']);
    assert.equal(post(sender, value).success, true);
    assert.equal(sender.sentEmails.length, 2);
});

test('same event ID with a different signed payload cannot send another message', () => {
    const sender = createAuthGasInstance(); post(sender, envelope());
    const result = post(sender, envelope([{ ...primary, body: 'changed' }]));
    assert.deepEqual(result, { success: false, code: 'EVENT_CONFLICT' });
    assert.equal(sender.sentEmails.length, 1);
});

test('ledger capacity fails closed without evicting active successful records', () => {
    const sender = createAuthGasInstance({ quota: 200 });
    let accepted = 0;
    for (let i = 0; i < 101; i++) {
        const result = post(sender, envelope([primary], { eventId: `evt-${i}` }));
        if (!result.success) { assert.equal(result.code, 'LEDGER_FULL'); break; }
        accepted++;
    }
    assert.ok(accepted > 0 && accepted <= 100);
    assert.ok(Buffer.byteLength(sender.properties.AUTH_SENT_INDEX) < 8192);
    const saved = sender.properties.AUTH_SENT_INDEX;
    assert.equal(post(sender, envelope([primary], { eventId: 'evt-full-extra' })).code, 'LEDGER_FULL');
    assert.equal(sender.properties.AUTH_SENT_INDEX, saved);
    assert.equal(post(sender, envelope([primary], { eventId: 'evt-0' })).success, true);
    assert.equal(sender.sentEmails.length, accepted);
});

test('reserved entry has enough byte capacity for every successful slot before sending', () => {
    const sender = createAuthGasInstance();
    const digest = crypto.createHash('sha256').update(envelope().payload).digest('base64');
    const seed = { version: 1, events: Array.from({ length: 40 }, (_, i) => ({
        id: `seed-${i}`, digest, expires: NOW + 86400000, slots: ['primary'], sent: ['primary']
    })) };
    const reservation = { id: 'evt-fixture', digest, expires: NOW + 86400000, slots: ['primary'], sent: [] };
    const reservedText = () => JSON.stringify({ version: 1, events: [...seed.events, reservation] });
    for (const entry of seed.events) {
        const padding = Math.min(128 - entry.id.length, 8188 - Buffer.byteLength(reservedText()));
        if (padding > 0) entry.id += 'x'.repeat(padding);
    }
    assert.equal(Buffer.byteLength(reservedText()), 8188, 'pending record alone fits');
    reservation.sent = ['primary'];
    assert.ok(Buffer.byteLength(reservedText()) >= 8192, 'accepted slot would overflow');
    const stored = JSON.stringify(seed);
    sender.properties.AUTH_SENT_INDEX = stored;
    rejected(sender, envelope(), 'LEDGER_FULL');
    assert.equal(sender.properties.AUTH_SENT_INDEX, stored);
});

test('100 event bound rejects an oversized event collection without sending or replacing it', () => {
    const sender = createAuthGasInstance();
    const stored = JSON.stringify({ version: 1, events: Array.from({ length: 101 }, () => ({})) });
    sender.properties.AUTH_SENT_INDEX = stored;
    rejected(sender, envelope(), 'STATE_UNAVAILABLE');
    assert.equal(sender.properties.AUTH_SENT_INDEX, stored);
});

test('active successful slot is retained until its 24 hour boundary', () => {
    const sender = createAuthGasInstance(); post(sender, envelope());
    sender.setNow(NOW + 86400000 - 1);
    assert.equal(post(sender, envelope([primary], { timestamp: Math.floor((NOW + 86400000 - 1) / 1000) })).success, true);
    assert.equal(sender.sentEmails.length, 1);
});

test('24 hour ledger expiration prunes old entries and permits new events', () => {
    const sender = createAuthGasInstance(); post(sender, envelope());
    sender.setNow(NOW + 86400000);
    const value = envelope([primary], { timestamp: (NOW + 86400000) / 1000, eventId: 'evt-next-day' });
    assert.equal(post(sender, value).success, true);
    assert.equal(sender.sentEmails.length, 2);
    assert.ok(!sender.properties.AUTH_SENT_INDEX.includes('evt-fixture'));
});

test('corrupt or oversized ledger fails closed without clearing existing state', () => {
    for (const stored of ['{', '{}', 'x'.repeat(8192)]) {
        const sender = createAuthGasInstance(); sender.properties.AUTH_SENT_INDEX = stored;
        rejected(sender, envelope(), 'STATE_UNAVAILABLE');
        assert.equal(sender.properties.AUTH_SENT_INDEX, stored);
    }
});

test('doGet exposes only a static label and never sends mail', () => {
    const sender = createAuthGasInstance();
    assert.deepEqual(sender.gas.doGet().getJson(), { service: 'MAXMUXSIX Auth Mail' });
    assert.equal(sender.sentEmails.length, 0);
    assert.equal(sender.lockState.attempts.length, 0);
});
