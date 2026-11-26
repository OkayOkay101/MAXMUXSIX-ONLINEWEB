# การตั้งค่า

ค่าแต่ละรายการอ่านจากไฟล์ที่ระบุในหัวข้อนั้น ค่าเริ่มต้นคือค่าที่อยู่ในโค้ด ณ เวลาที่เขียนเอกสาร ฉบับภาษาอังกฤษอยู่ที่ [configuration.md](configuration.md)

## การตั้งค่าหน้าร้านที่เปิดเผยได้ (`auth-config.js`)

`window.MAXMUXSIX_AUTH_CONFIG` ถูกแช่แข็งและโหลดในเบราว์เซอร์ ค่าเหล่านี้เป็นค่าสาธารณะและ commit ได้ การควบคุมการเข้าถึงข้อมูลอยู่ที่ Row Level Security ใน Supabase ไม่ใช่การซ่อนค่าเหล่านี้

| ฟิลด์ | ความหมาย | ค่าเริ่มต้น |
|---|---|---|
| `url` | URL ของโปรเจกต์ Supabase | ตั้งเป็น URL ของโปรเจกต์ Supabase |
| `publishableKey` | Publishable key ของ Supabase | ตั้งเป็นคีย์รูปแบบ `sb_publishable_…` |
| `redirectUrl` | ที่อยู่ที่ลิงก์ในอีเมลพากลับไป | ตั้งเป็นที่อยู่เว็บสาธิต |
| `turnstileSiteKey` | Site key ของ Cloudflare Turnstile | ค่าว่าง = ปิด CAPTCHA |

นโยบาย Content Security Policy ใน `index.html` (บรรทัด `connect-src`) ระบุที่อยู่โปรเจกต์ Supabase ไว้โดยตรง หากเปลี่ยนโปรเจกต์ ต้องแก้บรรทัดนั้นให้ตรงกัน ที่อยู่ Supabase แบบ custom หรือ self-hosted ต้องปรับการตรวจสอบตามที่อธิบายใน[คู่มือตั้งค่าระบบสมาชิก](cloud-membership-setup.md)

## ขีดจำกัดของระบบสมาชิก (`index.html`)

| ค่าคงที่ | ความหมาย | ค่า |
|---|---|---|
| `RATE_LIMITS.register` | จำนวนการสมัคร | 3 ครั้งต่อ 10 นาที |
| `RATE_LIMITS.subscribe` | จำนวนการสมัครรับข่าวสาร | 5 ครั้งต่อ 1 ชั่วโมง |
| `RATE_LIMITS.login_fail` | การเข้าสู่ระบบที่ล้มเหลว | บล็อก 5 นาทีหลังล้มเหลว 5 ครั้ง |
| `MAX_LOG_ENTRIES` | จำนวนรายการที่เก็บใน security log ในเครื่อง | 50 |

ขีดจำกัดเหล่านี้ทำงานในเบราว์เซอร์ ช่วยการใช้งานปกติได้ แต่ไม่ใช่ขอบเขตความปลอดภัย ให้ตั้งค่า rate limit ของ Supabase Auth ในแดชบอร์ดของ Supabase

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

## LINE bot (`line_bot_smart_apps_script.js`)

| การตั้งค่า | ความหมาย | ค่า |
|---|---|---|
| `SHOP_CONFIG.shopName` | ชื่อร้านในข้อความตอบกลับ | `MAXMUXSIX ข้าวหลามเตาถ่าน` |
| `SHOP_CONFIG.phone` | เบอร์ติดต่อในข้อความตอบกลับ | เบอร์ตัวอย่าง |
| `SHOP_CONFIG.businessHours` | ข้อความเวลาเปิดทำการ | `ทุกวัน 08:00 - 18:00 น.` |
| `SHOP_CONFIG.promptPay` | ข้อความเรื่องการชำระเงิน | ข้อความตัวอย่าง ไฟล์ระบุว่าไม่รับชำระเงิน |
| `ORDER_STATE_TTL_MS` | ระยะเวลาเก็บขั้นตอนคำสั่งซื้อที่ยังไม่เสร็จ | 30 นาที |
| `CHUNK_SIZE` (บรอดแคสต์) | จำนวนผู้รับต่อหนึ่งคำขอ LINE | 500 |

ไฟล์ LINE bot อีกไฟล์ `line_bot_apps_script.js` เป็นทางเลือก ให้ติดตั้งเพียงไฟล์เดียวในโปรเจกต์ Apps Script เดียวกัน เพราะทั้งสองไฟล์ประกาศชื่อฟังก์ชันเดียวกัน

## รีเลย์อีเมลยืนยันตัวตน (`google_auth_apps_script.js`)

| การตั้งค่า | ความหมาย | ค่า |
|---|---|---|
| `AUTH_MAIL_DAY_MS` | ความยาวของช่วงเวลา 1 วัน | 24 ชั่วโมง |
| `AUTH_MAIL_LEDGER_BYTES` | ขนาดบันทึกการส่ง | 8 KiB |

ค่าความลับของรีเลย์อ่านจาก property ชื่อ `AUTH_RELAY_SECRET` ใน Apps Script ให้ตั้งค่าในโปรเจกต์ Apps Script ห้ามเขียนไว้ในไฟล์ใด

## Supabase Edge Functions (`supabase/config.toml` และตัวแปรแวดล้อม)

| ชื่อ | ใช้โดย | หมายเหตุ |
|---|---|---|
| `verify_jwt = false` | `admin-users`, `order-email`, `send-auth-email` | แต่ละ handler ตรวจ token ของผู้ใช้เองด้วย `Auth.getUser` ห้ามลบการตรวจนั้น |
| `SITE_URL` | `admin-users` | origin เดียวที่อนุญาตสำหรับ CORS preflight ตั้งเป็นที่อยู่เว็บจริง |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | ตัวแปรของแพลตฟอร์ม ห้ามนำไปใส่ฝั่งหน้าเว็บ |

สำหรับการตั้งค่าระบบสมาชิกทั้งหมด ดู[คู่มือตั้งค่าระบบสมาชิก](cloud-membership-setup.md)
