const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pageSize = 25;

export function createHandler({ backend, siteUrl }) {
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
            if (!actor || !actor.email_confirmed_at) return response(401, { error: 'กรุณาเข้าสู่ระบบและยืนยันอีเมล' });
            const [roles, ownProfiles] = await Promise.all([backend.adminIds([actor.id]), backend.getProfiles([actor.id])]);
            if (!roles.includes(actor.id) || !ownProfiles.some(p => p.id === actor.id && p.consent_at)) return response(403, { error: 'เฉพาะผู้ดูแลร้านเท่านั้น' });
            if (Number(request.headers.get('content-length')) > 4096) return response(400, { error: 'ข้อมูลไม่ถูกต้อง' });
            const raw = await request.text();
            let input;
            try { input = raw.length <= 4096 ? JSON.parse(raw) : null; } catch (_) { input = null; }
            if (!input || typeof input !== 'object' || Array.isArray(input)) return response(400, { error: 'ข้อมูลไม่ถูกต้อง' });
            if (input.action === 'list') {
                const page = input.page === undefined ? 1 : input.page;
                if (!Number.isInteger(page) || page < 1 || page > 10000) return response(400, { error: 'หมายเลขหน้าไม่ถูกต้อง' });
                const result = await backend.listUsers(page, pageSize);
                const ids = result.users.map(user => user.id);
                const [profiles, admins] = ids.length ? await Promise.all([backend.getProfiles(ids), backend.adminIds(ids)]) : [[], []];
                return response(200, { page, hasNext: Boolean(result.nextPage), users: result.users.map(user => {
                    const profile = profiles.find(p => p.id === user.id);
                    return { id: user.id, email: user.email || '', name: profile?.name || '', phone: profile?.phone || '', createdAt: user.created_at, confirmed: Boolean(user.email_confirmed_at), isAdmin: admins.includes(user.id) };
                }) });
            }
            if (input.action === 'invite') {
                const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
                const name = typeof input.name === 'string' ? input.name.trim() : '';
                const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || name.length > 100 || phone.length > 30) return response(400, { error: 'ตรวจสอบชื่อ อีเมล และโทรศัพท์' });
                await backend.invite({ email, name, phone, redirectTo: siteUrl });
                return response(200, { ok: true });
            }
            if (input.action === 'delete') {
                if (typeof input.id !== 'string' || !uuid.test(input.id)) return response(400, { error: 'รหัสสมาชิกไม่ถูกต้อง' });
                if (input.id === actor.id || (await backend.adminIds([input.id])).includes(input.id)) return response(409, { error: 'ไม่สามารถลบบัญชีตนเองหรือผู้ดูแลได้' });
                await backend.delete(input.id);
                return response(200, { ok: true });
            }
            return response(400, { error: 'ไม่รู้จักคำสั่งนี้' });
        } catch (_) {
            return response(500, { error: 'ทำรายการไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าระบบหรือลองใหม่' });
        }
    };
}

export function createSupabaseBackend(client) {
    function data(result) { if (result.error) throw result.error; return result.data; }
    return {
        async getUser(token) { const result = await client.auth.getUser(token); return result.error ? null : result.data.user; },
        async adminIds(ids) { return data(await client.rpc('server_member_admin_ids', { member_ids: ids })); },
        async getProfiles(ids) { return data(await client.from('profiles').select('id,name,phone,consent_at').in('id', ids)); },
        async listUsers(page, perPage) { return data(await client.auth.admin.listUsers({ page, perPage })); },
        async invite({ email, name, phone, redirectTo }) { return data(await client.auth.admin.inviteUserByEmail(email, { redirectTo, data: { name, phone } })); },
        async delete(id) { return data(await client.auth.admin.deleteUser(id)); }
    };
}
