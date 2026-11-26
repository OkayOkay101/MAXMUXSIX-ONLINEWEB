# การตั้งค่า

ค่าแต่ละรายการด้านล่างอ่านจากไฟล์ที่ระบุในหัวข้อนั้น ค่าปัจจุบันอ้างอิงจากโค้ดใน repo ฉบับภาษาอังกฤษอยู่ที่ [configuration.md](configuration.md)

## การตั้งค่าหน้าร้านที่เปิดเผยได้ (`auth-config.js`)

`window.MAXMUXSIX_AUTH_CONFIG` ถูกแช่แข็ง (`Object.freeze`) และโหลดในเบราว์เซอร์ ค่าเหล่านี้เป็นค่าสาธารณะและ commit ได้ การควบคุมการเข้าถึงข้อมูลอยู่ที่ Row Level Security (RLS) ใน Supabase ไม่ใช่การซ่อนค่าเหล่านี้

| ฟิลด์ | ความหมาย | ค่าปัจจุบันใน `auth-config.js` |
|---|---|---|
| `url` | URL ของโปรเจกต์ Supabase | `https://lxvxffrexegvqzeojztw.supabase.co` |
| `publishableKey` | Publishable key ของ Supabase | คีย์รูปแบบ `sb_publishable_…` |
| `redirectUrl` | ที่อยู่ที่ลิงก์ในอีเมลยืนยันตัวตนพากลับไป | `https://maxmuxsix-demo.vercel.app/` |
| `turnstileSiteKey` | Site key ของ Cloudflare Turnstile | `0x4AAAAAAGTS3jm-E4yU4CzM` (ตั้งเป็น `""` เพื่อปิด CAPTCHA) |

แท็ก `<meta>` Content Security Policy ใน `index.html` (ส่วน `connect-src`) ระบุ origin ของโปรเจกต์ Supabase ไว้โดยตรง หากเปลี่ยนโปรเจกต์ ต้องแก้ `connect-src` ให้ตรงกัน ส่วนที่อยู่ Supabase แบบ custom หรือ self-hosted ต้องปรับการตรวจสอบตามที่อธิบายใน [cloud-membership-setup.md](cloud-membership-setup.md)

## ขีดจำกัดของระบบสมาชิก (`index.html`)

| ค่าคงที่ | ความหมาย | ค่า |
|---|---|---|
| `RATE_LIMITS.register` | จำนวนการสมัครสมาชิก | 3 ครั้งต่อ 10 นาที |
| `RATE_LIMITS.subscribe` | จำนวนการสมัครรับข่าวสาร | 5 ครั้งต่อ 1 ชั่วโมง |
| `RATE_LIMITS.login_fail` | การเข้าสู่ระบบที่ล้มเหลว | บล็อก 5 นาทีหลังล้มเหลว 5 ครั้ง |
| `MAX_LOG_ENTRIES` | จำนวนรายการที่เก็บใน security log ในเครื่อง | 50 |

ขีดจำกัดเหล่านี้ทำงานในเบราว์เซอร์ผ่าน `localStorage` ช่วยการใช้งานปกติได้ แต่ไม่ใช่ขอบเขตความปลอดภัย ให้ตั้งค่า rate limit ฝั่งเซิร์ฟเวอร์ในแดชบอร์ดของ Supabase Auth ด้วย

## กฎโค้ดส่วนลด (`index.html`)

| โค้ด | กฎ |
|---|---|
| `MAX10` | ลด 10% เมื่อยอดรวมอย่างน้อย 150 บาท |
| `WELCOME10` | ลด 10% โดยไม่มียอดขั้นต่ำ |

## อีเมลผ่าน Google Apps Script (`google_apps_script.js`)

| การตั้งค่า | ความหมาย | ค่า |
|---|---|---|
| `SECURITY_CONFIG.MAX_SUBJECT_LEN` | ความยาวหัวข้อสูงสุด | 150 |
| `SECURITY_CONFIG.MAX_BODY_LEN` | ความยาวเนื้อหาสูงสุด | 100000 |
| `SECURITY_CONFIG.ALLOWED_FROM_NAME` | ชื่อผู้ส่งที่แสดง | `MAXMUXSIX ข้าวหลามเตาถ่าน` |

