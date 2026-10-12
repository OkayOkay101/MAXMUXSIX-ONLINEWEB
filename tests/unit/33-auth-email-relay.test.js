const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { Webhook } = require('standardwebhooks');
const { createAuthGasInstance } = require('../helpers/auth-gas-loader');

const config = {
    projectUrl: 'https://lxvxffrexegvqzeojztw.supabase.co',
    siteUrl: 'https://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/',
    gasUrl: 'https://script.google.com/macros/s/fixture_deployment/exec',
    relaySecret: 'fixture-UTF8-秘密-not-base64', upstreamTimeoutMs: 3500
};
const hookSecret = Buffer.alloc(32, 17).toString('base64');
const wh = new Webhook(hookSecret);
const eventId = 'msg_fixture-123';
const logs = [];
const originalInfo = console.info;
before(() => { console.info = message => logs.push(message); });
after(() => {
    console.info = originalInfo;
    assert.ok(logs.length > 0);
    for (const line of logs) {
        const row = JSON.parse(line);
        assert.ok(Object.keys(row).every(key => ['status', 'durationMs', 'eventId'].includes(key)));
        if (row.eventId) assert.equal(row.eventId, eventId);
        assert.equal(typeof row.status, 'number');
        assert.equal(typeof row.durationMs, 'number');
    }
});
function payload() {
    return { user: { email: 'buyer@example.test' }, email_data: {
        email_action_type: 'signup', token: '12345678', token_hash: 'private-fixture-hash',
        redirect_to: config.siteUrl, site_url: config.projectUrl
    } };
}
function request(data = payload(), options = {}) {
    const body = typeof data === 'string' ? data : JSON.stringify(data);
    const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
    const headers = { 'webhook-id': eventId, 'webhook-timestamp': String(timestamp),
        'webhook-signature': wh.sign(eventId, new Date(timestamp * 1000), body), ...options.headers };
    return new Request('https://fixture.test/hook', { method: 'POST', body, headers });
}
const success = () => new Response(JSON.stringify({ success: true, eventId }));
async function setup(options = {}) {
    const { createAuthEmailHandler } = await import('../../supabase/functions/send-auth-email/relay.mjs');
    const calls = [];
    const handler = createAuthEmailHandler({ config, now: Date.now,
        verify: (raw, headers) => wh.verify(raw, headers),
        fetchImpl: async (...args) => { calls.push(args); return success(); }, ...options });
    return { handler, calls };
}
async function failure(response, status) {
    assert.equal(response.status, status);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.equal(response.headers.get('retry-after'), null);
    const text = await response.text();
    const data = JSON.parse(text);
    assert.equal(data.error.http_code, status);
    assert.equal(typeof data.error.message, 'string');
    for (const privateText of [config.relaySecret, hookSecret, 'buyer@example.test', '12345678', 'private-fixture-hash']) {
        assert.equal(text.includes(privateText), false);
    }
    return data;
}

test('valid real-library signature relays a literal UTF8 HMAC envelope accepted by GAS', async () => {
    const nowMs = Date.now();
    const gas = createAuthGasInstance({ secret: config.relaySecret, nowMs });
    let envelope;
    const { handler } = await setup({ now: () => nowMs, fetchImpl: async (url, options) => {
        assert.equal(url, config.gasUrl);
        assert.equal(options.method, 'POST');
        assert.equal(options.redirect, 'manual');
        assert.equal(options.credentials, 'omit');
        envelope = JSON.parse(options.body);
        assert.deepEqual(Object.keys(envelope).sort(), ['eventId', 'payload', 'signature', 'timestamp']);
        assert.equal(envelope.eventId, eventId);
        assert.equal(envelope.timestamp, Math.floor(nowMs / 1000));
        assert.equal(envelope.signature, createHmac('sha256', config.relaySecret)
            .update(`${envelope.timestamp}.${eventId}.${envelope.payload}`).digest('base64'));
        assert.equal(Buffer.from(envelope.signature, 'base64').length, 32);
        const result = gas.gas.doPost({ postData: { contents: options.body } });
        return new Response(result.getContent());
    } });
    const response = await handler(request());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {});
    const sent = JSON.parse(envelope.payload);
    assert.equal(sent.version, 1);
    assert.equal(sent.messages[0].messageId, 'primary');
    assert.equal(gas.sentEmails.length, 1);
});

