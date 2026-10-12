# คู่มือเปิดใช้และย้อนกลับ Apps Script Auth Email

ขอบเขต: MAXMUXSIX project `lxvxffrexegvqzeojztw` เท่านั้น ใช้ Send Email Hook → Edge Function → Apps Script MailApp แบบรอผลส่ง ห้ามนำไฟล์นี้ไปแทน `google_apps_script.js` หรือ deployment `/exec` ของคำสั่งซื้อเดิม ไม่ใช้ SMTP และไม่แก้ frontend/schema/บัญชีลูกค้า

## สถานะและ gate ณ 2026-10-12

Local implementation ผ่าน Node 321/321 และ real Deno 4/4 พร้อม typecheck ตามรายงาน Task 3 แล้ว การทดสอบ Deno ใช้ library จริงและ fixture network; ไม่ได้ส่งเมลหรือพิสูจน์ hosted runtime ผู้ทำ rollout ต้องรันคำสั่งตรวจซ้ำด้านล่างก่อน deploy

Controller ตรวจแบบ read-only พบ Google/Supabase login แล้ว, Auth Hooks ว่าง, Confirm Email ON, Secure Email Change ON, OTP 8 หลัก อายุ 3600 วินาที และ Site URL/redirect เป็น URL ที่อนุมัติด้านล่าง ยังไม่มีการ deploy Auth mail, ส่งเมล, สมัคร/กู้บัญชีทดสอบ หรือเปิด hook จากงาน local นี้ ต้องอ่าน hosted settings ซ้ำก่อนเขียนจริงและเก็บ prior state ส่วนตัว

ผู้ใช้อนุมัติสูงสุด **6 เมล** ไป mailbox ที่ควบคุมเอง รวม plus alias สำหรับบัญชีทดสอบ: signed relay probes 4 ฉบับ + signup 1 + recovery 1 ห้ามบันทึกที่อยู่จริงใน Git/รายงานสาธารณะ ข้อความ/คำสั่งในคู่มือนี้เป็นขั้นตอนให้ controller ทำหลัง independent review และ security authorization; ไม่ใช่หลักฐานว่าได้ทำ hosted แล้ว ก่อนกดปุ่มบันทึก secret, OAuth consent, Deploy หรือเปิด/ปิด hook ใน browser ให้ยืนยันเป้าหมายและการกระทำกับผู้ใช้ ณ ตอนนั้นตาม gate ของ controller

## ค่าตั้งและที่เก็บ

| ชื่อ | เก็บที่ | ค่า/เงื่อนไข |
| --- | --- | --- |
| `AUTH_RELAY_SECRET` | GAS Project Settings → Script Properties | secret ใหม่สุ่ม 32 bytes แปลง base64 เป็นข้อความ; ไม่ใช่ token คำสั่งซื้อเดิม |
| `AUTH_SENT_INDEX` | Script Properties | handler สร้าง/ดูแลเอง; ไม่ต้องสร้างหรือเคลียร์ด้วยมือ |
| `AUTH_GAS_RELAY_SECRET` | Supabase Edge Function Secrets | ข้อความเดียวกับ `AUTH_RELAY_SECRET` ทุก byte; HMAC ใช้ UTF-8 ของข้อความ ไม่ decode base64 |
| `AUTH_GAS_URL` | Supabase Edge Function Secrets | URL deployment ใหม่รูป `https://script.google.com/macros/s/<deployment-id>/exec` ไม่มี query/hash/custom port |
| `SEND_EMAIL_HOOK_SECRET` | Supabase Edge Function Secrets | signing secret อีกตัวจาก Supabase รูป `v1,whsec_<base64>`; ใช้ค่าเดียวกับ Send Email Hook ทุก byte |
| `SITE_URL` | Supabase Edge Function Secrets | `https://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/` ต้องตรงรวม `/` ท้าย |

