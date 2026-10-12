const { test } = require('node:test');
const assert = require('node:assert/strict');

const config = {
    projectUrl: 'https://lxvxffrexegvqzeojztw.supabase.co',
    siteUrl: 'https://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/'
};
const load = () => import('../../supabase/functions/send-auth-email/messages.mjs');
function fixture(action = 'signup') {
    return {
        user: { email: 'buyer@example.test', user_metadata: { full_name: 'ผู้ซื้อ' } },
        email_data: {
            email_action_type: action, token: '123456', token_hash: 'fixture-hash',
            token_new: '', token_hash_new: '', redirect_to: config.siteUrl, site_url: config.siteUrl
        }
    };
}
function link(row) {
    const match = row.body.match(/https:\/\/\S+/);
    assert.ok(match, 'plain text must contain the verification link');
    return new URL(match[0]);
}
async function rejects(payload, code = 'INVALID_AUTH_PAYLOAD', options) {
    const checkedConfig = arguments.length < 3 ? config : options;
    const { buildAuthMessages } = await load();
    assert.throws(() => buildAuthMessages(payload, checkedConfig), error => {
        assert.equal(error.name, 'AuthEmailValidationError');
        assert.equal(error.code, code);
        assert.equal(error.message, code);
        assert.doesNotMatch(JSON.stringify(error), /buyer@|fixture-hash|123456/);
        return true;
    });
}

for (const [action, purpose] of [
    ['signup', 'ยืนยันอีเมล'], ['recovery', 'ตั้งรหัสผ่านใหม่'],
    ['invite', 'คำเชิญ'], ['magiclink', 'เข้าสู่ระบบ']
]) {
    test(`${action} creates one controlled Thai email with the project verify URL`, async () => {
        const { buildAuthMessages } = await load();
        const rows = buildAuthMessages(fixture(action), config);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].to, 'buyer@example.test');
        assert.equal(rows[0].messageId, 'primary');
        assert.match(rows[0].subject, /MAXMUXSIX/);
        assert.ok(rows[0].subject.includes(purpose));
        assert.match(rows[0].body, /123456/);
        assert.match(rows[0].body, /อย่าแชร์ลิงก์หรือรหัส/);
        const url = link(rows[0]);
        assert.equal(url.origin, config.projectUrl);
        assert.equal(url.pathname, '/auth/v1/verify');
        assert.equal(url.searchParams.get('token'), 'fixture-hash');
        assert.equal(url.searchParams.get('type'), action);
        assert.equal(url.searchParams.get('redirect_to'), config.siteUrl);
        assert.equal([...url.searchParams].length, 3);
    });
}

test('reauthentication uses OTP alone even when Supabase provides a hash', async () => {
    const { buildAuthMessages } = await load();
    for (const hash of ['', 'fixture-hash']) {
        const payload = fixture('reauthentication');
        payload.email_data.token_hash = hash;
        const [row] = buildAuthMessages(payload, config);
        assert.equal(row.messageId, 'primary');
        assert.equal(row.to, 'buyer@example.test');
        assert.match(row.body, /123456/);
        assert.doesNotMatch(row.body, /https?:|fixture-hash/);
        assert.doesNotMatch(row.htmlBody, /href=|https?:|fixture-hash/);
    }
});

test('secure email change pairs reversed hashes and distinct OTPs with current/new slots', async () => {
    const { buildAuthMessages } = await load();
    const payload = fixture('email_change');
    payload.user.new_email = 'next@example.test';
    Object.assign(payload.email_data, { token_new: '654321', token_hash_new: 'current-hash', token_hash: 'new-hash' });
    const rows = buildAuthMessages(payload, config);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map(row => [row.messageId, row.to]), [['current', 'buyer@example.test'], ['new', 'next@example.test']]);
    assert.equal(link(rows[0]).searchParams.get('token'), 'current-hash');
    assert.equal(link(rows[1]).searchParams.get('token'), 'new-hash');
    assert.equal(link(rows[0]).searchParams.get('type'), 'email_change');
    assert.match(rows[0].body, /123456/);
    assert.doesNotMatch(rows[0].body, /654321|new-hash/);
    assert.match(rows[1].body, /654321/);
    assert.doesNotMatch(rows[1].body, /123456|current-hash/);
});

for (const tokenField of ['token', 'token_new']) {
    test(`single email change sends ${tokenField} with token_hash to the new address`, async () => {
        const { buildAuthMessages } = await load();
        const payload = fixture('email_change');
        payload.user.new_email = 'next@example.test';
        payload.email_data.token = '';
        payload.email_data[tokenField] = '654321';
        const rows = buildAuthMessages(payload, config);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].messageId, 'new');
        assert.equal(rows[0].to, 'next@example.test');
        assert.equal(link(rows[0]).searchParams.get('token'), 'fixture-hash');
        assert.match(rows[0].body, /654321/);
    });
}