test('real signed provider payload accepts a distinct Auth external URL and frontend redirect', async () => {
    const { handler, calls } = await setup();
    const response = await handler(request());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {});
    assert.equal(calls.length, 1);
    const envelope = JSON.parse(calls[0][1].body);
    const sent = JSON.parse(envelope.payload);
    const url = new URL(sent.messages[0].body.match(/https:\/\/\S+/)[0]);
    assert.equal(url.origin, config.projectUrl);
    assert.equal(url.pathname, '/auth/v1/verify');
    assert.equal(url.searchParams.get('redirect_to'), config.siteUrl);
});

for (const [field, value] of [
    ['redirect_to', config.projectUrl], ['redirect_to', `${config.siteUrl}?next=other`],
    ['site_url', config.siteUrl], ['site_url', 'https://foreign.supabase.co'],
    ['site_url', 'https://user:pass@lxvxffrexegvqzeojztw.supabase.co'],
    ['site_url', `${config.projectUrl}:443`], ['site_url', `${config.projectUrl}?next=other`],
    ['site_url', `${config.projectUrl}#other`], ['site_url', `${config.projectUrl}/auth/v1`]
]) test(`signed non-approved ${field} ${value} cannot start upstream`, async () => {
    const data = payload(); data.email_data[field] = value;
    const { handler, calls } = await setup();
    await failure(await handler(request(data)), 400);
    assert.equal(calls.length, 0);
});

for (const [name, makeRequest] of [
    ['missing signature', () => request(payload(), { headers: { 'webhook-signature': '' } })],
    ['invalid signature', () => request(payload(), { headers: { 'webhook-signature': 'v1,invalid' } })],
    ['tampered raw payload', () => {
        const signed = request();
        return new Request(signed.url, { method: 'POST', headers: signed.headers,
            body: JSON.stringify(payload()).replace('12345678', '87654321') });
    }],
    ['stale timestamp', () => request(payload(), { timestamp: Math.floor(Date.now() / 1000) - 301 })],
    ['future timestamp', () => request(payload(), { timestamp: Math.floor(Date.now() / 1000) + 301 })],
    ['noninteger timestamp', () => request(payload(), { headers: { 'webhook-timestamp': '12junk' } })],
    ['unsafe event id', () => request(payload(), { headers: { 'webhook-id': 'buyer@example.test' } })]
]) test(`${name} cannot start upstream`, async () => {
    const { handler, calls } = await setup();
    await failure(await handler(makeRequest()), 401);
    assert.equal(calls.length, 0);
});

test('verifier receives the exact raw body and signature headers', async () => {
    const raw = '  ' + JSON.stringify(payload()) + '\n';
    const { handler } = await setup({ verify: (body, headers) => {
        assert.equal(body, raw);
        assert.equal(headers['webhook-id'], eventId);
        return wh.verify(body, headers);
    } });
    assert.equal((await handler(request(raw))).status, 200);
});

test('UTF8 BOM reaches the real verifier unchanged before JSON rejection', async () => {
    const raw = '\uFEFF' + JSON.stringify(payload());
    const seen = [];
    const { handler, calls } = await setup({ verify: (body, headers) => {
        seen.push(body);
        return wh.verify(body, headers);
    } });
    await failure(await handler(request(raw)), 401);
    assert.equal(seen[0], raw);
    assert.equal(calls.length, 0);
});

test('GET is rejected before verifying or sending', async () => {
    const { handler, calls } = await setup({ verify: () => { throw new Error('should not verify'); } });
    await failure(await handler(new Request('https://fixture.test/hook')), 405);
    assert.equal(calls.length, 0);
});

