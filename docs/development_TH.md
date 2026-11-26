# การพัฒนา

ฉบับภาษาอังกฤษอยู่ที่ [development.md](development.md)

## ความต้องการ

- Node.js 22 ขึ้นไป (อ้างอิงจาก [cloud-membership-setup.md](cloud-membership-setup.md) ส่วน `package.json` ไม่มีฟิลด์ `engines`)
- `@supabase/supabase-js` ล็อกเวอร์ชันไว้ที่ `2.117.3` ใน `package.json`
- Google Chrome ใช้เฉพาะการทดสอบ browser ใน `tests/browser/membership.cjs`

## การติดตั้ง

```bash
npm ci --ignore-scripts
```

`--ignore-scripts` ข้าม install script การ build และชุดทดสอบไม่จำเป็นต้องใช้

## คำสั่ง npm

| คำสั่ง | รันอะไร |
|---|---|
| `npm test` | `node --test tests/unit/*.test.js` |
| `npm run test:verbose` | ชุดทดสอบเดียวกันแต่แสดงผลแบบ `spec` |
| `npm run build:auth` | `esbuild` รวม `assets/js/supabase-entry.js` ไปเป็น `assets/vendor/supabase.js` |
| `npm run csp:hash` | `node scripts/csp-hash.js` (อัปเดต SHA-256 hash ของ inline `<script>` ใน `index.html`) |

**กฎ CSP hash:** `index.html` ใช้ `script-src` แบบเข้มงวดโดยไม่ใช้ `'unsafe-inline'` ทุกครั้งที่แก้ไข inline `<script>` ใน `index.html` ต้องรัน `npm run csp:hash` ก่อน commit มิฉะนั้น `tests/unit/47-csp-strict-script.test.js` จะไม่ผ่านและเบราว์เซอร์จะบล็อกสคริปต์ นอกจากนี้ `.gitattributes` ล็อก `index.html` ให้ใช้ line ending แบบ LF เพื่อให้ค่า hash ตรงกันทั้งบน Windows และ Linux

## การ build สำหรับ deploy

`vercel.json` ตั้งค่า `"framework": null`, `"installCommand": ""`, `"buildCommand": "node scripts/build-public.js"` และ `"outputDirectory": "public"`

`scripts/build-public.js` คัดลอกเฉพาะ 18 ไฟล์ตามรายชื่อใน `PUBLIC_FILES` ไปยัง `public/` หากไฟล์ใดหายไป สคริปต์จะหยุดทำงาน และจะไม่ยอมลบโฟลเดอร์โปรเจกต์หรือโฟลเดอร์แม่ ไฟล์ที่ไม่อยู่ในรายการ (การทดสอบ เอกสาร ไฟล์ Apps Script โค้ด Supabase) จะไม่ถูกเผยแพร่

`vercel.json` ยังตั้ง header ความปลอดภัย 6 รายการในทุกเส้นทาง (`/(.*)`):
- `X-Frame-Options: DENY`
- `Content-Security-Policy: frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

## การทดสอบ browser ของระบบสมาชิก

```bash
PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser/membership.cjs
```

สคริปต์ใช้ Supabase provider จำลอง ไม่ส่งอีเมลและไม่ลบบัญชีจริง ต้องชี้ `PLAYWRIGHT_MODULE` ไปยังโมดูล Playwright ที่ติดตั้งไว้ และสคริปต์จะเปิด Google Chrome

## การทดสอบหน่วย

`npm test` รัน `tests/unit/*.test.js` โดยมีไฟล์ทดสอบฐานข้อมูล 3 ไฟล์ (`12-membership-database.test.js`, `35-order-email-database.test.js` และ `41-shop-orders-database.test.js`) ที่รัน SQL migration บน PostgreSQL ในหน่วยความจำ (`@electric-sql/pglite`) ส่วนไฟล์อื่นโหลดสคริปต์เบราว์เซอร์และไฟล์ Apps Script ผ่านตัวช่วยใน `tests/helpers/`

`tests/runtime/auth-email-webhook.test.ts` เป็นไฟล์ทดสอบ TypeScript และไม่มีคำสั่ง npm ที่รันไฟล์นี้ ดังนั้น `npm test` จึงไม่รวมไฟล์นี้

## Supabase

- Migration อยู่ใน `supabase/migrations/` ให้ทำตามลำดับและกฎ "รันครั้งเดียว" ใน [cloud-membership-setup.md](cloud-membership-setup.md) ห้ามรัน migration ซ้ำ
- Edge Functions อยู่ใน `supabase/functions/` deploy ด้วย Supabase CLI ตามคู่มือระบบสมาชิก
- การทดสอบหน่วยไม่ได้เรียกใช้โปรเจกต์ Supabase จริง

## Google Apps Script

ไฟล์รากแต่ละไฟล์ต่อไปนี้ให้นำไปวางในโปรเจกต์ Apps Script แยกกัน:

- `google_apps_script.js`: อีเมลยืนยันคำสั่งซื้อและอีเมลต้อนรับ
- `google_auth_apps_script.js`: รีเลย์อีเมลยืนยันตัวตน (deploy ในโปรเจกต์แยก)
- `line_bot_smart_apps_script.js` หรือ `line_bot_apps_script.js`: LINE bot เลือกเพียงไฟล์เดียว (ดู [ADR 0001](adr/0001-keep-two-line-bots.md))

ห้ามวางทั้งสองไฟล์ LINE bot ในโปรเจกต์เดียว ไฟล์ Apps Script ไม่ได้เป็นส่วนหนึ่งของ Vercel build

## โฟลเดอร์การทดสอบ

- `tests/unit/`: การทดสอบหน่วย แยกตามหัวข้อ (sanitizer, ความปลอดภัย, ตะกร้า, แบบทดสอบ, ตัวกรอง, GAS, UI, LINE bot, SEO, cloud auth, PGlite DB, captcha, CSP ฯลฯ)
- `tests/helpers/`: ตัวโหลดที่รันสคริปต์เบราว์เซอร์และไฟล์ Apps Script ใน Node
- `tests/browser/`: การทดสอบ browser ด้วย Playwright สำหรับระบบสมาชิก
- `tests/runtime/`: การทดสอบ TypeScript สำหรับ auth email webhook (ไม่มีคำสั่ง npm รัน)
