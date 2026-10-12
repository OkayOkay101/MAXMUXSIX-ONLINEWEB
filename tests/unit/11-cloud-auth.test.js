const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createMembership } = require('../../assets/js/cloud-auth');

const config = { url: 'https://test.supabase.co', publishableKey: 'sb_publishable_test', redirectUrl: 'https://shop.example/' };
function fixture(overrides = {}) {
    const user = { id: 'member-id', email: 'buyer@example.com', email_confirmed_at: '2026-10-12' };
    let active = user, callback;
    const client = {
        auth: {
            getSession: async () => ({ data: { session: active ? { user: active, access_token: 'token' } : null }, error: null }),
            getUser: async () => ({ data: { user: active }, error: null }),
            onAuthStateChange: fn => { callback = fn; return { data: { subscription: { unsubscribe() {} } } }; },
            signInWithPassword: async () => ({ data: { user, session: { user } }, error: null }),
            signUp: async () => ({ data: { user, session: null }, error: null }),
            signOut: async () => { active = null; return { error: null }; },
            resetPasswordForEmail: async () => ({ data: {}, error: null }),
            updateUser: async () => ({ data: { user }, error: null })
        },
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: user.id, name: '<Buyer>', phone: '081', address: 'Bangkok', referral_code: 'MAXABCD1234', consent_at: '2026-10-12' }, error: null }) }) }) }),
        rpc: async name => ({ data: name === 'is_member_admin' ? false : 2, error: null }),
        functions: { invoke: async () => ({ data: { users: [] }, error: null }) }
    };
    Object.assign(client.auth, overrides.auth);
    if (overrides.from) client.from = overrides.from;
    if (overrides.rpc) client.rpc = overrides.rpc;
    const states = [];
    const service = createMembership({ config, createClient: () => client, onChange: state => states.push(state) });
    return { service, client, states, emit: (...args) => callback(...args) };
}

test('unconfigured membership refuses login instead of using local identities', async () => {
    const service = createMembership({ config: {} });
    assert.equal(service.configured, false);
    await assert.rejects(service.login('x@y.z', 'password'), /ยังไม่เปิด/);
});
test('rejects server secret keys accidentally placed in public config', () => {
    assert.throws(() => createMembership({ config: { ...config, publishableKey: 'sb_secret_private' } }), /Publishable/);
});
test('start verifies identity and maps only central profile, never password/metadata role', async () => {
    const { service } = fixture();
    const state = await service.start();
    assert.equal(state.user.name, '<Buyer>');
    assert.equal(state.user.referralCode, 'MAXABCD1234');
    assert.equal(state.user.referredCount, 2);
    assert.equal(state.isAdmin, false);
    assert.equal(state.user.password, undefined);
});
test('unconfirmed signup stays logged out and forwards consent/profile not roles', async () => {
    const { service, client } = fixture();
    let sent;
    client.auth.signUp = async payload => { sent = payload; return { data: { session: null, user: { id: 'pending' } }, error: null }; };
    const result = await service.register({ name: ' User ', email: ' TEST@EXAMPLE.COM ', phone: '081', address: '', password: 'password123', consent: true, role: 'admin' });
    assert.equal(result.pendingConfirmation, true);
    assert.equal(sent.email, 'test@example.com');
    assert.equal(sent.options.data.name, 'User');
    assert.equal(sent.options.data.consent, true);
    assert.equal(sent.options.data.role, undefined);
});
test('signup without consent or short password is rejected before provider calls', async () => {
    const { service } = fixture();
    await assert.rejects(service.register({ email: 'x@y.z', name: 'X', password: 'password', consent: false }), /ยินยอม/);
    await assert.rejects(service.register({ email: 'x@y.z', name: 'X', password: '123', consent: true }), /8/);
});
test('deleted profile invalidates member state even with a cached session', async () => {
    const { service, states } = fixture({ from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'no row' } }) }) }) }) });
    await assert.rejects(service.start(), /ตรวจสอบบัญชี/);
    assert.equal(states.at(-1).user, null);
    assert.equal(states.at(-1).isAdmin, false);
});
test('signout racing an in-flight profile read cannot restore an old account', async () => {
    let resolve;
    const pending = new Promise(r => { resolve = r; });
    const { service, states } = fixture({ from: () => ({ select: () => ({ eq: () => ({ single: () => pending }) }) }) });
    const reading = service.refresh();
    await new Promise(r => setImmediate(r));
    await service.logout();
    resolve({ data: { id: 'member-id', name: 'Old', consent_at: 'now' }, error: null });
    await reading;
    assert.equal(states.at(-1).user, null);
});
test('reset email hides account existence and uses configured redirect', async () => {
    const { service, client } = fixture();
    let redirect;
    client.auth.resetPasswordForEmail = async (email, options) => { redirect = options.redirectTo; return { error: null }; };
    await service.resetPassword('BUYER@example.com');
    assert.equal(redirect, 'https://shop.example/');
});
test('admin authorization is rechecked centrally, not trusted from cached state', async () => {
    const { service, client } = fixture({ rpc: async name => ({ data: name === 'is_member_admin' ? true : 0, error: null }) });
    await service.start();
    client.rpc = async () => ({ data: false, error: null });
    await assert.rejects(service.admin('list', { page: 1 }), /ผู้ดูแล/);
});
