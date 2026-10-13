// Real bundled SDK + real UI; only the external provider's HTTP transport is simulated.
// Run: PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser/membership.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const site = pathToFileURL(path.resolve(__dirname, '../../index.html')).href;
const project = 'https://test.supabase.co';
const adminId = '11111111-1111-4111-8111-111111111111';
const buyerId = '22222222-2222-4222-8222-222222222222';
const users = new Map([
    [adminId, { id: adminId, email: 'owner@example.com', name: 'เจ้าของร้าน', admin: true, confirmed: true, consent: true }],
    [buyerId, { id: buyerId, email: 'buyer@example.com', name: '<img src=x onerror=alert(1)>', admin: false, confirmed: true, consent: true }]
]);
const calls = [];
const tokens = new Map();
let failList = false;
let failUpdate = false;
function identity(member) {
    return { id: member.id, aud: 'authenticated', role: 'authenticated', email: member.email, phone: '', email_confirmed_at: member.confirmed ? '2026-10-12T00:00:00Z' : null, confirmed_at: '2026-10-12T00:00:00Z', created_at: '2026-10-12T00:00:00Z', updated_at: '2026-10-12T00:00:00Z', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { name: member.name }, identities: [] };
}
function session(member) {
    const encode = data => Buffer.from(JSON.stringify(data)).toString('base64url');
    const token = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: member.id, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now()/1000)+3600, iat: Math.floor(Date.now()/1000), session_id: 'browser-test-session' }) + '.signature';
    tokens.set(token, member.id);
    return { access_token: token, refresh_token: 'refresh-' + member.id, token_type: 'bearer', expires_in: 3600, user: identity(member) };
}
async function configure(context, configured = true) {
    await context.addInitScript(({ project, configured }) => {
        const config = { url: configured ? project : '', publishableKey: configured ? 'sb_publishable_browser_test' : '', redirectUrl: 'https://shop.example/' };
        Object.defineProperty(window, 'MAXMUXSIX_AUTH_CONFIG', { get: () => config, set: () => {} });
    }, { project, configured });
    // Never send fixture credentials to the configured hosted project.
    await context.route('https://*.supabase.co/**', route => route.abort());
    await context.route('https://fonts.googleapis.com/**', route => route.abort());
    await context.route('https://fonts.gstatic.com/**', route => route.abort());
    await context.route(project + '/**', async route => {
        const request = route.request(), url = new URL(request.url());
        const body = request.postDataJSON();
        calls.push({ path: url.pathname, body, method: request.method() });
        const member = users.get(tokens.get((request.headers().authorization || '').replace('Bearer ', '')));
        const send = (status, json) => route.fulfill({ status, json, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
        if (request.method() === 'OPTIONS') return send(200, {});
        if (url.pathname === '/auth/v1/signup') return send(200, { id: '33333333-3333-4333-8333-333333333333', email: body.email, identities: [], aud: 'authenticated', created_at: '2026-10-12', user_metadata: body.data });
        if (url.pathname === '/auth/v1/token') {
            const found = Array.from(users.values()).find(u => u.email === body.email);
            return found && body.password === 'password123' ? send(200, session(found)) : send(400, { code: 'invalid_credentials', msg: 'Invalid credentials' });
        }
        if (url.pathname === '/auth/v1/recover') return send(200, {});
        if (url.pathname === '/auth/v1/logout') return send(204, null);
        if (!member) return send(401, { message: 'Invalid user' });
        if (url.pathname === '/auth/v1/user') return send(200, identity(member));
        if (url.pathname === '/rest/v1/profiles') return send(200, { id: member.id, name: member.name, phone: member.phone ?? '0812345678', address: member.address ?? 'กรุงเทพ', referral_code: 'MAXABCD1234', consent_at: member.consent ? '2026-10-12' : null, created_at: '2026-10-12' });
        if (url.pathname === '/rest/v1/rpc/is_member_admin') return send(200, member.admin);
        if (url.pathname === '/rest/v1/rpc/member_referral_count') return send(200, 0);
        if (url.pathname === '/rest/v1/rpc/accept_member_terms') { member.consent = true; return send(204, null); }
        if (url.pathname === '/functions/v1/admin-users') {
            if (!member.admin) return send(403, { error: 'ผู้ดูแลเท่านั้น' });
            if (body.action === 'list') {
                if (failList) return send(500, { error: 'Unavailable' });
                return send(200, { users: Array.from(users.values()).map(u => ({ id: u.id, email: u.email, name: u.name, phone: u.phone ?? '0812345678', address: u.address ?? 'กรุงเทพ', confirmed: u.confirmed, isAdmin: u.admin })), hasNext: false, page: 1 });
            }
            if (body.action === 'update') {
                if (failUpdate) return send(500, { error: 'Unavailable' });
                const target = users.get(body.id);
                if (!target) return send(404, { error: 'Not found' });
                Object.assign(target, { name: body.name, phone: body.phone, address: body.address });
                return send(200, { ok: true });
            }
            if (body.action === 'invite') { const id = '44444444-4444-4444-8444-444444444444'; users.set(id, { id, name: body.name, email: body.email, admin: false, confirmed: false, consent: false }); return send(200, { ok: true }); }
            if (body.action === 'delete') { users.delete(body.id); return send(200, { ok: true }); }
        }
        return send(404, {});
    });
}
async function login(page, email) {
    await page.evaluate(() => openAuthModal('login'));
    await page.locator('#loginUserKey').fill(email);
    await page.locator('#loginPassword').fill('password123');
    await page.locator('#loginSubmit').click();
    await page.waitForFunction(() => !document.getElementById('authModal').classList.contains('active'));
}
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const errors = [];
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        await configure(context);
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(site);
        assert.equal(await page.evaluate(() => typeof MaxmuxsixSupabase.createClient), 'function');
        // Signup confirmation does not authenticate or send the old GAS welcome email.
        await page.evaluate(() => openAuthModal('register'));
        await page.locator('#regName').fill('สมาชิกใหม่'); await page.locator('#regEmail').fill('new@example.com'); await page.locator('#regPhone').fill('0812345678');
        await page.locator('#regPassword').fill('password123'); await page.locator('#regConsentCheckbox').check();
        await page.locator('#registerSubmit').click();
        await page.waitForFunction(() => document.getElementById('authStatus').textContent.includes('ยืนยัน'));
        assert.equal(await page.evaluate(() => currentUser), null);
        await page.evaluate(() => closeAuthModal());
        await login(page, 'owner@example.com');
        await page.locator('#btnManageMembers').click();
        await page.waitForFunction(() => document.getElementById('membersBody').children.length === 2);
        assert.equal(await page.locator('#membersBody img').count(), 0);
        assert.ok((await page.locator('#membersBody').innerText()).includes('<img src=x onerror=alert(1)>'));
        assert.equal(await page.locator('#membersBody').getByRole('button', { name: 'ลบ', exact: true }).first().isDisabled(), true);
        // Update form retains input after provider failure, then renders saved values inertly.
        await page.locator('#membersBody tr').nth(1).getByRole('button', { name: 'แก้ไข', exact: true }).click({ timeout: 3000 });
        assert.equal(await page.locator('#editMemberName').inputValue(), '<img src=x onerror=alert(1)>');
        assert.equal(await page.locator('#editMemberAddress').inputValue(), 'กรุงเทพ');
        const updatedName = 'สมาชิกอัปเดต <svg onload=alert(1)>';
        await page.locator('#editMemberName').fill(updatedName);
        await page.locator('#editMemberPhone').fill('0899999999');
        await page.locator('#editMemberAddress').fill('เชียงใหม่');
        failUpdate = true;
        await page.locator('#editMemberSubmit').click();
        await page.waitForFunction(() => !membersBusy && document.getElementById('membersStatus').textContent.includes('ไม่สำเร็จ'));
        assert.equal(await page.locator('#editMemberName').inputValue(), updatedName);
        assert.equal(await page.locator('#editMemberSubmit').isDisabled(), false);
        failUpdate = false;
        await page.locator('#editMemberSubmit').click();
        await page.waitForFunction(() => !membersBusy && document.getElementById('membersStatus').textContent.includes('บันทึกข้อมูล'));
        assert.equal(await page.locator('#editMemberForm').isVisible(), false);
        assert.ok((await page.locator('#membersBody').innerText()).includes(updatedName));
        assert.equal(await page.locator('#membersBody svg').count(), 0);
        assert.equal(users.get(buyerId).address, 'เชียงใหม่');
        await page.locator('#membersBody tr').nth(1).getByRole('button', { name: 'แก้ไข', exact: true }).click();
        assert.equal(await page.locator('#editMemberPhone').inputValue(), '0899999999');
        assert.equal(await page.locator('#editMemberAddress').inputValue(), 'เชียงใหม่');
        await page.locator('#editMemberCancel').click();
        assert.equal(await page.evaluate(() => document.activeElement.textContent), 'แก้ไข');
        assert.equal(await page.locator('#membersBody').getByRole('button', { name: 'ลบ', exact: true }).first().isDisabled(), true);
        const contrasts = await page.evaluate(() => {
            const luminance = color => {
                const c = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(n => { n /= 255; return n <= 0.04045 ? n/12.92 : ((n+0.055)/1.055)**2.4; });
                return c[0]*0.2126 + c[1]*0.7152 + c[2]*0.0722;
            };
            const background = luminance(getComputedStyle(document.querySelector('.members-box')).backgroundColor);
            return ['#membersTitle', '#membersStatus', '#membersBody td', '#inviteMemberForm label', '#editMemberForm label', '#editMemberAccount'].map(selector => {
                const foreground = luminance(getComputedStyle(document.querySelector(selector)).color);
                return (Math.max(foreground, background)+0.05)/(Math.min(foreground, background)+0.05);
            });
        });
        assert.ok(contrasts.every(ratio => ratio >= 4.5), 'Member content contrast must meet 4.5:1');
        await page.locator('#inviteName').fill('ทดสอบคำเชิญ'); await page.locator('#inviteEmail').fill('invite@example.com');
        await page.locator('#inviteSubmit').click();
        await page.waitForFunction(() => document.getElementById('membersBody').children.length === 3);
        await page.locator('#membersBody tr').last().getByRole('button', { name: 'แก้ไข', exact: true }).click();
        page.once('dialog', dialog => dialog.accept());
        await page.locator('#membersBody button').last().click();
        await page.waitForFunction(() => document.getElementById('membersBody').children.length === 2);
        assert.equal(await page.locator('#editMemberForm').isVisible(), false);
        assert.equal(await page.locator('#editMemberAddress').inputValue(), '');
        // Keyboard wraps within modal and Escape restores its opening control.
        await page.locator('#membersNext').evaluate(el => { el.disabled = false; el.focus(); });
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'ปิดจัดการสมาชิก');
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'btnManageMembers');
        // Network error remains retryable.
        failList = true; await page.locator('#btnManageMembers').click();
        await page.waitForFunction(() => document.getElementById('membersStatus').textContent.includes('ไม่สำเร็จ'));
        assert.equal(await page.locator('#inviteSubmit').isDisabled(), false);
        failList = false; await page.evaluate(() => loadMembers(1));
        await page.waitForFunction(() => document.getElementById('membersBody').children.length === 2);
        await page.locator('#membersBody tr').nth(1).getByRole('button', { name: 'แก้ไข', exact: true }).click();
        await page.screenshot({ path: path.resolve(__dirname, '../../tmp/admin-crud-desktop.png'), animations: 'disabled' });
        await page.evaluate(() => closeMembersModal());
        // Two isolated browser contexts authenticate against the same simulated provider.
        const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
        await configure(mobile);
        const phone = await mobile.newPage(); phone.on('pageerror', error => errors.push(error.message));
        await phone.goto(site); await login(phone, 'owner@example.com');
        // Account modal works above banner; then make the normal cookie choice before navigation.
        await phone.locator('.btn-consent-decline').click();
        await phone.locator('#btnMobileMenuToggle').click();
        await phone.locator('#btnMobileManageMembers').click();
        await phone.waitForFunction(() => document.getElementById('membersBody').children.length === 2);
        assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        assert.equal(await phone.locator('#membersBody button').last().evaluate(button => {
            const range = document.createRange(); range.selectNodeContents(button);
            return range.getClientRects().length;
        }), 1, 'Thai delete label stays on one line on mobile');
        await phone.locator('#membersBody tr').nth(1).getByRole('button', { name: 'แก้ไข', exact: true }).click();
        assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await phone.locator('#editMemberSubmit').scrollIntoViewIfNeeded();
        assert.equal(await phone.locator('#editMemberSubmit').isVisible(), true);
        await phone.screenshot({ path: path.resolve(__dirname, '../../tmp/admin-crud-mobile.png'), animations: 'disabled' });
        await phone.evaluate(() => closeMembersModal());
        phone.once('dialog', d => d.accept()); await phone.evaluate(() => handleLogout());
        await phone.waitForFunction(() => currentUser === null);
        assert.equal(await page.evaluate(() => currentUser.email), 'owner@example.com');
        await login(phone, 'buyer@example.com');
        assert.equal(await phone.locator('#btnMobileManageMembers').isVisible(), false);
        // Real SDK URL handling for both invite and password-recovery links.
        for (const type of ['invite', 'recovery']) {
            const linkUser = type === 'invite' ? { id: '55555555-5555-4555-8555-555555555555', email: 'invited@example.com', name: 'ผู้รับคำเชิญ', admin: false, confirmed: true, consent: false } : users.get(buyerId);
            users.set(linkUser.id, linkUser);
            const issued = session(linkUser);
            const linkContext = await browser.newContext({ viewport: { width: 390, height: 844 } }); await configure(linkContext);
            const linkPage = await linkContext.newPage(); linkPage.on('pageerror', error => errors.push(error.message));
            await linkPage.goto(site + '#' + new URLSearchParams({ access_token: issued.access_token, refresh_token: issued.refresh_token, expires_in: '3600', token_type: 'bearer', type }));
            await linkPage.waitForFunction(() => document.getElementById('authModal').classList.contains('active') && document.getElementById('passwordContent').classList.contains('active'));
            await linkPage.locator('#newMemberPassword').fill('newpassword123'); await linkPage.locator('#confirmMemberPassword').fill('newpassword123'); await linkPage.locator('#memberTerms').check();
            await linkPage.locator('#passwordSubmit').click();
            await linkPage.waitForFunction(() => !document.getElementById('authModal').classList.contains('active'));
            assert.equal(await linkPage.evaluate(() => currentUser.consentPDPA), true);
            await linkContext.close();
        }
        // Missing config keeps shopping available while login fails closed.
        const emptyContext = await browser.newContext(); await configure(emptyContext, false);
        const empty = await emptyContext.newPage(); await empty.goto(site);
        await empty.evaluate(() => openAuthModal('login'));
        assert.ok((await empty.locator('#authStatus').innerText()).includes('ยังไม่เปิด'));
        await empty.locator('#loginUserKey').fill('buyer@example.com'); await empty.locator('#loginPassword').fill('password123'); await empty.locator('#loginSubmit').click();
        await empty.waitForFunction(() => !document.getElementById('loginSubmit').disabled);
        assert.equal(await empty.evaluate(() => currentUser), null);
        assert.ok(await empty.locator('.card').count() > 0);
        assert.equal(await empty.evaluate(() => localStorage.getItem('maxmuxsix_users')), null);
        assert.deepEqual(errors, []);
        console.log(JSON.stringify({ result: 'PASS', widths: [1440, 390], minContentContrast: Math.min(...contrasts).toFixed(2), checks: ['signup confirmation', 'real SDK login', 'admin CRUD', 'update failure preserves edits', 'inert names', 'keyboard focus', 'retryable provider error', 'isolated contexts', 'logout isolation', 'non-admin denial', 'invite and recovery URL password flows', 'unconfigured storefront'], provider: 'HTTP fixture only; no live Supabase or email', requests: calls.length }));
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