test('HTML escapes user metadata while plain text preserves it and payload cannot override templates', async () => {
    const { buildAuthMessages } = await load();
    const payload = fixture();
    payload.user.user_metadata.full_name = '<img src=x onerror="alert(1)"> & \'ผู้ซื้อ\'';
    Object.assign(payload, { subject: 'forged', body: 'forged', htmlBody: '<script>bad</script>', to: 'other@example.test' });
    const [row] = buildAuthMessages(payload, config);
    assert.ok(row.body.includes(payload.user.user_metadata.full_name));
    assert.ok(row.htmlBody.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;ผู้ซื้อ&#39;'));
    assert.doesNotMatch(row.htmlBody, /<img|<script>/);
    assert.doesNotMatch(row.subject + row.htmlBody + row.body, /forged/);
    assert.equal(row.to, 'buyer@example.test');
});

test('verification hash is encoded as one parameter and HTML URL escapes ampersands', async () => {
    const { buildAuthMessages } = await load();
    const payload = fixture();
    payload.email_data.token_hash = 'hash&redirect_to=https://evil.example.test/#"';
    const [row] = buildAuthMessages(payload, config);
    assert.equal(link(row).searchParams.get('token'), payload.email_data.token_hash);
    assert.equal(link(row).searchParams.get('redirect_to'), config.siteUrl);
    assert.match(row.htmlBody, /&amp;type=signup&amp;redirect_to=/);
});

for (const action of ['email', 'email_change_new', 'password_changed_notification', '', null]) {
    test(`unsupported action ${String(action)} fails explicitly`, async () => {
        const payload = fixture(); payload.email_data.email_action_type = action;
        await rejects(payload, 'UNSUPPORTED_AUTH_ACTION');
    });
}

for (const key of ['email', 'token', 'token_hash']) {
    test(`missing ${key} rejects before returning messages`, async () => {
        const payload = fixture(); delete (key === 'email' ? payload.user : payload.email_data)[key];
        await rejects(payload);
    });
}
for (const value of [null, {}, { user: {} }, { user: [], email_data: {} }]) {
    test(`malformed payload ${JSON.stringify(value)} rejects with a stable code`, () => rejects(value));
}

for (const email of ['buyer@example.test,other@example.test', 'buyer@example.test;other@example.test', 'buyer@example.test\r\nBcc:other@example.test', ' buyer@example.test', 'Buyer <buyer@example.test>', 'buyer@@example.test', 'buyer@example.test\n', 'buyer@example.test\u0000']) {
    test(`recipient ${JSON.stringify(email)} cannot introduce another destination`, async () => {
        const payload = fixture(); payload.user.email = email; await rejects(payload);
    });
}

for (const field of ['redirect_to', 'site_url']) {
    for (const value of ['https://evil.example.test/', 'http://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/', `${config.siteUrl}?next=https://evil.example.test`, `${config.siteUrl}#other`, '', undefined]) {
        test(`${field} rejects a non-allowlisted value ${String(value)}`, async () => {
            const payload = fixture(); payload.email_data[field] = value;
            await rejects(payload, 'INVALID_AUTH_URL');
        });
    }
}
for (const options of [undefined, {}, { ...config, projectUrl: 'https://other.supabase.co' }, { ...config, siteUrl: 'https://evil.example.test/' }]) {
    test(`untrusted configuration ${JSON.stringify(options)} rejects`, () => rejects(fixture(), 'INVALID_AUTH_CONFIG', options));
}

test('reauthentication requires a numeric OTP', async () => {
    for (const token of ['', '123', '<img>', '123456\r\n', 123456]) {
        const payload = fixture('reauthentication'); payload.email_data.token = token; await rejects(payload);
    }
});

test('email change refuses incomplete pairs, duplicate recipients and injected new address atomically', async () => {
    for (const patch of [
        { user: { new_email: '' } }, { user: { new_email: 'buyer@example.test' } },
        { user: { new_email: 'next@example.test;other@example.test' } },
        { email_data: { token_hash_new: 'current-hash', token_new: '' } },
        { email_data: { token_hash_new: 'current-hash', token: '' } },
        { email_data: { token: '123456', token_new: '654321' } },
        { email_data: { token_hash: '' } }
    ]) {
        const payload = fixture('email_change'); payload.user.new_email = 'next@example.test';
        Object.assign(payload.user, patch.user); Object.assign(payload.email_data, patch.email_data);
        await rejects(payload);
    }
});
