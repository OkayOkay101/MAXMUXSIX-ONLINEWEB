(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MaxmuxsixMembership = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const unavailable = 'ระบบสมาชิกยังไม่เปิดใช้งาน กรุณาติดต่อร้าน หรือลองอีกครั้งภายหลัง';
    function createMembership({ config = {}, createClient, onChange = () => {}, onRecovery = () => {} } = {}) {
        const key = config.publishableKey || '';
        let secret = key.startsWith('sb_secret_');
        if (key.startsWith('eyJ')) {
            try { secret = JSON.parse(atob(key.split('.')[1])).role === 'service_role'; } catch (_) { secret = true; }
        }
        if (secret) throw new Error('ใช้เฉพาะ Publishable key ในเว็บไซต์เท่านั้น');
        const configured = Boolean(config.url && key && createClient);
        if (configured && (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.url) || !/^https:\/\//.test(config.redirectUrl || ''))) {
            throw new Error('ตั้งค่า URL ระบบสมาชิกไม่ถูกต้อง');
        }
        const client = configured ? createClient(config.url, key, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' }
        }) : null;
        let state = { user: null, isAdmin: false };
        let generation = 0, subscription;
        const publish = next => { state = next; onChange(next); return next; };
        function requireClient() { if (!client) throw new Error(unavailable); }
        function check(result, message = 'เชื่อมต่อระบบสมาชิกไม่สำเร็จ กรุณาลองใหม่') {
            if (result.error) {
                const code = result.error.code;
                if (code === 'invalid_credentials') message = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
                if (code === 'email_not_confirmed') message = 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ';
                if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') message = 'ทำรายการบ่อยเกินไป กรุณารอสักครู่';
                throw new Error(message);
            }
            return result.data;
        }
        function emailValue(value) {
            const email = String(value || '').trim().toLowerCase();
            if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('กรุณากรอกอีเมลให้ถูกต้อง');
            return email;
        }
        function passwordValue(value) {
            if (typeof value !== 'string' || value.length < 8 || value.length > 128) throw new Error('รหัสผ่านต้องมี 8–128 ตัวอักษร');
            return value;
        }
        async function refresh() {
            requireClient();
            const version = ++generation;
            try {
                const session = check(await client.auth.getSession()).session;
                if (!session) return version === generation ? publish({ user: null, isAdmin: false }) : state;
                const identity = check(await client.auth.getUser(), 'ตรวจสอบบัญชีไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่').user;
                if (!identity || !identity.email_confirmed_at) throw new Error('กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ');
                const profile = check(await client.from('profiles').select('id,name,phone,address,referral_code,consent_at,created_at').eq('id', identity.id).single(), 'ตรวจสอบบัญชีไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่');
                if (!profile || profile.id !== identity.id) throw new Error('ตรวจสอบบัญชีไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่');
                const [admin, count] = await Promise.all([client.rpc('is_member_admin'), client.rpc('member_referral_count')]);
                const isAdmin = check(admin) === true;
                const referredCount = Number(check(count)) || 0;
                const next = {
                    user: { id: identity.id, email: identity.email, name: profile.name, phone: profile.phone || '', address: profile.address || '', referralCode: profile.referral_code, referredCount, registeredDate: profile.created_at, consentPDPA: Boolean(profile.consent_at) },
                    isAdmin
                };
                return version === generation ? publish(next) : state;
            } catch (error) {
                if (version === generation) publish({ user: null, isAdmin: false });
                throw error;
            }
        }
        async function start() {
            if (!client) return publish({ user: null, isAdmin: false });
            if (!subscription) {
                subscription = client.auth.onAuthStateChange((event) => {
                    if (event === 'SIGNED_OUT') { generation++; publish({ user: null, isAdmin: false }); return; }
                    if (event === 'PASSWORD_RECOVERY') onRecovery();
                    // Never await SDK queries inside its auth callback (SDK lock).
                    const version = generation;
                    setTimeout(() => { if (version === generation) refresh().catch(() => {}); }, 0);
                }).data.subscription;
            }
            return refresh();
        }
        async function register(input) {
            requireClient();
            if (!input.consent) throw new Error('กรุณายินยอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว');
            const name = String(input.name || '').trim();
            const phone = String(input.phone || '').trim(), address = String(input.address || '').trim();
            if (!name || name.length > 100 || phone.length > 30 || address.length > 1000) throw new Error('กรุณาตรวจสอบชื่อ โทรศัพท์ และที่อยู่');
            const data = check(await client.auth.signUp({
                email: emailValue(input.email), password: passwordValue(input.password),
                options: { emailRedirectTo: config.redirectUrl, data: { name, phone, address, consent: true, referrer_code: String(input.referrerCode || '').trim().toUpperCase() } }
            }), 'สมัครสมาชิกไม่สำเร็จ หากมีบัญชีแล้วให้เข้าสู่ระบบหรือตั้งรหัสผ่านใหม่');
            if (data.session) await refresh();
            return { pendingConfirmation: !data.session };
        }
        async function login(email, password) {
            requireClient();
            check(await client.auth.signInWithPassword({ email: emailValue(email), password }), 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลและลองใหม่');
            return refresh();
        }
        async function logout() {
            requireClient();
            generation++;
            publish({ user: null, isAdmin: false });
            check(await client.auth.signOut({ scope: 'local' }));
        }
        async function resetPassword(email) {
            requireClient();
            check(await client.auth.resetPasswordForEmail(emailValue(email), { redirectTo: config.redirectUrl }));
        }
        async function setPassword(password, consent) {
            requireClient();
            passwordValue(password);
            if (!consent) throw new Error('กรุณายินยอมรับข้อกำหนดก่อนบันทึกรหัสผ่าน');
            check(await client.auth.updateUser({ password }));
            check(await client.rpc('accept_member_terms'));
            return refresh();
        }
        async function admin(action, payload = {}) {
            requireClient();
            const verified = await refresh();
            if (!verified.isAdmin) throw new Error('เฉพาะผู้ดูแลร้านเท่านั้น');
            const data = check(await client.functions.invoke('admin-users', { body: { ...payload, action } }), 'ทำรายการสมาชิกไม่สำเร็จ กรุณาตรวจสอบสิทธิ์หรือการเชื่อมต่อ');
            if (!data || data.error) throw new Error(data && data.error || 'ทำรายการสมาชิกไม่สำเร็จ');
            return data;
        }
        return { configured, start, refresh, register, login, logout, resetPassword, setPassword, admin };
    }
    return { createMembership };
});