for (const field of ['gasUrl', 'relaySecret', 'siteUrl', 'projectUrl']) {
    test(`missing ${field} fails closed`, async () => {
        const { handler, calls } = await setup({ config: { ...config, [field]: '' } });
        await failure(await handler(request()), 500);
        assert.equal(calls.length, 0);
    });
}
test('missing verifier configuration fails closed', async () => {
    const { handler, calls } = await setup({ verify: undefined });
    await failure(await handler(request()), 500);
    assert.equal(calls.length, 0);
});

for (const [name, body] of [
    ['unknown action', { ...payload(), email_data: { ...payload().email_data, email_action_type: 'unknown' } }],
    ['malformed JSON', '{private-fixture-hash']
]) test(`${name} is rejected without upstream`, async () => {
    const { handler, calls } = await setup();
    await failure(await handler(request(body)), name === 'malformed JSON' ? 401 : 400);
    assert.equal(calls.length, 0);
});

test('request body byte limit is enforced while streaming without Content-Length', async () => {
    const { handler, calls } = await setup();
    const req = request('é'.repeat(16385));
    await failure(await handler(req), 413);
    assert.equal(calls.length, 0);
});
test('large declared request length is rejected without reading', async () => {
    const { handler, calls } = await setup();
    await failure(await handler(request(payload(), { headers: { 'content-length': '32769' } })), 413);
    assert.equal(calls.length, 0);
});
test('outbound envelope limit is enforced after rendering before fetch', async () => {
    const data = payload();
    data.user.new_email = 'new@example.test';
    data.user.user_metadata = { full_name: '名'.repeat(200) };
    Object.assign(data.email_data, { email_action_type: 'email_change', token_hash: '名'.repeat(1024),
        token_hash_new: '名'.repeat(1024), token_new: '87654321' });
    const { handler, calls } = await setup();
    await failure(await handler(request(data)), 413);
    assert.equal(calls.length, 0);
});

for (const [name, response] of [
    ['wrong event id', () => new Response('{"success":true,"eventId":"other"}')],
    ['HTTP 200 failure', () => new Response('{"success":false,"code":"SEND_FAILED"}')],
    ['quota response', () => new Response('{"success":false,"code":"QUOTA_EXCEEDED"}')],
    ['malformed response', () => new Response('{buyer@example.test')],
    ['HTTP error', () => new Response('private-fixture-hash', { status: 500 })],
    ['oversized response stream', () => new Response('é'.repeat(8193))],
    ['oversized response header', () => new Response('{}', { headers: { 'content-length': '16385' } })]
]) test(`${name} cannot acknowledge hook success`, async () => {
    const { handler } = await setup({ fetchImpl: async () => response() });
    await failure(await handler(request()), 502);
});
test('network error is sanitized without retry', async () => {
    let count = 0;
    const { handler } = await setup({ fetchImpl: async () => { count++; throw new Error(config.relaySecret); } });
    await failure(await handler(request()), 502);
    assert.equal(count, 1);
});

