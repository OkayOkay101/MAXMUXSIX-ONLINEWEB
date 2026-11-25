// Server-built order/welcome mail. The browser supplies product ids and quantities only:
// the database prices and stores the order; recipient, subject and markup are decided here.
const REQUEST_LIMIT = 8192;
const SHOP = 'MAXMUXSIX ข้าวหลามเตาถ่าน';

const escapeHtml = value => String(value).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const oneLine = value => String(value).replace(/[\x00-\x1f\x7f]+/g, ' ').trim().slice(0, 100);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasKeys = (value, keys) => isRecord(value) && Object.keys(value).length === keys.length &&
    keys.every(key => Object.hasOwn(value, key));
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

// Shape check only. Products, prices, coupon and shipping are decided by server_create_order.
function parseOrder(order) {
    const valid = hasKeys(order, ['id', 'items', 'shipping', 'coupon']) &&
        typeof order.id === 'string' && /^MAX-\d{6}$/.test(order.id) &&
        Array.isArray(order.items) && integer(order.items.length, 1, 20) &&
        order.items.every(item => hasKeys(item, ['id', 'qty']) && typeof item.id === 'string' &&
            /^[A-Za-z0-9_-]{1,40}$/.test(item.id) && integer(item.qty, 1, 99)) &&
        ['express', 'cold', 'pickup'].includes(order.shipping) &&
        typeof order.coupon === 'string' && order.coupon.length <= 40;
    return valid ? order : null;
}

function compose(to, name, subject, lines, siteUrl) {
    const text = [`สวัสดีคุณ ${name}`, ...lines];
    return {
        messageId: 'primary', to, subject,
        body: [...text, siteUrl, SHOP].join('\n'),
        htmlBody: '<div style="font-family:sans-serif;color:#222;line-height:1.6">' +
            text.map(line => `<p style="margin:4px 0">${escapeHtml(line)}</p>`).join('') +
            `<p><a href="${escapeHtml(siteUrl)}">เปิดร้าน</a></p><p>${SHOP}</p></div>`
    };
}

function orderMessage(to, name, order, siteUrl) {
    return compose(to, name, `ยืนยันคำสั่งซื้อ #${order.id} - MAXMUXSIX`, [
        `คำสั่งซื้อ #${order.id}`,
        ...order.items.map(item => `${item.name} x${item.qty} = ${item.qty * item.price} บาท`),
        `ยอดสินค้า ${order.subtotal} บาท`,
        `ส่วนลด ${order.discountAmount} บาท`,
        `ค่าจัดส่ง ${order.shippingCost} บาท`,
        `ยอดรวม ${order.total} บาท`
    ], siteUrl);
}

function welcomeMessage(to, name, referralCode, siteUrl) {
    return compose(to, name, 'ยินดีต้อนรับสู่ MAXMUXSIX', [
        'ขอบคุณที่สมัครสมาชิก MAXMUXSIX',
        'โค้ดส่วนลด 10%: WELCOME10',
        `รหัสแนะนำเพื่อนของคุณ: ${referralCode}`
    ], siteUrl);
}

export function createOrderMailHandler({ backend, sendMail, siteUrl }) {
    const origin = new URL(siteUrl).origin;
    if (!siteUrl.startsWith('https://') && !siteUrl.startsWith('http://localhost:')) throw new Error('Invalid SITE_URL');
    return async function handle(request) {
        const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin', 'Cache-Control': 'no-store' };
        const response = (status, data) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
        if (request.headers.get('origin') !== origin) return response(403, { error: 'ไม่อนุญาตเว็บไซต์นี้' });
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
        if (request.method !== 'POST') return response(405, { error: 'ใช้ POST เท่านั้น' });
        const token = /^Bearer (\S+)$/i.exec(request.headers.get('authorization') || '')?.[1];
        if (!token) return response(401, { error: 'กรุณาเข้าสู่ระบบใหม่' });
        try {
            const actor = await backend.getUser(token);
            if (!actor?.email || !actor.email_confirmed_at) return response(401, { error: 'กรุณาเข้าสู่ระบบและยืนยันอีเมล' });
            const profile = await backend.getProfile(actor.id);
            if (!profile?.consent_at) return response(403, { error: 'กรุณายอมรับข้อกำหนดสมาชิกก่อน' });
            const invalid = () => response(400, { error: 'ข้อมูลไม่ถูกต้อง' });
            if (Number(request.headers.get('content-length')) > REQUEST_LIMIT) return invalid();
            const raw = await request.text();
            let input = null;
            try { if (raw.length <= REQUEST_LIMIT) input = JSON.parse(raw); } catch { /* invalid() below */ }
            const name = oneLine(profile.name || 'สมาชิก MAXMUXSIX');
            let message, order;
            if (hasKeys(input, ['kind']) && input.kind === 'welcome') {
                message = welcomeMessage(actor.email, name, oneLine(profile.referral_code), siteUrl);
            } else if (hasKeys(input, ['kind', 'order']) && input.kind === 'order') {
                const requested = parseOrder(input.order);
                if (!requested) return invalid();
                order = await backend.createOrder(actor.id, requested);
                if (!order) return response(409, { error: 'บันทึกคำสั่งซื้อไม่ได้ กรุณาตรวจสอบรายการแล้วสั่งใหม่' });
                message = orderMessage(actor.email, name, order, siteUrl);
            } else return invalid();
            // The slot is claimed before sending: an unknown delivery outcome still counts.
            if (!await backend.claimSend(actor.id, input.kind)) return response(429, { error: 'ส่งอีเมลครบจำนวนต่อวันแล้ว กรุณาลองใหม่พรุ่งนี้' });
            try { await sendMail(message, `shop_${crypto.randomUUID()}`); }
            catch { return response(502, { error: 'ระบบอีเมลไม่ยืนยันการส่ง' }); }
            return response(200, { ok: true, recipient: actor.email, ...(order ? { order } : {}) });
        } catch {
            return response(500, { error: 'ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่ภายหลัง' });
        }
    };
}

export function createSupabaseBackend(client) {
    function data(result) { if (result.error) throw result.error; return result.data; }
    return {
        async getUser(token) { const result = await client.auth.getUser(token); return result.error ? null : result.data.user; },
        async getProfile(id) { return data(await client.from('profiles').select('name,referral_code,consent_at').eq('id', id).maybeSingle()); },
        async claimSend(id, kind) { return data(await client.rpc('server_claim_mail_send', { member_id: id, mail_kind: kind })) === true; },
        async createOrder(id, order) {
            return data(await client.rpc('server_create_order', { member_id: id, order_ref: order.id, lines: order.items, shipping_code: order.shipping, coupon_code: order.coupon }));
        }
    };
}
