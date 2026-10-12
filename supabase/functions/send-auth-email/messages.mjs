const PROJECT_URL = 'https://lxvxffrexegvqzeojztw.supabase.co';
const SITE_URL = 'https://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/';
const WARNING = 'อย่าแชร์ลิงก์หรือรหัสนี้กับผู้อื่น หากคุณไม่ได้ส่งคำขอนี้ โปรดละเว้นอีเมลนี้';

export class AuthEmailValidationError extends Error {
    constructor(code) {
        super(code);
        this.name = 'AuthEmailValidationError';
        this.code = code;
    }
}

function invalid(code = 'INVALID_AUTH_PAYLOAD') {
    throw new AuthEmailValidationError(code);
}

function record(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function recipient(value) {
    // Accept one plain ASCII mailbox, never a display name or address list.
    if (typeof value !== 'string' || value.length > 254 || /[\s,;<>\x00-\x1f\x7f]/u.test(value)) invalid();
    const parts = value.split('@');
    if (parts.length !== 2 || parts[0].length > 64 ||
        !/^[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+(?:\.[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+)*$/.test(parts[0]) ||
        !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(parts[1])) invalid();
    return value;
}

function otp(value) {
    if (typeof value !== 'string' || !/^[0-9]{6,10}$/.test(value) || /\s/.test(value)) invalid();
    return value;
}

function hash(value) {
    if (typeof value !== 'string' || value.length === 0 || value.length > 1024 || /[\s\x00-\x1f\x7f]/u.test(value)) invalid();
    return value;
}

function escapeHtml(value) {
    return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function verifyUrl(tokenHash, action, config) {
    const url = new URL('/auth/v1/verify', config.projectUrl);
    url.searchParams.set('token', tokenHash);
    url.searchParams.set('type', action);
    url.searchParams.set('redirect_to', config.siteUrl);
    return url.href;
}

function render({ messageId, to, title, instruction, token, tokenHash, action, name }, config) {
    const url = tokenHash === undefined ? undefined : verifyUrl(tokenHash, action, config);
    const greeting = `สวัสดี ${name}`;
    return {
        messageId, to, subject: `MAXMUXSIX — ${title}`,
        body: [greeting, instruction, `รหัสยืนยัน: ${token}`, ...(url ? [url] : []), WARNING, 'ทีมงาน MAXMUXSIX'].join('\n\n'),
        htmlBody: `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(greeting)}</p><p>${escapeHtml(instruction)}</p><p>รหัสยืนยัน: <strong>${escapeHtml(token)}</strong></p>${url ? `<p><a href="${escapeHtml(url)}">${escapeHtml(title)}</a></p>` : ''}<p>${escapeHtml(WARNING)}</p><p>ทีมงาน MAXMUXSIX</p>`
    };
}

/** Pure renderer for an already verified Supabase Send Email Hook payload. */
export function buildAuthMessages(payload, config) {
    if (!record(config) || config.projectUrl !== PROJECT_URL || config.siteUrl !== SITE_URL) invalid('INVALID_AUTH_CONFIG');
    if (!record(payload) || !record(payload.user) || !record(payload.email_data)) invalid();
    const { user, email_data: data } = payload;
    // Hook site_url is the Auth API external URL, not the frontend Site URL.
    // Compare literal root forms so URL normalization cannot hide ports/paths.
    if (data.redirect_to !== SITE_URL ||
        (data.site_url !== PROJECT_URL && data.site_url !== `${PROJECT_URL}/`)) invalid('INVALID_AUTH_URL');
    const to = recipient(user.email);
    const candidateName = record(user.user_metadata) ? user.user_metadata.full_name ?? user.user_metadata.name : undefined;
    const name = typeof candidateName === 'string' && candidateName.length > 0 && candidateName.length <= 200
        ? candidateName : to;
    const base = { messageId: 'primary', to, action: data.email_action_type, name };
    const linked = (title, instruction) => [render({ ...base, title, instruction, token: otp(data.token), tokenHash: hash(data.token_hash) }, config)];

    switch (data.email_action_type) {
        case 'signup':
            return linked('ยืนยันอีเมลสมาชิก', 'โปรดยืนยันอีเมลเพื่อสมัครสมาชิก MAXMUXSIX ให้เสร็จสมบูรณ์');
        case 'recovery':
            return linked('ตั้งรหัสผ่านใหม่', 'คุณขอตั้งรหัสผ่านใหม่ โปรดเปิดลิงก์เพื่อดำเนินการ');
        case 'invite':
            return linked('คำเชิญสมัครสมาชิก', 'คุณได้รับคำเชิญให้สมัครสมาชิก MAXMUXSIX โปรดเปิดลิงก์เพื่อตอบรับ');
        case 'magiclink':
            return linked('เข้าสู่ระบบ', 'โปรดเปิดลิงก์เพื่อเข้าสู่ระบบ MAXMUXSIX');
        case 'reauthentication':
            return [render({ ...base, title: 'รหัสยืนยันตัวตน', instruction: 'ใช้รหัสนี้ยืนยันตัวตนในหน้าที่คุณส่งคำขอ', token: otp(data.token) }, config)];
        case 'email_change': {
            const next = recipient(user.new_email);
            if (next.toLowerCase() === to.toLowerCase()) invalid();
            const tokenHash = hash(data.token_hash);
            const title = 'ยืนยันการเปลี่ยนอีเมล';
            const instruction = `โปรดยืนยันการเปลี่ยนอีเมลสมาชิก MAXMUXSIX เป็น ${next}`;
            if (data.token_hash_new !== undefined && data.token_hash_new !== '') {
                // Supabase's backwards-compatible hash names are reversed.
                const currentHash = hash(data.token_hash_new);
                const currentToken = otp(data.token);
                const nextToken = otp(data.token_new);
                return [
                    render({ ...base, messageId: 'current', title, instruction, token: currentToken, tokenHash: currentHash }, config),
                    render({ ...base, messageId: 'new', to: next, title, instruction, token: nextToken, tokenHash }, config)
                ];
            }
            const hasToken = data.token !== undefined && data.token !== '';
            const hasNewToken = data.token_new !== undefined && data.token_new !== '';
            if (hasToken === hasNewToken) invalid();
            return [render({ ...base, messageId: 'new', to: next, title, instruction,
                token: otp(hasNewToken ? data.token_new : data.token), tokenHash }, config)];
        }
        default:
            invalid('UNSUPPORTED_AUTH_ACTION');
    }
}