for (const status of [302, 303]) test(`${status} follows Google response URL with credential-free GET`, async () => {
    let count = 0;
    const { handler } = await setup({ fetchImpl: async (url, options) => {
        count++;
        if (count === 1) return new Response(null, { status, headers: { location: 'https://script.googleusercontent.com/macros/echo?fixture=1' } });
        assert.equal(url, 'https://script.googleusercontent.com/macros/echo?fixture=1');
        assert.equal(options.method, 'GET');
        assert.equal(options.body, undefined);
        assert.equal(options.headers, undefined);
        assert.equal(options.credentials, 'omit');
        assert.equal(options.redirect, 'manual');
        return success();
    } });
    assert.equal((await handler(request())).status, 200);
    assert.equal(count, 2);
});
for (const url of [
    'https://evil.test/macros/s/id/exec', 'http://script.google.com/macros/s/id/exec',
    'https://user:pass@script.google.com/macros/s/id/exec', 'https://script.google.com:8443/macros/s/id/exec',
    'https://script.google.com/other', 'https://script.google.com/macros/s/id/exec?x=1',
    'https://script.googleusercontent.com/macros/s/id/exec'
]) test(`invalid deployment URL fails closed: ${url}`, async () => {
    const { handler, calls } = await setup({ config: { ...config, gasUrl: url } });
    await failure(await handler(request()), 500);
    assert.equal(calls.length, 0);
});
for (const location of [
    'http://script.googleusercontent.com/echo', 'https://script.googleusercontent.com:8443/echo',
    'https://user:pass@script.googleusercontent.com/echo', 'https://script.google.com/macros/s/id/exec',
    'https://script.googleusercontent.com.evil.test/echo', 'https://evil.test/echo', '/relative'
]) test(`unsafe redirect is not followed: ${location}`, async () => {
    let calls = 0;
    const { handler } = await setup({ fetchImpl: async () => { calls++; return new Response(null, { status: 302, headers: { location } }); } });
    await failure(await handler(request()), 502);
    assert.equal(calls, 1);
});
for (const status of [301, 307, 308]) test(`${status} redirect cannot replay signed POST`, async () => {
    let calls = 0;
    const { handler } = await setup({ fetchImpl: async () => { calls++; return new Response(null, { status, headers: { location: 'https://script.googleusercontent.com/echo' } }); } });
    await failure(await handler(request()), 502);
    assert.equal(calls, 1);
});
test('third redirect is rejected without a fourth request', async () => {
    let calls = 0;
    const { handler } = await setup({ fetchImpl: async () => { calls++; return new Response(null, { status: 303, headers: { location: 'https://script.googleusercontent.com/echo' } }); } });
    await failure(await handler(request()), 502);
    assert.equal(calls, 3);
});

test('fetch resolving only after abort never produces success or retry', async () => {
    let calls = 0;
    let signal;
    const { handler } = await setup({ config: { ...config, upstreamTimeoutMs: 25 }, fetchImpl: async (_, options) => {
        calls++; signal = options.signal;
        await new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
        return success();
    } });
    await failure(await handler(request()), 504);
    assert.equal(signal.aborted, true);
    assert.equal(calls, 1);
});
test('noncooperative response stream is bounded by the same absolute deadline', async () => {
    let canceled = false;
    const { handler } = await setup({ config: { ...config, upstreamTimeoutMs: 25 }, fetchImpl: async () =>
        new Response(new ReadableStream({ pull: () => new Promise(() => {}), cancel() { canceled = true; } })) });
    await failure(await handler(request()), 504);
    assert.equal(canceled, true);
});
test('noncooperative request read expires without starting upstream', async () => {
    const { handler, calls } = await setup({ config: { ...config, upstreamTimeoutMs: 25 } });
    const req = { method: 'POST', headers: request().headers,
        body: new ReadableStream({ pull: () => new Promise(() => {}) }) };
    await failure(await handler(req), 504);
    assert.equal(calls.length, 0);
});
test('elapsed budget during verification prevents fetch even before timer gets a turn', async () => {
    let time = Date.now();
    const { handler, calls } = await setup({ now: () => time, config: { ...config, upstreamTimeoutMs: 25 },
        verify: raw => { time += 26; return JSON.parse(raw); } });
    await failure(await handler(request()), 504);
    assert.equal(calls.length, 0);
});
test('redirect and response parsing share one deadline and signal', async () => {
    let time = Date.now();
    let signal;
    let calls = 0;
    const { handler } = await setup({ now: () => time, config: { ...config, upstreamTimeoutMs: 25 }, fetchImpl: async (_, options) => {
        calls++;
        if (calls === 1) {
            signal = options.signal; time += 24;
            return new Response(null, { status: 302, headers: { location: 'https://script.googleusercontent.com/echo' } });
        }
        assert.equal(options.signal, signal);
        time += 2;
        return success();
    } });
    await failure(await handler(request()), 504);
    assert.equal(calls, 2);
    assert.equal(signal.aborted, true);
});
