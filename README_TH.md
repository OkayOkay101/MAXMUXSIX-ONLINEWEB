# MAXMUXSIX ร้านออนไลน์

เว็บสาธิตของ MAXMUXSIX ร้านข้าวหลามเผาเตาถ่าน หนองมน ชลบุรี เว็บนี้เป็นตัวอย่าง จึงไม่ได้ขายหรือจัดส่งสินค้าจริง และไม่รับชำระเงิน

[English](README.md) · [การตั้งค่า](docs/configuration.md) · [การพัฒนา](docs/development.md)

![หน้าร้าน MAXMUXSIX](store_front.jpg)

## ความต้องการ

- Node.js 22 ขึ้นไป สำหรับรันการทดสอบและ build (ดู [docs/development.md](docs/development.md))
- Google Chrome ใช้เฉพาะการทดสอบ browser

## การติดตั้ง

```bash
npm ci --ignore-scripts
python -m http.server 8000
```

จากนั้นเปิด `http://localhost:8000/` อย่าเปิด `index.html` ด้วย `file://` เพราะลิงก์ในอีเมลของระบบสมาชิกต้องใช้ HTTP(S)

## การใช้งาน

- **ดูเมนู:** ค้นหาและกรองข้าวหลามจากหน้าแรก
- **ใส่ตะกร้า:** เลือกสินค้าและตรวจสอบตะกร้าก่อนชำระเงิน
- **หาเมนูที่ชอบ:** ทำแบบทดสอบเพื่อรับคำแนะนำเมนู
- **ระบบสมาชิก:** สมัคร ยืนยันอีเมล แล้วเข้าสู่ระบบ ต้องตั้งค่า Supabase ก่อน

## การตั้งค่า

ค่าที่เปิดเผยได้อยู่ในไฟล์ `auth-config.js` รายการทั้งหมดอยู่ใน [docs/configuration.md](docs/configuration.md) ห้ามใส่ `service_role` หรือ `sb_secret` ในไฟล์ใดของ repo นี้

| การตั้งค่า | ไฟล์ | ค่าเริ่มต้น |
|---|---|---|
| URL ของโปรเจกต์ Supabase | `auth-config.js` | ใส่ URL ของโปรเจกต์ |
| Publishable key | `auth-config.js` | ใส่ publishable key |
| Redirect URL | `auth-config.js` | `https://maxmuxsix-demo.vercel.app/` |
| Turnstile site key | `auth-config.js` | ว่าง = ปิด CAPTCHA |

## การทดสอบ

```bash
npm test
```

## โครงสร้างโปรเจกต์

- `index.html`: หน้าร้าน (หน้าเดียว)
- `auth-config.js`: ค่า Supabase ที่เปิดเผยได้
- `assets/`: ไฟล์ JavaScript, ไลบรารีที่รวมไว้, รูปภาพ และวิดีโอ
- `supabase/`: migration และ Edge Function
- `scripts/`: สคริปต์ช่วย build (`build-public.js`, `csp-hash.js`)
- `tests/`: การทดสอบหน่วยและ browser
- `docs/`: คู่มือการตั้งค่าและบันทึก
- `*_apps_script.js`: ไฟล์ Google Apps Script (ติดตั้ง LINE bot เพียงไฟล์เดียวต่อหนึ่งโปรเจกต์)

## สัญญาอนุญาต

`package.json` ระบุสัญญาอนุญาตเป็น `UNLICENSED` ซึ่งไม่ได้อนุญาตให้ใช้แบบโอเพนซอร์ส
