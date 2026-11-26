// Server-built order/welcome mail. The browser supplies product ids and quantities only:
// the database prices and stores the order; recipient, subject and markup are decided here.
import { DEMO_NOTICE, escapeHtml, receiptHtml, welcomeHtml } from './templates.mjs';

const REQUEST_LIMIT = 8192;
// The signed relay rejects envelopes over 32 KiB; leave room for the timestamp, id and signature.
const MAIL_BYTES = 32 * 1024 - 300;
const SHOP = 'MAXMUXSIX ข้าวหลามเตาถ่าน';

const flatten = value => String(value).replace(/[\x00-\x1f\x7f]+/g, ' ').trim();
const oneLine = value => flatten(value).slice(0, 100);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasKeys = (value, keys) => isRecord(value) && Object.keys(value).length === keys.length &&
    keys.every(key => Object.hasOwn(value, key));
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

async function readBoundedText(request, limit) {
    const contentLength = request.headers.get('content-length');
    if (contentLength && /^[0-9]+$/.test(contentLength) && Number(contentLength) > limit) {
        try { Promise.resolve(request.body?.cancel()).catch(() => {}); } catch { /* best effort */ }
        return null;
    }
    if (!request.body) return '';
    const reader = request.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let bytes = 0;
    let text = '';
    let finished = false;
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) { finished = true; break; }
            bytes += value.byteLength;
            if (bytes > limit) return null;
            text += decoder.decode(value, { stream: true });
        }
        return text + decoder.decode();
    } catch {
        return null;
    } finally {
        if (!finished) {
            try { Promise.resolve(reader.cancel()).catch(() => {}); } catch { /* best effort */ }
        }
        try { reader.releaseLock(); } catch { /* best effort */ }
    }
}

// Who and where to deliver, as typed at checkout. Shown in the mail to the member only; not stored.
const DELIVERY_LIMITS = { name: 100, phone: 30, address: 1000 };
const validDelivery = value => hasKeys(value, Object.keys(DELIVERY_LIMITS)) &&
    Object.entries(DELIVERY_LIMITS).every(([key, max]) => typeof value[key] === 'string' && value[key].length <= max);

// Shape check only. Products, prices, coupon and shipping are decided by server_create_order.
function parseOrder(order) {
    const keys = ['id', 'items', 'shipping', 'coupon'];
    // Pages loaded before delivery details were added send only the first four keys.
    const withDelivery = isRecord(order) && Object.hasOwn(order, 'delivery');
    const valid = hasKeys(order, withDelivery ? [...keys, 'delivery'] : keys) &&
        (!withDelivery || validDelivery(order.delivery)) &&
        typeof order.id === 'string' && /^MAX-\d{6}$/.test(order.id) &&
        Array.isArray(order.items) && integer(order.items.length, 1, 20) &&
        order.items.every(item => hasKeys(item, ['id', 'qty']) && typeof item.id === 'string' &&
            /^[A-Za-z0-9_-]{1,40}$/.test(item.id) && integer(item.qty, 1, 99)) &&
        ['express', 'cold', 'pickup'].includes(order.shipping) &&
        typeof order.coupon === 'string' && order.coupon.length <= 40;
    return valid ? order : null;
}

// Bytes this message adds to the relay envelope, where the payload is a JSON string inside JSON.
const relayBytes = message => new TextEncoder().encode(JSON.stringify(JSON.stringify({ version: 1, messages: [message] }))).length;

// Takes the first layout that fits. The unstyled copy is the last resort so a mail is never lost to its size.
function compose(to, name, subject, lines, siteUrl, layouts) {
    const text = [DEMO_NOTICE, `สวัสดีคุณ ${name}`, ...lines];
    const message = { messageId: 'primary', to, subject, body: [...text, siteUrl, SHOP].join('\n') };
    for (const layout of layouts) {
        const styled = { ...message, htmlBody: layout() };
        if (relayBytes(styled) <= MAIL_BYTES) return styled;
    }
    return { ...message, htmlBody: '<div style="font-family:sans-serif;color:#222;line-height:1.6">' +
        text.map(line => `<p style="margin:4px 0">${escapeHtml(line)}</p>`).join('') +
        `<p><a href="${escapeHtml(siteUrl)}">เปิดร้าน</a></p><p>${SHOP}</p></div>` };
}

const mailDate = date => new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);

function orderMessage(to, name, order, delivery, siteUrl) {
    const customer = {
        email: to,
        name: flatten(delivery?.name ?? '') || name,
        phone: flatten(delivery?.phone ?? ''),
        address: flatten(delivery?.address ?? '')
    };
    const view = { siteUrl, orderId: order.id, dateText: mailDate(new Date()), customer, order };
    return compose(to, name, `ยืนยันคำสั่งซื้อ #${order.id} - MAXMUXSIX`, [
        `คำสั่งซื้อ #${order.id}`,
        ...order.items.map(item => `${item.name} x${item.qty} = ${item.qty * item.price} บาท`),
        `ยอดสินค้า ${order.subtotal} บาท`,
        `ส่วนลด ${order.discountAmount} บาท`,
        `ค่าจัดส่ง ${order.shippingCost} บาท`,
        `ยอดรวม ${order.total} บาท`,
        ...(delivery ? [`ผู้รับ: ${customer.name} ${customer.phone}`, `ที่อยู่จัดส่ง: ${customer.address}`] : [])
    ], siteUrl, [true, false].map(images => () => receiptHtml(view, { images })));
}

function welcomeMessage(to, name, referralCode, siteUrl) {
    return compose(to, name, 'ยินดีต้อนรับสู่ MAXMUXSIX', [
        'ขอบคุณที่สมัครสมาชิก MAXMUXSIX',
        'โค้ดส่วนลด 10%: WELCOME10',
        `รหัสแนะนำเพื่อนของคุณ: ${referralCode}`
    ], siteUrl, [() => welcomeHtml({ siteUrl, name, referralCode })]);
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
            const raw = await readBoundedText(request, REQUEST_LIMIT);
            if (raw === null) return invalid();
            let input = null;
            try { input = JSON.parse(raw); } catch { /* invalid() below */ }
            const name = oneLine(profile.name || 'สมาชิก MAXMUXSIX');
            let message, order, delivery;
            if (hasKeys(input, ['kind']) && input.kind === 'welcome') {
                message = welcomeMessage(actor.email, name, oneLine(profile.referral_code), siteUrl);
            } else if (hasKeys(input, ['kind', 'order']) && input.kind === 'order') {
                const parsed = parseOrder(input.order);
                if (!parsed) return invalid();
                const { delivery: typed, ...requested } = parsed;
                delivery = typed;
                order = await backend.createOrder(actor.id, requested);
                if (!order) return response(409, { error: 'บันทึกคำสั่งซื้อไม่ได้ กรุณาตรวจสอบรายการแล้วสั่งใหม่' });
                message = orderMessage(actor.email, name, order, delivery, siteUrl);
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
