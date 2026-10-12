const { test } = require('node:test');
const assert = require('node:assert/strict');
const handlerModule = import('../../supabase/functions/admin-users/handler.mjs');
const ADMIN = '11111111-1111-4111-8111-111111111111';
const BUYER = '22222222-2222-4222-8222-222222222222';
async function fixture(overrides = {}) {
    let mutations = 0;
    const backend = {
        getUser: async token => token === 'valid' ? { id: ADMIN, email_confirmed_at: 'now' } : null,
        getProfiles: async ids => ids.map(id => ({ id, name: '<Buyer>', phone: '081', consent_at: 'now' })),
        adminIds: async ids => ids.filter(id => id === ADMIN),
        listUsers: async page => ({ users: [{ id: BUYER, email: 'buyer@example.com', created_at: '2026-10-12', email_confirmed_at: 'now' }], nextPage: null }),
        invite: async () => { mutations++; },
        delete: async () => { mutations++; }
    };
    Object.assign(backend, overrides);
    const { createHandler } = await handlerModule;
    const handler = createHandler({ backend, siteUrl: 'https://shop.example/store/' });
    async function request(body, headers = {}, method = 'POST') {
        return handler(new Request('https://project.supabase.co/functions/v1/admin-users', {
            method, headers: { Origin: 'https://shop.example', Authorization: 'Bearer valid', 'Content-Type': 'application/json', ...headers },
            ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {})
        }));
    }
    return { request, mutations: () => mutations };
}
test('forged/expired token cannot list or mutate users', async () => {
    const f = await fixture();
    assert.equal((await f.request({ action: 'invite', email: 'x@y.z', name: 'X' }, { Authorization: 'Bearer fake' })).status, 401);
    assert.equal((await f.request({ action: 'list' }, { Authorization: '' })).status, 401);
    assert.equal(f.mutations(), 0);
});
test('authenticated non-admin cannot list or mutate users', async () => {
    const f = await fixture({ adminIds: async () => [] });
    assert.equal((await f.request({ action: 'list', page: 1 })).status, 403);
    assert.equal((await f.request({ action: 'delete', id: BUYER })).status, 403);
    assert.equal(f.mutations(), 0);
});
test('deleted or unconsented profile is denied despite valid Auth identity', async () => {
    for (const profiles of [[], [{ id: ADMIN, consent_at: null }]]) {
        const f = await fixture({ getProfiles: async () => profiles });
        assert.equal((await f.request({ action: 'list', page: 1 })).status, 403);
    }
});
test('cross-origin request is denied before privileged side effects', async () => {
    const f = await fixture();
    assert.equal((await f.request({ action: 'delete', id: BUYER }, { Origin: 'https://evil.example' })).status, 403);
    assert.equal(f.mutations(), 0);
    const preflight = await f.request({}, {}, 'OPTIONS');
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'https://shop.example');
});
test('listing returns minimal joined profile data with bounded pagination', async () => {
    const f = await fixture();
    const response = await f.request({ action: 'list', page: 1 });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.users[0].name, '<Buyer>');
    assert.equal(data.users[0].email, 'buyer@example.com');
    assert.equal(data.users[0].password, undefined);
    assert.equal(data.hasNext, false);
    assert.equal((await f.request({ action: 'list', page: -1 })).status, 400);
});
test('cannot delete self or another assigned admin, but may delete customer', async () => {
    const f = await fixture();
    assert.equal((await f.request({ action: 'delete', id: ADMIN })).status, 409);
    assert.equal((await f.request({ action: 'delete', id: BUYER })).status, 200);
    assert.equal(f.mutations(), 1);
    const protectedAdmin = await fixture({ adminIds: async ids => ids });
    assert.equal((await protectedAdmin.request({ action: 'delete', id: BUYER })).status, 409);
    assert.equal(protectedAdmin.mutations(), 0);
});
test('invitation normalizes email and uses trusted redirect, without caller roles/consent', async () => {
    let invitation;
    const f = await fixture({ invite: async payload => { invitation = payload; } });
    const r = await f.request({ action: 'invite', email: ' NEW@EXAMPLE.COM ', name: ' New ', role: 'admin', consent: true, redirectTo: 'https://evil.example' });
    assert.equal(r.status, 200);
    assert.deepEqual(invitation, { email: 'new@example.com', name: 'New', phone: '', redirectTo: 'https://shop.example/store/' });
});
test('malformed, oversized and unknown requests have no write side effects', async () => {
    const f = await fixture();
    for (const input of ['{', 'x'.repeat(5000), null, { action: 'other' }, { action: 'delete', id: 'not-uuid' }, { action: 'invite', email: 'bad', name: 'X' }]) {
        assert.equal((await f.request(input)).status, 400);
    }
    assert.equal(f.mutations(), 0);
});
test('provider failure hides credentials and internals', async () => {
    const f = await fixture({ delete: async () => { throw new Error('secret-service-key'); } });
    const response = await f.request({ action: 'delete', id: BUYER });
    assert.equal(response.status, 500);
    assert.ok(!(await response.text()).includes('secret-service-key'));
});