token ของรีเลย์อ่านจาก Apps Script Properties ชื่อ `ORDER_RELAY_TOKEN` (หมุนรหัสด้วยฟังก์ชัน `rotateRelayToken()`) ห้ามเขียนไว้ในไฟล์ใด

## LINE bot (`line_bot_smart_apps_script.js`)

| การตั้งค่า | ความหมาย | ค่า |
|---|---|---|
| `SHOP_CONFIG.shopName` | ชื่อร้านในข้อความตอบกลับ | `MAXMUXSIX ข้าวหลามเตาถ่าน` |
| `SHOP_CONFIG.phone` | เบอร์ติดต่อในข้อความตอบกลับ | `081-234-5678` (เบอร์ตัวอย่าง) |
| `SHOP_CONFIG.businessHours` | ข้อความเวลาเปิดทำการ | `ทุกวัน 08:00 - 18:00 น.` |
| `SHOP_CONFIG.address` | ข้อความที่อยู่ร้าน | `ร้าน MAXMUXSIX ถนนสายหลัก ตลาดเตาถ่าน` |
| `SHOP_CONFIG.promptPay` / `bankAccount` | ข้อความเรื่องการชำระเงิน | `เว็บตัวอย่าง ไม่มีการรับชำระเงิน ห้ามโอนเงิน` |
| `ORDER_STATE_TTL_MS` | ระยะเวลาเก็บขั้นตอนคำสั่งซื้อที่ยังไม่เสร็จ | 30 นาที |
| `CHUNK_SIZE` (บรอดแคสต์) | จำนวนผู้รับต่อหนึ่งคำขอ LINE multicast | 500 |

ไฟล์ LINE bot อีกไฟล์ `line_bot_apps_script.js` เป็นทางเลือก (ดู [ADR 0001](adr/0001-keep-two-line-bots.md)) ให้ติดตั้งเพียงไฟล์เดียวในโปรเจกต์ Apps Script เดียวกัน เพราะทั้งสองไฟล์ประกาศชื่อฟังก์ชันเดียวกัน

## รีเลย์อีเมลยืนยันตัวตน (`google_auth_apps_script.js`)

| การตั้งค่า | ความหมาย | ค่า |
|---|---|---|
| `AUTH_MAIL_DAY_MS` | ความยาวของช่วงเวลา 1 วัน | 24 ชั่วโมง |
| `AUTH_MAIL_LEDGER_BYTES` | ขนาดสูงสุดของบันทึกการส่ง | 8 KiB |

ค่าความลับของรีเลย์อ่านจาก Apps Script Properties ชื่อ `AUTH_RELAY_SECRET` ให้ตั้งค่าในโปรเจกต์ Apps Script ห้ามเขียนไว้ในไฟล์ใด

## Supabase Edge Functions (`supabase/config.toml` และตัวแปรแวดล้อม)

| ชื่อ | ใช้โดย | หมายเหตุ |
|---|---|---|
| `verify_jwt = false` | `admin-users`, `order-email` | Gateway JWT แบบเดิมไม่รองรับ publishable key แต่ละ handler จึงตรวจ token ของผู้ใช้เองด้วย `Auth.getUser(jwt)` ห้ามลบการตรวจนั้น |
| `verify_jwt = false` | `send-auth-email` | Auth hook ทำงานก่อนมี session ของผู้ใช้ handler นี้ตรวจลายเซ็นด้วย Standard Webhooks (`npm:standardwebhooks@1.1.1`) |
| `SITE_URL` | `admin-users`, `order-email`, `send-auth-email` | origin ที่อนุญาตสำหรับ CORS และตรวจ redirect URL ให้ตั้งเป็นที่อยู่เว็บจริง (`https://maxmuxsix-demo.vercel.app/`) |
| `AUTH_GAS_URL`, `AUTH_GAS_RELAY_SECRET` | `send-auth-email`, `order-email` | Secret ของ Edge Function สำหรับชี้ไปยังรีเลย์ Apps Script และรหัสลับร่วม |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Secret ของแพลตฟอร์ม ห้ามนำไปใส่ฝั่งหน้าเว็บ |

สำหรับการตั้งค่าระบบสมาชิกทั้งหมด ดู [cloud-membership-setup.md](cloud-membership-setup.md)