Endpoint hook คือ `https://lxvxffrexegvqzeojztw.supabase.co/functions/v1/send-auth-email` และ project URL ในโค้ดตรึงเป็น `https://lxvxffrexegvqzeojztw.supabase.co` ไม่ตั้ง service-role key สำหรับ runbook นี้ Gateway JWT ปิดเฉพาะ function ใหม่นี้ตาม `supabase/config.toml`; ทุก POST ยังต้องผ่าน Standard Webhooks signature ห้ามใช้ publishable key แทนลายเซ็น ห้ามนำ secret ไปใส่ frontend, source, query string, shell arguments, transcript หรือ screenshots

## 1. ตรวจ local และจด prior state ส่วนตัว

รันจาก repository/worktree ที่มี commit Task 1–3 และ Node/npm พร้อม dependencies ติดตั้งแล้ว:

```powershell
npm test
npm exec --yes --package=deno@2.9.6 -- deno check --no-lock supabase/functions/send-auth-email/index.ts
npm exec --yes --package=deno@2.9.6 -- deno test --no-lock tests/runtime/auth-email-webhook.test.ts
git diff --check
git diff 9e4d50d -- google_apps_script.js tests/unit/06-google-apps-script.test.js index.html assets/js
```

ต้องได้ Node 321 passed/0 failed, Deno 4 passed/0 failed, typecheck exit 0, whitespace check exit 0 และ diff สุดท้ายว่าง (baseline `9e4d50d` คือแผนก่อน implementation) ถ้า Deno/dependencies เข้าถึงไม่ได้ ให้หยุดก่อน hosted activation ไม่ทดแทนด้วย mock อย่างเดียว Controller ต้องตรวจ security โดยเฉพาะ frontend secrets, unsigned paths, URL/redirect allowlist และ response/PII logs ก่อน rollout

ใน Supabase project ที่ระบุ อ่าน Auth → Hooks และ URL Configuration/Email settings ซ้ำ เก็บ prior hook enabled state, URI และ signing secret ที่เกี่ยวข้องใน private operator record/password manager เท่านั้น ถ้า hook ว่าง ให้บันทึกว่า rollback คือ disable/remove hook ใหม่นี้ ตรวจและคง Confirm Email, Secure Email Change, OTP length/expiry, Site URL และ redirect allowlist เดิม เก็บ deployment ID/version ใหม่ไว้ใน private operator record โดยไม่บันทึก token/เมล/body เก็บสถานะ order deployment เดิมเพื่อใช้ตรวจว่าไม่ได้แก้

## 2. สร้าง GAS project แยกและอนุญาตแบบส่วนตัว

