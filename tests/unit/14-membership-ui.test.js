const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAppInstance } = require('../helpers/app-loader');
test('forged local member and admin flags do not authenticate on boot', () => {
    const { app } = createAppInstance({ localStorage: { maxmuxsix_active_user: JSON.stringify({ id: 'forged', name: 'Attacker' }) }, sessionStorage: { maxmuxsix_admin_mode: 'true' } });
    assert.equal(app.currentUser, null);
    assert.equal(app.isAdminMode, false);
});
test('unconfigured login shows useful error, leaves signed out and restores submit button', async () => {
    const { app, getElement } = createAppInstance();
    getElement('loginUserKey').value = 'buyer@example.com';
    getElement('loginPassword').value = 'password123';
    await app.handleLogin({ preventDefault() {} });
    assert.equal(app.currentUser, null);
    assert.match(getElement('authStatus').textContent, /ยังไม่เปิด/);
    assert.equal(getElement('loginSubmit').disabled, false);
});
test('syncStorage never writes member identity or local password database', () => {
    const { app, store } = createAppInstance();
    app.currentUser = { id: 'verified', name: 'Buyer' };
    app.syncStorage();
    assert.equal(store.local.maxmuxsix_active_user, undefined);
    assert.equal(store.local.maxmuxsix_users, undefined);
});
test('local catalog reset does not delete central account/session', () => {
    const { app } = createAppInstance();
    app.currentUser = { id: 'verified', name: 'Buyer' };
    app.resetToDefault();
    assert.equal(app.currentUser.id, 'verified');
});
test('legacy PIN grants no admin capability', async () => {
    const { app, store } = createAppInstance({ localStorage: { maxmuxsix_admin_pin: '1234' } });
    await app.promptAdminMode();
    assert.equal(app.isAdminMode, false);
    assert.notEqual(store.session.maxmuxsix_admin_mode, 'true');
});
test('pending email confirmation does not log in or send a simulated welcome email', async () => {
    let publish;
    const { app, getElement, store } = createAppInstance({ globals: { MaxmuxsixMembership: { createMembership: options => {
        publish = options.onChange;
        return { configured: true, start: async () => {}, register: async () => ({ pendingConfirmation: true }) };
    } } } });
    getElement('regName').value = 'Buyer'; getElement('regEmail').value = 'buyer@example.com'; getElement('regPhone').value = '081';
    getElement('regPassword').value = 'password123'; getElement('regConsentCheckbox').checked = true;
    await app.handleRegister({ preventDefault() {} });
    assert.equal(app.currentUser, null);
    assert.equal(app.sentEmails.length, 0);
    assert.match(getElement('authStatus').textContent, /ยืนยัน/);
    publish({ user: { id: 'cloud', name: 'Buyer', email: 'buyer@example.com', consentPDPA: true }, isAdmin: true });
    assert.equal(app.currentUser.id, 'cloud');
    assert.equal(app.isAdminMode, true);
    assert.equal(getElement('btnManageMembers').style.display, 'inline-flex');
    assert.equal(store.local.maxmuxsix_active_user, undefined);
});

test('closing and reopening member list starts fresh request and stale result cannot replace it', async () => {
    let finishOld, calls = 0;
    const oldResponse = new Promise(resolve => { finishOld = resolve; });
    const { app, getElement } = createAppInstance({ globals: { MaxmuxsixMembership: { createMembership: () => ({
        configured: true, start: async () => {}, admin: async () => ++calls === 1 ? oldResponse : ({ users: [{ id: 'new', name: 'Fresh account', email: 'new@example.com' }], hasNext: false })
    }) } } });
    app.currentUser = { id: 'admin', name: 'Admin' }; app.isAdminMode = true;
    const first = app.openMembersModal();
    app.closeMembersModal();
    await app.openMembersModal();
    assert.equal(getElement('membersBody').children.length, 1);
    finishOld({ users: [{ id: 'old', name: 'Stale account' }], hasNext: false });
    await first;
    assert.equal(getElement('membersBody').children.length, 1);
    assert.equal(getElement('membersBody').children[0].children[0].textContent, 'Fresh account / new@example.com');
});

test('admin menu describes member management instead of falsely claiming to log out', async () => {
    const { app, getElement } = createAppInstance({ globals: { MaxmuxsixMembership: { createMembership: () => ({
        configured: true, start: async () => {}, refresh: async () => ({ isAdmin: true }), admin: async () => ({ users: [], hasNext: false })
    }) } } });
    app.currentUser = { id: 'admin', name: 'Admin' }; app.isAdminMode = true;
    app.renderAdminControls();
    assert.match(getElement('adminToggleLink').innerHTML, /จัดการสมาชิก/);
    await app.promptAdminMode();
    assert.equal(getElement('membersModal').classList.contains('active'), true);
    assert.equal(app.isAdminMode, true);
});

test('successful login reports account status, never claims a welcome email was sent', async () => {
    const { app, getElement } = createAppInstance({ globals: { MaxmuxsixMembership: { createMembership: options => ({
        configured: true, start: async () => {}, login: async () => {
            const state = { user: { id: 'cloud', name: 'Buyer', email: 'buyer@example.com', consentPDPA: true }, isAdmin: false };
            options.onChange(state); return state;
        }
    }) } } });
    app.setTimeout = () => 1;
    getElement('loginUserKey').value = 'buyer@example.com'; getElement('loginPassword').value = 'password123';
    await app.handleLogin({ preventDefault() {} });
    assert.doesNotMatch(getElement('emailToastArea').innerHTML, /ส่งอีเมลต้อนรับ|เปิดดูอีเมล/);
    assert.equal(getElement('emailToastArea').children[0].children[0].textContent, 'เข้าสู่ระบบสำเร็จ');
    assert.equal(app.currentUser.id, 'cloud');
});
