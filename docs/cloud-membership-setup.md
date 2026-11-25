# ตั้งค่าระบบสมาชิก MAXMUXSIX

กรอก Project URL และ Publishable key ของโปรเจกต์ `lxvxffrexegvqzeojztw` ใน `auth-config.js` แล้ว ติดตั้ง migration, `admin-users`, `SITE_URL` และ Auth URL บน Supabase จริงแล้ว แต่ **ยังไม่เปิดใช้งานครบวงจร**: เจ้าของยังต้องสมัครและรับสิทธิ์ผู้ดูแล รวมถึงเผยแพร่โค้ดเว็บก่อน ผู้ใช้เลือกไม่สร้างบริการ SMTP เพิ่ม จึงยังไม่รองรับอีเมลยืนยันถึงลูกค้าทั่วไป ร้าน ตะกร้า และระบบแจ้งโอนเดิมยังทำงานได้ ไม่ย้อนกลับไปใช้บัญชีใน localStorage

## 1. สร้างโปรเจกต์และตั้งค่า Auth

1. เข้า [Supabase Dashboard](https://supabase.com/dashboard) ด้วยบัญชีของเจ้าของร้าน เลือก New project ตั้งชื่อ MAXMUXSIX เลือก region ที่เหมาะสม เก็บรหัสฐานข้อมูลไว้ส่วนตัว ตรวจแผนบริการ/ค่าใช้จ่ายก่อนยืนยัน
2. Authentication → Providers เปิด Email และ **Confirm email** ห้ามปิดเพื่อแก้ปัญหาส่งอีเมล กำหนดรหัสผ่านขั้นต่ำ 8 ตัวอักษร
3. URL Configuration ตั้ง Site URL และเพิ่ม Redirect URL แบบเจาะจง:
   `https://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/`
   ไม่ใส่ wildcard ของเว็บไซต์อื่น ใช้ HTTPS จริง ไม่ใช้ไฟล์ `file://` สำหรับอีเมลยืนยัน/กู้รหัสผ่าน
4. ตั้ง Custom SMTP สำหรับลูกค้าจริง พร้อม From address และ DNS SPF/DKIM/DMARC ตามผู้ให้บริการ Supabase SMTP เริ่มต้นจำกัดผู้รับ/ปริมาณและไม่ใช่บริการ production ดู [เอกสาร SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
5. ปรับ Auth rate limits ให้เหมาะกับร้าน เปิดดู Auth logs เมื่อส่งเมลล้มเหลว ไม่พึ่ง browser rate limit เป็นมาตรการหลัก โค้ดชุดนี้ยังไม่ได้ใส่ CAPTCHA widget; ถ้าเปิด CAPTCHA ฝั่ง Supabase ต้องเพิ่ม widget และส่ง captchaToken ในเว็บด้วย มิฉะนั้นสมัคร/กู้รหัสผ่านจะถูกปฏิเสธ

Google Apps Script `/exec` เดิมส่งข้อความคำสั่งซื้อได้ แต่ไม่ใช่ SMTP สำหรับ Supabase Auth จึงไม่ได้เปลี่ยนหรือส่งรหัสผ่านผ่าน Apps Script อีเมลยืนยัน/เชิญ/กู้รหัสผ่านใช้ Supabase Auth เท่านั้น

## 2. สร้างตารางและนโยบาย

เปิด SQL Editor แล้วรันไฟล์ `supabase/migrations/202610120001_membership.sql` **หนึ่งครั้งบนโปรเจกต์ใหม่** หรือใช้ Supabase CLI migration workflow ถ้าเคยรันแล้วอย่ารันซ้ำ ตรวจ SQL errors ก่อนดำเนินการต่อ

- `auth.users`: บัญชีและ credentials จัดการโดย Supabase Auth
- `public.profiles`: ชื่อ โทรศัพท์ ที่อยู่ รหัสแนะนำเพื่อน การยอมรับเงื่อนไข อ่านได้เฉพาะเจ้าของผ่าน RLS ไม่เปิดให้ browser insert/update/delete
- `private.member_admins`: สิทธิ์ผู้ดูแล ไม่ expose schema นี้ผ่าน Data API
- `server_member_admin_ids`: RPC สำหรับ service_role เท่านั้น เพื่อ Edge Function ตรวจสิทธิ์ ไม่อนุญาต anonymous/member เรียก
- `is_member_admin`, `member_referral_count`, `accept_member_terms`: RPC สมาชิก ตรวจตาม `auth.uid()` ไม่มีพารามิเตอร์ user_id ให้สวมสิทธิ์

Migration ไม่ import บัญชี local เก่า และออกแบบสำหรับฐานข้อมูลใหม่ หากโปรเจกต์มี users/profiles เดิมต้องเตรียม migration เฉพาะก่อน ไม่วางทับข้อมูลเดิม

## 3. เชื่อมค่าที่เปิดเผยได้ในเว็บ

ใน Project settings / Connect หา **Project URL และ Publishable key** แล้วกรอก `auth-config.js`:

```js
window.MAXMUXSIX_AUTH_CONFIG = Object.freeze({
    url: 'https://YOUR_PROJECT_REF.supabase.co',
    publishableKey: 'sb_publishable_YOUR_PUBLIC_KEY',
    redirectUrl: 'https://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/'
});
```

สองค่านี้เป็น public config จึงเห็นได้ใน browser และ commit ได้ สิทธิ์ข้อมูลต้องคุมด้วย RLS ไม่ใช่การซ่อน public key ห้ามใส่ `service_role`, `sb_secret`, database password, access token หรือ SMTP password ลงไฟล์/แชต

รองรับ Supabase hosted URL `https://*.supabase.co` ถ้าใช้ custom domain หรือ self-hosted ต้องปรับ validation และ CSP connect-src ให้ตรง origin ที่ตั้งใจใช้งานก่อน

## 4. Deploy ฟังก์ชันจัดการผู้ใช้

ติดตั้ง [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) และ login ด้วยบัญชีเจ้าของโปรเจกต์ จากโฟลเดอร์ repo นี้:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set SITE_URL=https://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/
supabase functions deploy admin-users --project-ref YOUR_PROJECT_REF
```

`SUPABASE_URL` และ `SUPABASE_SERVICE_ROLE_KEY` เป็น environment มาตรฐานฝั่ง Edge Function ห้ามนำมาวางใน frontend ฟังก์ชันใช้ key นี้หลังจากตรวจ JWT กับ Auth.getUser และตรวจ profile/สิทธิ์ server แล้วเท่านั้น

ใน `supabase/config.toml` ตั้ง `verify_jwt=false` เพราะ handler ตรวจ user JWT เอง (รองรับ publishable key) ไม่ใช่ปล่อย anonymous ทำงาน ห้ามลบขั้นตอนตรวจ Auth/role ออกจาก handler ขา OPTIONS อนุญาตเฉพาะ origin จาก SITE_URL

## 5. ตั้งเจ้าของร้านเป็นผู้ดูแล

หลังใส่ config แล้วเปิดเว็บ สมัครบัญชีเจ้าของร้าน ยืนยันอีเมลและเข้าสู่ระบบ จากนั้น SQL Editor รัน (แทนอีเมลด้วยของเจ้าของจริง):

```sql
insert into private.member_admins(user_id)
select u.id from auth.users u join public.profiles p on p.id = u.id
where lower(u.email) = lower('OWNER_EMAIL_HERE')
  and u.email_confirmed_at is not null and p.consent_at is not null
on conflict (user_id) do nothing;
```

ตรวจว่าเพิ่มได้ 1 แถว ถ้า 0 แถวให้ตรวจอีเมล/confirmation/terms ไม่ตั้ง default admin และไม่ใช้ PIN 1234 ออกจากระบบแล้วเข้าระบบใหม่ ปุ่ม **จัดการสมาชิก** จะปรากฏบน desktop และเมนูมือถือ

## 6. วิธีใช้

- ลูกค้า: สมัคร → เปิดอีเมลยืนยัน → เข้าสู่ระบบด้วยอีเมล/รหัสผ่านจากเครื่องใดก็ได้
- ลืมรหัสผ่าน: เปิดฟอร์มสมาชิก → ลืมรหัสผ่าน → เปิดลิงก์ในอีเมล → ตั้งรหัสใหม่และยอมรับเงื่อนไข
- เพิ่มผู้ใช้: ผู้ดูแล → จัดการสมาชิก → ชื่อ/อีเมล/โทรศัพท์ → ส่งคำเชิญ → ผู้ใช้เปิดอีเมลแล้วตั้งรหัสผ่านเอง **ไม่ใช่บัญชีรหัสผ่านเริ่มต้น**
- ลบผู้ใช้: กดลบและยืนยันถาวร ระบบลบ Auth user และ profile แบบ cascade ห้ามลบตนเอง/บัญชีที่อยู่ในตารางผู้ดูแล หากต้องเปลี่ยนเจ้าของให้ดำเนินการผ่าน SQL Editor ที่ได้รับสิทธิ์ ไม่ทำผ่านเมนูลูกค้า
- ดูรายชื่อครั้งละ 25 คน ปุ่มก่อนหน้า/ถัดไป ข้อมูลผู้ใช้ไม่ถูกเก็บลงฐานสมาชิก localStorage
- ออกจากระบบออกเฉพาะ browser นี้ เหมาะกับการใช้หลายเครื่อง

การลบผู้ใช้ไม่รับประกันว่า JWT ที่เคยออกแล้วหมดอายุทันที แต่ฟังก์ชันตรวจ Auth และ role/profile ที่ยังมีอยู่ทุกคำขอ และ RLS profile ที่ถูกลบไม่มีแถวให้อ่าน ดู [User Management](https://supabase.com/docs/guides/auth/managing-user-data) ตั้ง JWT expiry ให้เหมาะสม และถ้าจะเพิ่มข้อมูลส่วนกลางใหม่ต้องออกแบบ policy รองรับการเพิกถอนด้วย

## 7. ข้อมูลเดิมและขอบเขตระบบ

บัญชี/รหัสผ่าน local เก่าไม่ใช่หลักฐานยืนยันตัวตน จึงไม่อัปโหลดและไม่ย้ายโดยอัตโนมัติ ให้เจ้าของสมัครใหม่และยืนยันอีเมลก่อน เว็บไม่อ่านหรือเขียน `maxmuxsix_users`/`maxmuxsix_active_user` อีก แต่ไม่ได้ลบข้อมูลเก่าจากเครื่องโดยไม่ได้ขออนุญาต

SDK เก็บ session token ใน browser เพื่อให้เข้าใช้งานต่อเนื่อง ไม่เก็บรหัสผ่านที่กรอกลง localStorage ข้อมูลโปรไฟล์เก็บใน Supabase ส่วน **สินค้า ตะกร้า คำสั่งซื้อ สลิป และกล่องอีเมลจำลองยังเป็นข้อมูลเฉพาะเครื่อง** การเข้าสู่ระบบจากเครื่องใหม่ไม่ได้ทำให้ข้อมูลเหล่านั้น sync และการลบบัญชีไม่ลบสำเนาคำสั่งซื้อที่เก็บในเครื่องหรืออีเมลที่ส่งออกไปแล้ว

การ reset ร้านเดิมรีเซ็ตเฉพาะข้อมูลในเครื่อง ไม่ลบสมาชิกส่วนกลาง โหมดแก้ไขสินค้าเดิมยังแก้ catalog เฉพาะเครื่อง ไม่ใช่ inventory กลาง

## 8. ทดสอบก่อนเปิดให้ลูกค้า

```powershell
npm ci --ignore-scripts
npm test
npm run build:auth
```

ใช้ Node.js 22 ขึ้นไป SDK ล็อก 2.117.3 และ bundle เก็บใน repo จึงไม่ต้องเปิด CDN ใน CSP ดู license ใน `assets/vendor/THIRD-PARTY-NOTICES.txt`

Unit tests ใช้ provider fixture; ฐานข้อมูลใช้ PGlite รัน PostgreSQL migration/RLS จริงแบบ local ไม่ได้ยืนยัน infrastructure Supabase/Deno/SMTP ของโปรเจกต์เจ้าของ

เช็กลิสต์หลัง deploy จริง (ยังไม่ได้ทดสอบกับบัญชี/อีเมลจริง):

1. Browser A สมัครและยืนยันอีเมลจริง Browser B/มือถือเข้าสู่บัญชีเดียวกันได้ และชื่อ/ที่อยู่ตรงกัน
2. รหัสผิด อีเมลยังไม่ยืนยัน และ session หมดอายุต้องไม่เข้าได้ ไม่แสดง PIN fallback
3. ลูกค้าอ่าน profile คนอื่นไม่ได้และเปิด admin function โดยตรงได้ 403; token ปลอม/ไม่มี token ได้ 401
4. เจ้าของร้านดูรายชื่อ เชิญอีเมลใหม่ ผู้รับตั้งรหัสผ่านและเข้าได้ ลองลืมรหัสผ่านทั้งบัญชีเดิมและอีเมลที่ไม่มีบัญชี
5. ลบ **บัญชีทดสอบที่อนุญาตให้ลบ** แล้ว login จากอีกเครื่องต้องถูกปฏิเสธ refresh profile เดิมต้องไม่เข้าได้ ตรวจ profiles ถูก cascade และผู้ดูแล/ตนเองลบไม่ได้
6. ปิด network ระหว่าง login/list/invite/delete ต้องแสดงข้อผิดพลาดและกดใหม่ได้ ไม่ค้างเป็นผู้ดูแล
7. ตรวจ Auth/Function logs, การส่งเมลจริง, รายการลูกค้าครบหลายหน้า, มือถือและคีย์บอร์ดก่อนเปิดบริการ

การทดสอบ browser แบบ provider จำลองอยู่ที่ `tests/browser/membership.cjs` ใช้ Playwright + Chrome และตัวแปร PLAYWRIGHT_MODULE เมื่อใช้ runtime ที่มีอยู่ ทดสอบ UI เท่านั้น ไม่ส่งเมล/ลบบัญชีจริง

## ผลตรวจในเครื่อง (12 ตุลาคม 2026)

- คงฟอร์ม/ฟอนต์/ธีมเขียวเข้ม–ส้มเดิม ไม่มีการเปลี่ยนแบรนด์หรือเพิ่มเอฟเฟกต์
- Node tests 189 ข้อผ่าน รวม PostgreSQL RLS, JWT/role/validation/protected deletion และ close/reopen race; build SDK ผ่าน
- Chrome headless 1440×1000 และ 390×844 ใช้ SDK ที่ bundle จริงและดัก HTTP ของ provider ด้วย fixture: สมัครรอยืนยัน, login, list/invite/delete, logout แยก browser context, ปฏิเสธลูกค้าจัดการผู้ใช้, URL invite/recovery ตั้งรหัสผ่าน, error/retry และเว็บที่ไม่มี config
- ตรวจ Tab/Shift+Tab focus containment และ Escape คืน focus, ไม่มี horizontal page overflow; ตารางสมาชิกเลื่อนด้านข้างได้ภายใน modal ตัวอักษรเนื้อหา/หัวข้อที่ตรวจมี contrast ต่ำสุด 7.60:1 ไม่ใช่ accessibility audit ทั้งเว็บ
- ภาพตรวจอยู่ใน tmp/membership-desktop.png และ tmp/membership-mobile.png เป็นบัญชี fixture ไม่มีข้อมูลลูกค้าจริง
- ยังไม่ตรวจ Supabase hosted project, Deno runtime/gateway จริง, SMTP deliverability, มือถือฮาร์ดแวร์จริงหรือการเข้าบัญชีข้ามเครื่องกับ backend จริง

## ผลเชื่อมต่อโปรเจกต์จริง (12 ตุลาคม 2026)

- องค์กร MAXMUXSIX, project ref `lxvxffrexegvqzeojztw`, region `ap-northeast-2`; ใช้โปรเจกต์ที่มีอยู่ ไม่ได้สร้างโปรเจกต์หรือแผนบริการใหม่
- ตรวจว่ามี Auth users 0 และ application tables 0 ก่อนติดตั้ง migration `maxmuxsix_cloud_membership` ผ่าน MCP สำเร็จ อย่ารัน migration แรกซ้ำ
- ยืนยัน `public.profiles` และ `private.member_admins` เปิด RLS, มี own-profile SELECT policy และ trigger สร้างโปรไฟล์ สมาชิกไม่มีสิทธิ์ UPDATE หรือเรียก RPC อ่านสิทธิ์ผู้ดูแล
- ทดสอบ PostgreSQL จริงด้วยบัญชี fixture สองบัญชีภายใน transaction: บัญชีแรกเห็นโปรไฟล์ตนเองเพียง 1 แถว และไม่ได้สิทธิ์ผู้ดูแล จากนั้น ROLLBACK; ตรวจยืนยัน Auth users/profiles กลับเป็น 0 ไม่เหลือบัญชีทดสอบ และไม่ส่งอีเมล
- HTTP จริง: `/auth/v1/settings` ตอบ 200, เปิด email signup และ `mailer_autoconfirm=false`; anonymous GET profiles ตอบ 401 permission denied ตามที่ต้องการ ห้ามเพิ่ม GRANT ให้ anon ตามข้อความแนะนำทั่วไปจาก API
- ใส่เฉพาะ Project URL/Publishable key ใน public config ไม่อ่านหรือบันทึก server secret
- Security advisor: private admin table ไม่มี policy โดยตั้งใจ (client deny-all); RPC สมาชิก 3 รายการใช้ SECURITY DEFINER โดยตั้งใจ ตรวจ `auth.uid()` และกำหนด search_path ว่าง อีกคำเตือนเป็น event-trigger function `public.rls_auto_enable()` ที่แพลตฟอร์มมีอยู่เดิม ยังไม่ได้แก้ไขสิทธิ์ส่วนนี้ ดู [advisor สำหรับ anonymous definer](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- Performance advisor แจ้ง referred_by index ยังไม่ถูกใช้ เนื่องจากยังไม่มีสมาชิก ไม่ลบดัชนีที่จำเป็นต่อ referral lookup
- Browser fixtures override config เสมอ รวมกรณีไม่มี config และบล็อก network ไปยัง hosted Supabase อื่น เพื่อไม่ส่งข้อมูล fixture ไปโปรเจกต์จริงหลังกรอก config
- เจ้าของเข้าสู่ Dashboard และยืนยัน URL โดยตรงแล้ว ตั้ง Site URL และ Redirect URL แบบเจาะจงเป็น `https://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/` (1 รายการ ไม่มี wildcard), บันทึกนโยบายรหัสผ่านขั้นต่ำ 8 ผ่าน UI และคง Confirm email เปิดไว้
- สร้างค่า `SITE_URL` ผ่าน Dashboard แล้ว deploy `admin-users` version 1 สถานะ ACTIVE ด้วย MCP; `verify_jwt=false` โดยตรวจ Auth.getUser และสิทธิ์ private role ใน handler ทุกคำขอ ไม่ใช่ anonymous admin
- ทดสอบ Edge Function บน Deno/gateway จริง: origin เว็บที่อนุญาต OPTIONS=204, anonymous POST=401, token ปลอม POST=401, origin อื่น POST=403 ไม่มีการเพิ่ม/ลบผู้ใช้หรือส่งอีเมลจริง
- ผู้ใช้แจ้ง "ไม่ต้องสร้าง" บริการส่งเมลเพิ่ม จึงไม่เปิด Custom SMTP ไม่สมัครบริการ และไม่ปิด Confirm email เพื่อหลบข้อจำกัด Default SMTP ส่งอีเมลได้เฉพาะอีเมลในทีมโปรเจกต์ จึงยังไม่พร้อมรับสมัครลูกค้าทั่วไป ดู [ข้อจำกัด SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- ยังไม่ให้สิทธิ์เจ้าของ (ไม่มีบัญชีที่สมัคร/ยืนยันผ่านเว็บ), ยังไม่ทดสอบ login ข้ามเครื่องกับบัญชีจริงหรืออีเมลยืนยัน/เชิญ/กู้รหัสผ่านจริง โค้ดเว็บอยู่สาขา `codex/cloud-membership` ต้องนำเข้า deployment branch ก่อนเว็บไซต์จริงจะเปลี่ยนตาม
- ทดสอบล่าสุดในเครื่อง: npm test 189 ผ่าน, build SDK ผ่าน, browser HTTP fixture 95 requests ผ่านที่ 1440/390px; แยกจากผลทดสอบ hosted API ข้างต้น หลักฐาน Dashboard อยู่ `tmp/supabase-url-configuration.png`
