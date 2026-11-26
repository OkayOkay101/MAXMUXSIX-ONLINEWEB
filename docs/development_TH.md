# การพัฒนา

ฉบับภาษาอังกฤษอยู่ที่ [development.md](development.md)

## ความต้องการ

- Node.js 22 ขึ้นไป คู่มือตั้งค่าระบบสมาชิกระบุข้อกำหนดนี้ ([cloud-membership-setup.md](cloud-membership-setup.md)) ส่วน `package.json` ไม่มีฟิลด์ `engines`
- Supabase SDK ล็อกเวอร์ชันไว้ที่ `2.117.3` ใน `package.json`
- Google Chrome ใช้เฉพาะการทดสอบ browser ใน `tests/browser/membership.cjs`

## การติดตั้ง

```bash
npm ci --ignore-scripts
```

`--ignore-scripts` ข้าม install script การ build ไม่จำเป็นต้องใช้

## คำสั่ง npm

| คำสั่ง | รันอะไร |
|---|---|
| `npm run test` | `node --test tests/unit/*.test.js` |
| `npm run test:verbose` | การทดสอบเดียวกันแต่แสดงผลแบบ spec |
| `npm run build:auth` | esbuild รวม `assets/js/supabase-entry.js` ไปเป็น `assets/vendor/supabase.js` |
| `npm run csp:hash` | รัน `node scripts/csp-hash.js` |

## การ build สำหรับ deploy

`vercel.json` ตั้งคำสั่ง build เป็น `node scripts/build-public.js` และโฟลเดอร์ผลลัพธ์เป็น `public` สคริปต์คัดลอกเฉพาะไฟล์ที่อยู่ใน `PUBLIC_FILES` ไปยัง `public/` หากไฟล์ที่ระบุหายไป สคริปต์จะหยุด และจะไม่ลบโฟลเดอร์โปรเจกต์

ไฟล์ที่ไม่ได้อยู่ในรายการ (การทดสอบ เอกสาร ไฟล์ Apps Script โค้ด Supabase) จะไม่ถูกเผยแพร่

`vercel.json` ตั้ง header ความปลอดภัยทุกเส้นทาง ได้แก่ `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` และ `Strict-Transport-Security`

## การทดสอบ browser ของระบบสมาชิก

```bash
PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser/membership.cjs
```

สคริปต์ใช้ Supabase provider จำลอง ไม่ส่งอีเมลและไม่ลบบัญชีจริง ต้องชี้ `PLAYWRIGHT_MODULE` ไปยังโมดูล Playwright ที่ติดตั้งไว้ และสคริปต์จะเปิด Google Chrome

## การทดสอบหน่วย

`npm test` รัน `tests/unit/*.test.js` การทดสอบบางไฟล์ (ระบบสมาชิกในฐานข้อมูล อีเมลคำสั่งซื้อในฐานข้อมูล และคำสั่งซื้อในฐานข้อมูล) รัน SQL migration บน PostgreSQL ในหน่วยความจำ (PGlite) ส่วนไฟล์อื่นโหลดสคริปต์ฝั่งเบราว์เซอร์และไฟล์ Apps Script ผ่านตัวช่วยใน `tests/helpers/`

`tests/runtime/auth-email-webhook.test.ts` เป็นไฟล์ TypeScript และไม่มีคำสั่ง npm ที่รันไฟล์นี้ ดังนั้น `npm test` จึงไม่รวมไฟล์นี้

## Supabase

- Migration อยู่ใน `supabase/migrations/` ให้ทำตามลำดับและกฎ "รันครั้งเดียว" ใน[คู่มือตั้งค่าระบบสมาชิก](cloud-membership-setup.md) ห้ามรัน migration ซ้ำ
- Edge Functions อยู่ใน `supabase/functions/` deploy ด้วย Supabase CLI ตามคู่มือระบบสมาชิก
- การทดสอบหน่วยไม่ได้ทดสอบโปรเจกต์ Supabase ที่ใช้งานจริง

## Google Apps Script

ไฟล์ราก 3 ไฟล์ต่อไปนี้แต่ละไฟล์ให้วางในโปรเจกต์ Apps Script ของตัวเอง:

- `google_apps_script.js`: อีเมลยืนยันคำสั่งซื้อและใบเสร็จ
- `google_auth_apps_script.js`: รีเลย์อีเมลยืนยันตัวตน (deploy ในโปรเจกต์แยก)
- `line_bot_smart_apps_script.js` หรือ `line_bot_apps_script.js`: LINE bot เลือกเพียงไฟล์เดียว

ห้ามวางทั้งสองไฟล์ LINE bot ในโปรเจกต์เดียว ไฟล์ Apps Script ไม่ได้เป็นส่วนของ build

## โฟลเดอร์การทดสอบ

- `tests/unit/`: การทดสอบหน่วย แยกตามหัวข้อ (ตะกร้า ตัวกรองสินค้า แบบทดสอบ การเข้าสู่ระบบ อีเมลคำสั่งซื้อ LINE bot captcha และอื่น ๆ)
- `tests/helpers/`: ตัวโหลดที่รันสคริปต์เบราว์เซอร์และไฟล์ Apps Script ใน Node
- `tests/browser/`: การทดสอบ browser ของระบบสมาชิก
- `tests/runtime/`: การทดสอบ TypeScript ของ auth email webhook (ไม่มีคำสั่ง npm รัน)