1. ในบัญชี Google เจ้าของ mail quota เปิด [Apps Script](https://script.google.com/) → New project ตั้งชื่อ `MAXMUXSIX Auth Mail` สร้างไฟล์ script ด้วยเนื้อหา **ทั้งไฟล์** `google_auth_apps_script.js` จาก commit ที่รีวิวแล้ว บันทึกและตรวจว่าเป็น project ใหม่ ไม่มี trigger/testRun/โค้ดสั่งส่งเมลเพิ่มเติม
2. ผู้ใช้สร้าง relay secret ใหม่ใน PowerShell ส่วนตัวที่ไม่ได้เปิด transcript/แชร์หน้าจอ คำสั่งนี้คัดลอก secret เข้า clipboard และไม่แสดงค่า ให้ผู้ใช้ paste ลง Script Properties `AUTH_RELAY_SECRET` และ Supabase Edge Function Secrets `AUTH_GAS_RELAY_SECRET` โดยตรง จากนั้นล้าง clipboard ห้ามให้ agent อ่านค่าจาก clipboard:

   ```powershell
   $authRelayBytes = New-Object byte[] 32
   $authRelayRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
   try {
       $authRelayRng.GetBytes($authRelayBytes)
       Set-Clipboard -Value ([Convert]::ToBase64String($authRelayBytes))
   } finally {
       $authRelayRng.Dispose()
       [Array]::Clear($authRelayBytes, 0, $authRelayBytes.Length)
   }
   Remove-Variable authRelayBytes, authRelayRng
   ```

   หลังผู้ใช้ paste ในช่องตั้งค่าทั้งสองที่และบันทึกแล้ว จึงรัน cleanup แยกครั้งนี้:

   ```powershell
   Set-Clipboard -Value ''
   ```

3. Deploy → New deployment → Web app, Execute as **Me/owner**, Who has access **Anyone** (anonymous callers ต้องเข้าถึงได้; application ตรวจ HMAC เอง) ไม่ใช้ `Anyone with Google account` หรือ `/dev` ผู้ใช้ตรวจ project/owner/access แล้วกด Deploy และ OAuth consent ด้วยตนเอง ให้สิทธิ์ MailApp scope `https://www.googleapis.com/auth/script.send_mail` แบบส่วนตัว การอนุญาตไม่ใช่การส่งเมล หากไม่เห็นสิทธิ์นี้/consent ไม่ครบ ให้หยุด ไม่เพิ่ม helper ที่ส่ง MailApp ตรงเพื่อทดสอบ
4. ถ้าต้องอนุญาตก่อน deploy สามารถเลือก `doGet` → Run ใน editor เพื่อเข้าสู่ consent flow ของ project ได้; `doGet` ไม่ส่งเมล จากนั้นตรวจ consent/deployment อีกครั้ง โค้ดมี MailApp calls จึงต้องได้รับ mail scope สำหรับ owner ก่อน probes
5. คัดลอก URL `/exec` ใหม่ไป Edge Secret `AUTH_GAS_URL` ส่วนตัว เก็บ URL/version ใน private operator record ตรวจ read-back ว่า secret property name ถูกต้องโดยไม่เปิดเผยค่า `doGet` ส่งเพียง `{"service":"MAXMUXSIX Auth Mail"}` ไม่เปิด quota/secrets หาก Google Workspace ห้าม Anyone หรือ owner ไม่สามารถอนุญาต MailApp ให้หยุด gate นี้

MailApp ใช้ชื่อผู้ส่ง `MAXMUXSIX` แต่ไม่ได้สร้างโดเมนส่งใหม่ การยอมรับส่งไม่เท่ากับ inbox receipt โควตานับตาม recipient และแชร์กับ script/deployment อื่นในบัญชีเดียวกัน การแยก project ไม่เพิ่มโควตา ค่า quota เปลี่ยนได้ระหว่าง execution; ดูข้อจำกัดล่าสุดใน [Google quotas](https://developers.google.com/apps-script/guides/services/quotas) แทนการสมมุติตัวเลขคงที่

## 3. ตั้ง Edge secrets และ deploy ขณะ hook ปิด

ใน Supabase project → Edge Functions → Secrets ใส่ค่าทั้งสี่จากตาราง โดยผู้ใช้กรอกค่าลับเอง ตั้ง `SITE_URL` ตามค่าตรึง ใช้ signing secret แยกจาก relay secret: Auth → Hooks → Send Email Hook เตรียม URI และ Generate secret แล้วคัดลอกค่ารูป `v1,whsec_...` ไป `SEND_EMAIL_HOOK_SECRET` แบบส่วนตัว **ยังไม่ enable/save เป็น active hook** หาก UI ไม่อนุญาตเตรียม secret โดยปิดอยู่ ให้หยุดและให้ controller เลือกวิธีตั้งค่าที่ตรวจได้ก่อน; ห้ามเปิด hook ชั่วคราวเพื่ออ่านค่า

ถ้ามี Supabase CLI ที่ login/ได้รับสิทธิ์ project นี้แล้ว ตรวจ version/help และ deploy เฉพาะ function ใหม่ (ไม่ deploy ทั้ง project):

```powershell
supabase --version
supabase functions deploy --help
supabase functions deploy send-auth-email --project-ref lxvxffrexegvqzeojztw --no-verify-jwt
```

ถ้าไม่มี CLI ใช้ Supabase Dashboard deployment flow ที่ controller ตรวจแล้วสำหรับ function เดียวกัน พร้อมไฟล์ `index.ts`, `relay.mjs`, `messages.mjs` และ dependency `npm:standardwebhooks@1.1.1` อย่าสมมุติ API/browser control ที่ยังไม่ได้ตรวจ หลัง deploy อ่านกลับว่า Send Email Hook ยัง disabled/ไม่มี active configuration และ Edge function/environment ชี้ project/URL ที่ระบุ Deployment เพียงอย่างเดียวไม่ใช่ผลทดสอบส่งเมล

## 4. Signed relay probes: ไม่เกิน 4 เมล ก่อนเปิด hook

ใช้ mailbox ที่ผู้ใช้อนุมัติแล้วจริงและ fresh event IDs เท่านั้น ชุด probes ใช้ `reauthentication` fixture `00000000` ที่ **ไม่ใช่ Auth OTP จริง** ไม่มี verification URL และระบุ `[TEST ONLY]` ในคำทักทาย โค้ด template เป็น subject คงที่ จึงไม่แก้ subject ผ่าน payload ห้ามสร้าง fake working token หรือใช้บัญชีจริง/ลิงก์จาก inbox มาทดสอบ fixture

คำสั่งต่อไปนี้พร้อมรันใน private PowerShell จาก repository หลังตั้งค่าจริงและผ่าน gate แล้ว แต่คู่มือไม่ได้รันคำสั่งนี้อัตโนมัติ ตัวแปร `AUTH_TEST_RECIPIENT` คือ mailbox ที่อนุมัติ ไม่ commit ค่า; `AUTH_PROBE_MODE` เลือก `negative` (ไม่ส่งเมล) หรือ `send` (1 เมลต่อการรัน) และ `AUTH_PROBE_LABEL` เป็น `first`, `warm1`, `warm2`, `idle` ตามลำดับ:

```powershell
$env:AUTH_TEST_RECIPIENT = Read-Host 'Approved controlled mailbox (private)'
$env:AUTH_PROBE_MODE = 'negative'
$env:AUTH_PROBE_LABEL = 'negative'
$authHookSecure = Read-Host 'SEND_EMAIL_HOOK_SECRET (private)' -AsSecureString
$authHookPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($authHookSecure)
try {
    $env:AUTH_PROBE_HOOK_SECRET = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($authHookPointer)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($authHookPointer)
    Remove-Variable authHookSecure, authHookPointer
}
```

รัน block นี้ครั้งแรกใน mode `negative` ตรวจว่าได้ 401 ทั้ง unsigned/tampered/stale/future และ 400 สำหรับ signed malformed action โดยไม่เกิด mail/ledger entry จาก event IDs เหล่านั้น ตรวจ GAS Executions/ledger แบบส่วนตัวและให้ผู้ใช้ยืนยันไม่มีเมลในช่วงนั้น ผล inbox อย่างเดียวไม่พิสูจน์ no-send; local Node/Deno negative tests ยืนยัน zero upstream calls เพิ่มเติม ถ้า status ไม่ตรงให้หยุดก่อน probes ที่ส่งจริง ห้าม dump response/body/logs ทั้งก้อน:

```powershell
@'
import { Webhook } from 'standardwebhooks';
import { randomUUID } from 'node:crypto';
const endpoint = 'https://lxvxffrexegvqzeojztw.supabase.co/functions/v1/send-auth-email';
const site = 'https://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/';
const secret = process.env.AUTH_PROBE_HOOK_SECRET;
const recipient = process.env.AUTH_TEST_RECIPIENT;
const mode = process.env.AUTH_PROBE_MODE;
const label = process.env.AUTH_PROBE_LABEL;
if (!secret?.startsWith('v1,whsec_') || !recipient || !['negative','send'].includes(mode) ||
    !['negative','first','warm1','warm2','idle'].includes(label)) {
  throw new Error('Private probe configuration is incomplete.');
}
const verifier = new Webhook(secret.slice(3));
const fixture = {
  user: { email: recipient, user_metadata: { full_name: '[TEST ONLY] relay probe; 00000000 is not an Auth code' } },
  email_data: { email_action_type: 'reauthentication', token: '00000000', redirect_to: site, site_url: site }
};
async function probe(kind, expected) {
  const eventId = `probe_${kind}_${randomUUID().replaceAll('-','')}`;
  const time = new Date(Date.now() + (kind === 'stale' ? -600000 : kind === 'future' ? 600000 : 0));
  const raw = JSON.stringify(kind === 'invalid' ? {
    ...fixture, email_data: { ...fixture.email_data, email_action_type: 'invalid_test_action' }
  } : fixture);
  const headers = { 'Content-Type': 'application/json', 'webhook-id': eventId,
    'webhook-timestamp': String(Math.floor(time.getTime()/1000)),
    'webhook-signature': verifier.sign(eventId, time, raw) };
  if (kind === 'unsigned') delete headers['webhook-signature'];
  const body = kind === 'tampered' ? raw + ' ' : raw;
  const started = performance.now();
  let result;
  try {
    const response = await fetch(endpoint, { method: 'POST', headers, body,
      redirect: 'error', signal: AbortSignal.timeout(5000) });
    const text = await response.text();
    result = { eventId, kind, status: response.status, totalMs: Math.round(performance.now()-started) };
    let json; try { json = JSON.parse(text); } catch { throw new Error('Unexpected response format; stop.'); }
    console.log(JSON.stringify(result));
    if (response.status !== expected || (expected === 200 &&
        (!json || Array.isArray(json) || Object.keys(json).length !== 0 || result.totalMs >= 3500))) {
      throw new Error('Probe gate failed; stop, do not retry.');
    }
  } catch {
    throw new Error('Probe failed or delivery is unknown; stop, do not retry.');
  }
}
if (mode === 'negative') {
  for (const kind of ['unsigned','tampered','stale','future']) await probe(kind, 401);
  await probe('invalid', 400);
} else {
  await probe(label, 200); // Exactly one delivery attempt; no retry loop.
}
'@ | node --input-type=module
```

`negative` ไม่ถึง GAS จึงไม่อุ่น Apps Script sender หลัง negative checks ผ่านแล้ว ให้ตั้ง `$env:AUTH_PROBE_MODE = 'send'` และ label `first` แล้วรัน block เดิม **ครั้งเดียว** ตรวจเวลา/log/receipt ให้ผ่านก่อน `warm1` และ `warm2` อย่างละหนึ่งครั้ง จากนั้นหยุดส่งอย่างน้อย 15 นาทีโดยไม่ ping sender แล้วรัน `idle` ครั้งเดียว จด idle interval จริง; การเว้นช่วงไม่ได้รับประกัน cold start ห้ามนำข้อสังเกตสี่ครั้งไปอ้าง worst-case/SLA หากรันไม่สำเร็จห้ามกดซ้ำอัตโนมัติ การ retry/ส่งเพิ่มต้องขอผู้ใช้ใหม่เพราะอาจส่งแล้วและนับรวม budget

สำหรับแต่ละครั้งจดเฉพาะ event ID, label/action, status, external totalMs, relay durationMs และผู้ใช้ยืนยัน receipt (yes/no/pending) ใน private operator record: ต้องได้ HTTP 200 `{}`, client end-to-end total **<3500 ms** (จึงผ่านเป้า total <4500 ms ด้วย) และ relay `durationMs` **<3500 ms** ทุกครั้ง หา relay log จาก Edge Function Logs โดย event ID แล้วคัดเฉพาะ `status`, `durationMs`, `eventId`; ไม่เก็บ request/body/signature/recipient/token

โค้ดปัจจุบันไม่เผย upstream HTTP status หรือ duration แยก span: 200 `{}` ยืนยันว่า relay ตรวจ upstream HTTP success + JSON `success:true` + eventId ตรงแล้ว แต่ไม่ใช่ numeric upstream status ที่สังเกตโดยตรง ค่า client total ครอบคลุมทั้ง request/response และเวลา relay/upstream จึงใช้เป็น conservative upper bound เมื่อไม่มี upstream telemetry แยก ส่วน relay durationMs ครอบคลุม read/verify/sign/fetch/redirect/parse เกณฑ์ client <3500 ms นี้เข้มกว่าเป้า total เดิมและอาจปฏิเสธเส้นทางที่ upstream ผ่านได้ แต่ไม่ผ่อน spec ห้ามกรอก upstream timing/status ที่วัดไม่ได้ หาก log ไม่มี/จับคู่ไม่ได้ ให้ถือ timing gate ยังไม่ผ่าน

หลัง probes เสร็จหรือล้มเหลว ล้างค่าจาก shell ส่วนตัว:

```powershell
Remove-Item Env:AUTH_PROBE_HOOK_SECRET -ErrorAction SilentlyContinue
Remove-Item Env:AUTH_TEST_RECIPIENT -ErrorAction SilentlyContinue
Remove-Item Env:AUTH_PROBE_MODE -ErrorAction SilentlyContinue
Remove-Item Env:AUTH_PROBE_LABEL -ErrorAction SilentlyContinue
```

## 5. เปิด hook และทดสอบ signup/recovery จริงอีก 2 เมล

เปิดได้เมื่อ review/security authorization, Google consent, deployment, negative tests และ probes/receipt ทั้งสี่ผ่านครบ Controller ตรวจ URI/signing-secret association และยืนยัน action กับผู้ใช้ก่อนกด enable/save Send Email Hook ที่ endpoint ระบุ อ่านกลับ enabled state อีกครั้ง คง Confirm Email ON, Secure Email Change ON และ URL/OTP settings เดิม ไม่แก้ account ที่มีอยู่

1. ผู้ใช้เลือก plus alias ใหม่ที่ควบคุมและยินยอมสมัคร แล้วสร้างรหัสผ่าน/ยอมรับเงื่อนไขด้วยตนเองในหน้า signup ของ [เว็บที่อนุมัติ](https://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/) ผ่าน private browser session เปิดบัญชีสมาชิก → สมัครสมาชิกใหม่ → กรอกฟอร์ม/consent → สมัครสมาชิกและยืนยันอีเมล Controller ไม่สร้างรหัสผ่านแทนหรือรับรหัสในแชต ส่ง signup **ครั้งเดียว** (เมลที่ 5) ห้าม resend อัตโนมัติ
2. ผู้ใช้ยืนยัน receipt แล้วเปิด link ส่วนตัว ตรวจ host/project ของ Auth verify และ redirect กลับ approved URL, login/session สำเร็จ ตรวจ identity ผ่าน Supabase `auth.getUser()` ใน flow ของแอป/หน้าที่เชื่อม session แล้ว ไม่เชื่อเพียง localStorage หรือ UI label และตรวจ profile ของ user ID เดียวกันภายใต้สิทธิ์บัญชีทดสอบ จดเพียง match yes/no ไม่คัดลอก JWT, URL fragment/query, email หรือ profile PII หากยังไม่มีทางตรวจ authenticated identity/profile ที่เชื่อถือได้ ให้หยุด gate ไม่อ้าง E2E ผ่าน
3. ในหน้าเข้าสู่ระบบ → ลืมรหัสผ่าน? → กรอก alias ใหม่นี้ → ส่งลิงก์ตั้งรหัสผ่านใหม่ **ครั้งเดียว** (เมลที่ 6) ผู้ใช้เปิด link, กรอกรหัสผ่านใหม่/ยืนยัน/consent และกดบันทึกรหัสผ่านแบบส่วนตัว จากนั้น login ใหม่และตรวจ authenticated identity/profile match เช่นเดิม หากต้องการทดลอง login failure ก่อนยืนยันหรือขั้นตอนอื่นที่เสี่ยงส่งเพิ่ม ให้ controller ตรวจ mail budget ก่อน
4. จด signup/recovery status, timing ที่สังเกตได้, receipt, private link completion และ identity/profile match แยกกัน ไม่เก็บ token/password/header/body Existing customer accounts ไม่ถูกเปลี่ยน/ลบ; บัญชีทดสอบใหม่ไม่ถูกลบอัตโนมัติ

สำหรับ frontend version นี้ `membership.refresh()` ใน `assets/js/cloud-auth.js` เรียก `auth.getUser()` แล้วอ่าน `profiles` ด้วย user ID และบังคับ profile.id ตรงกันก่อนคืน state ผู้ใช้/ผู้ปฏิบัติงานที่ตรวจ source version แล้วสามารถรัน snippet นี้ใน private DevTools Console หลัง login ได้เพื่อจดเฉพาะ boolean (ไม่พิมพ์ `membership.refresh()` เดี่ยว ๆ ซึ่งอาจแสดงข้อมูลผู้ใช้):

```javascript
void (async () => {
  const expectedAlias = prompt('Approved test alias (private; do not record)');
  if (!expectedAlias || typeof membership === 'undefined' || !membership?.configured) {
    throw new Error('Authenticated verification is unavailable.');
  }
  const verified = await membership.refresh();
  const match = Boolean(verified.user && verified.user.email.toLowerCase() === expectedAlias.trim().toLowerCase());
  console.info(JSON.stringify({ authenticatedProfileMatch: match }));
})().catch(() => console.info(JSON.stringify({ authenticatedProfileMatch: false })));
```

หาก hosted frontend source ไม่ตรง contract นี้ ให้หยุด identity gate และให้ controller ตรวจ read-only ต่อ ไม่ใช้ snippet เป็นการสมมุติ API ถ้าหน้า signup/recovery ไม่มีหรือ link flow ไม่ทำงาน ให้ rollback ไม่ขยายงานไปแก้ frontend หรือสร้างบัญชีด้วย service-role API เงียบ ๆ หลังครบ 6 ฉบับต้องขออนุมัติใหม่ก่อนส่งเพิ่ม การไม่ได้เห็น error ไม่ใช่หลักฐาน receipt/link completion

## ขีดจำกัดและเหตุที่ต้องหยุด

- HTTP Auth Hook มีเพดาน 5 วินาที; relay ใช้ deadline เดียว 3500 ms ครอบคลุมการอ่านคำขอ, verify, HMAC, Google redirects และ response การยกเลิกฝั่ง client ไม่ถอน MailApp ที่อาจยอมรับส่งไปแล้ว ไม่มี background acknowledgement/queue หรือ automatic retry
- GAS รับ envelope ไม่เกิน 32 KiB, payload version 1, 1–2 single-recipient messages และ timestamp ±300 วินาที HMAC-SHA256/base64 ครอบ `${timestamp}.${eventId}.${payload}` ด้วย exact payload string ไม่รับ arbitrary unsigned MailApp shortcut
- Ledger เก็บ event ID + payload digest + slots ที่ยอมรับส่งแล้ว; 24 ชั่วโมงนับจากการยอมรับล่าสุด จำกัด 100 events และ serialized UTF-8 **ต่ำกว่า 8192 bytes** ซึ่งอาจเต็มก่อน 100 รายการ ไม่เก็บที่อยู่/body/token Active entries ไม่ถูกไล่ทิ้งเพื่อเพิ่มที่ว่าง; ledger เสีย/เต็ม/เขียนไม่ได้ก่อนส่ง จะ fail closed
- เรียกซ้ำจากภายนอกด้วย event ID และ payload เดิมข้าม slot ที่บันทึกแล้วและอาจส่งเฉพาะ slot ที่ขาด (email change) payload ต่างบน ID เดิมถูกปฏิเสธ หลัง ledger หมดอายุคำขอใหม่ที่ลงลายเซ็นสดอาจส่งได้อีก จึงไม่มี exactly-once guarantee
- Crash/เขียน ledger ล้มเหลวหลัง MailApp ยอมรับส่งอาจเกิด duplicate เมื่อมีการเรียกซ้ำ `SEND_STATE_UNKNOWN`, timeout/network error และแม้ `SEND_FAILED` ไม่พิสูจน์ว่าไม่มีเมลออก หยุดและตรวจ receipt/state ก่อนพิจารณาการส่งเพิ่ม ไม่เคลียร์ ledger เพื่อบังคับ retry
- Quota ไม่พอ, lock 100 ms ไม่ได้, malformed signature/payload/config, URL/redirect ผิด, GAS `success:false` แม้ HTTP200, unknown outcome หรือ link ใช้งานไม่ได้ ต้องหยุด gate ไม่มี fallback/auto-confirm/switch provider เงียบ ๆ
- Transport อนุญาต initial HTTPS `script.google.com/macros/s/<id>/exec` และ 302/303 ไป exact `script.googleusercontent.com` ไม่เกินสองครั้งด้วย credential-free GET ไม่ follow 307/308 หรือส่ง secret body ต่อ host อื่น

## Rollback และตรวจหลังย้อนกลับ

เมื่อ timing/receipt/link ไม่ผ่านหลังเปิดใช้ ให้ controller ยืนยันกับผู้ใช้ ณ action แล้ว **disable Send Email Hook ใหม่นี้ทันที** จากนั้นคืน prior enabled state/URI/signing configuration จาก private record ถ้าก่อนหน้านี้ Hooks ว่าง ให้คง disabled/remove เฉพาะ Send Email Hook ใหม่ อ่านกลับ state และคง Confirm Email/URL/OTP/Secure Email Change เดิม ไม่แก้ order deployment

การปิด hook ไม่ยกเลิกคำขอที่กำลังทำงานหรือเรียกคืนเมล ให้จด event ID/status/เวลาและผลไม่แน่นอน ห้าม retry บัญชีลูกค้าอัตโนมัติ Supabase กลับใช้ mail path ก่อนหน้าและข้อจำกัด default-mail/rate limits เดิมยังอยู่ การพิสูจน์ default-mail ด้วยการส่งเพิ่มเกิน budget ต้องขออนุมัติใหม่ ห้าม auto-confirm หรือเปลี่ยน SMTP/provider

เก็บ new deployment/secret/ledger ไว้ส่วนตัวระหว่างตรวจ incident ไม่ลบ `AUTH_SENT_INDEX`/rotate secrets ขณะคำขอยังอาจทำงาน หากตัดสินใจยุติ deployment ให้ controller ทำขั้นตอน revoke/archive เฉพาะ Auth project ใหม่หลัง hook ปิดและประเมิน in-flight requests แล้ว ไม่แตะ legacy project ไม่เปิด hook กลับจนแก้สาเหตุและผ่าน gate พร้อม mail budget ใหม่

รายงาน handoff แยก: local Node, real Deno/typecheck, GAS deployed/authorized, Edge deployed, hook disabled/enabled, 4 probe observations+receipt, signup, recovery, identity/profile match, rollback/prior-state restoration และ remaining blockers ใช้ `pending/not run` หากยังไม่ได้ทำ ไม่ใช้ deployment/mock เป็น production success

## เอกสารทางการที่ใช้ตรวจ

Task 1–3 ตรวจเมื่อ 2026-10-12: [Supabase changelog](https://supabase.com/changelog.md), [Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks), [Send Email Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook), [reauthentication](https://supabase.com/docs/reference/csharp/auth-reauthentication), [Standard Webhooks source](https://github.com/standard-webhooks/standard-webhooks/tree/main/libraries/javascript), [package version registry](https://registry.npmjs.org/standardwebhooks/latest), [Deno installation](https://docs.deno.com/runtime/getting_started/installation/), [Utilities](https://developers.google.com/apps-script/reference/utilities/utilities), [Properties](https://developers.google.com/apps-script/reference/properties/properties) และ [Google quotas](https://developers.google.com/apps-script/guides/services/quotas)

Changelog ที่ตรวจ: [default SMTP template restriction](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier) และ [self-hosted API URL change](https://supabase.com/changelog/47093-self-hosted-supabase-api-external-url-to-include-auth-v1) ไม่เปลี่ยน contract ของ custom hook บน hosted project นี้

Task 4 ตรวจ deployment/permission/command reference เพิ่มเมื่อ 2026-10-12: [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web), [MailApp API และ mail scope](https://developers.google.com/apps-script/reference/mail/mail-app) และ [Supabase functions deploy CLI](https://supabase.com/docs/reference/cli/supabase-functions-deploy) หาก hosted UI/CLI เปลี่ยนจากขั้นตอนนี้ ต้องตรวจ reference/help ปัจจุบันก่อนทำ action ไม่เดา endpoint หรือข้าม authorization gate
