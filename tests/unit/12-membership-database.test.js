const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
let db;
const buyer = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
before(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}', email_confirmed_at timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated, anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;`);
    await db.exec(fs.readFileSync(path.join(__dirname, '../../supabase/migrations/202610120001_membership.sql'), 'utf8'));
    await db.query(`INSERT INTO auth.users VALUES ($1,'buyer@example.com','{"name":"Buyer","consent":true,"role":"admin"}',now()), ($2,'other@example.com','{"name":"Other"}',now())`, [buyer, other]);
});
after(async () => { if (db) await db.close(); });
async function asRole(role, id, sql) {
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [id || '']);
    await db.exec(`SET ROLE ${role}`);
    try { return await db.query(sql); } finally { await db.exec('RESET ROLE'); }
}
test('authenticated reader sees own central profile, not other members', async () => {
    const result = await asRole('authenticated', buyer, 'SELECT id,name,consent_at FROM public.profiles');
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].id, buyer);
    assert.equal(result.rows[0].name, 'Buyer');
    assert.ok(result.rows[0].consent_at);
});
test('anonymous visitor cannot enumerate profiles', async () => {
    await assert.rejects(asRole('anon', null, 'SELECT * FROM public.profiles'), /permission denied/);
});
test('metadata role does not grant admin and clients cannot assign private roles', async () => {
    assert.equal((await asRole('authenticated', buyer, 'SELECT public.is_member_admin() AS allowed')).rows[0].allowed, false);
    await assert.rejects(asRole('authenticated', buyer, `INSERT INTO private.member_admins VALUES ('${buyer}')`), /permission denied/);
    await assert.rejects(asRole('authenticated', buyer, `UPDATE public.profiles SET consent_at=now()`), /permission denied/);
    await assert.rejects(asRole('authenticated', buyer, `SELECT public.server_member_admin_ids(ARRAY['${buyer}']::uuid[])`), /permission denied/);
});
test('server role assignment requires accepted terms, and revocation removes access', async () => {
    await db.query('INSERT INTO private.member_admins VALUES ($1)', [other]);
    assert.equal((await asRole('authenticated', other, 'SELECT public.is_member_admin() AS allowed')).rows[0].allowed, false);
    await asRole('authenticated', other, 'SELECT public.accept_member_terms()');
    assert.equal((await asRole('authenticated', other, 'SELECT public.is_member_admin() AS allowed')).rows[0].allowed, true);
    await db.query('DELETE FROM private.member_admins WHERE user_id=$1', [other]);
    assert.equal((await asRole('authenticated', other, 'SELECT public.is_member_admin() AS allowed')).rows[0].allowed, false);
});
test('invited verified owner accepts terms for self only', async () => {
    await asRole('authenticated', other, 'SELECT public.accept_member_terms()');
    assert.ok((await db.query('SELECT consent_at FROM public.profiles WHERE id=$1', [other])).rows[0].consent_at);
    await assert.rejects(asRole('anon', null, 'SELECT public.accept_member_terms()'), /permission denied/);
});
test('referral counts only verified registrations, without exposing referred accounts', async () => {
    const code = (await db.query('SELECT referral_code FROM public.profiles WHERE id=$1', [buyer])).rows[0].referral_code;
    assert.match(code, /^MAX[A-F0-9]{8}$/);
    const id = '33333333-3333-4333-8333-333333333333';
    await db.query('INSERT INTO auth.users VALUES ($1,$2,$3,null)', [id, 'referred@example.com', JSON.stringify({ name: 'Referred', referrer_code: code, consent: true })]);
    assert.equal((await asRole('authenticated', buyer, 'SELECT public.member_referral_count() AS n')).rows[0].n, 0);
    await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1', [id]);
    assert.equal((await asRole('authenticated', buyer, 'SELECT public.member_referral_count() AS n')).rows[0].n, 1);
    await db.query('DELETE FROM auth.users WHERE id=$1', [id]);
    assert.equal((await db.query('SELECT id FROM public.profiles WHERE id=$1', [id])).rows.length, 0);
});

test('deleting Auth account removes its central profile and assigned admin role', async () => {
    const id = '44444444-4444-4444-8444-444444444444';
    await db.query(`INSERT INTO auth.users VALUES ($1,'delete@example.com','{"name":"Delete","consent":true}',now())`, [id]);
    await db.query('INSERT INTO private.member_admins VALUES ($1)', [id]);
    await db.query('DELETE FROM auth.users WHERE id=$1', [id]);
    assert.equal((await db.query('SELECT id FROM public.profiles WHERE id=$1', [id])).rows.length, 0);
    assert.equal((await db.query('SELECT user_id FROM private.member_admins WHERE user_id=$1', [id])).rows.length, 0);
    assert.equal((await asRole('authenticated', id, 'SELECT public.is_member_admin() AS allowed')).rows[0].allowed, false);
});
