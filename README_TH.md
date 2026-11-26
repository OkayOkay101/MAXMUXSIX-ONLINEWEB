# MAXMUXSIX ร้านออนไลน์

เว็บสาธิตของ MAXMUXSIX ร้านข้าวหลามเผาเตาถ่าน หนองมน ชลบุรี เว็บนี้เป็นตัวอย่าง จึงไม่ได้ขายหรือจัดส่งสินค้าจริง และไม่รับชำระเงิน

[English](README.md) · [คู่มือใช้งาน](docs/user-guide_TH.md) · [การตั้งค่า](docs/configuration_TH.md) · [การพัฒนา](docs/development_TH.md)

![หน้าร้าน MAXMUXSIX](store_front.jpg)

## ความต้องการ

- Node.js 22 ขึ้นไป สำหรับรันการทดสอบและ build (ดู [docs/development_TH.md](docs/development_TH.md))
- Google Chrome ใช้เฉพาะการทดสอบ browser

## การติดตั้ง

```bash
npm ci --ignore-scripts
```

เปิดโฟลเดอร์ด้วยเซิร์ฟเวอร์ HTTP แบบ static ใดก็ได้ แล้วเปิดที่อยู่ที่เซิร์ฟเวอร์แสดง อย่าเปิด `index.html` ตรงจากดิสก์ เพราะลิงก์ในอีเมลของระบบสมาชิกต้องใช้ HTTP(S)

## การใช้งาน

- **ดูเมนู:** ค้นหาและกรองสินค้าจากหน้าแรก ดู[คู่มือใช้งาน](docs/user-guide_TH.md)
- **ตะกร้าและโค้ดส่วนลด:** ใส่สินค้าลงตะกร้า แล้วกรอกโค้ดส่วนลดในตะกร้า
- **ระบบสมาชิก:** สมัคร ยืนยันอีเมล แล้วเข้าสู่ระบบ ต้องมีโปรเจกต์ Supabase ก่อน ดูในคู่มือการตั้งค่า

## การตั้งค่า

ค่าที่เปิดเผยได้อยู่ในไฟล์ `auth-config.js` รายการทั้งหมดพร้อมค่าเริ่มต้นอยู่ใน [docs/configuration_TH.md](docs/configuration_TH.md) ห้ามใส่ `service_role` หรือ `sb_secret` ในไฟล์ใดของ repo นี้

| การตั้งค่า | ไฟล์ | ค่าเริ่มต้น |
|---|---|---|
| URL ของโปรเจกต์ Supabase | `auth-config.js` | ใส่ URL ของโปรเจกต์ |
| Publishable key | `auth-config.js` | ใส่ publishable key |
| Redirect URL | `auth-config.js` | ค่าในฟิลด์ `redirectUrl` |
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
- `docs/`: คู่มือใช้งาน การตั้งค่า การพัฒนา และบันทึกการตั้งค่า
- `*_apps_script.js`: ไฟล์ Google Apps Script (ติดตั้ง LINE bot เพียงไฟล์เดียวต่อหนึ่งโปรเจกต์)

## สัญญาอนุญาต

`package.json` ระบุสัญญาอนุญาตเป็น `UNLICENSED` ซึ่งไม่ได้อนุญาตให้ใช้แบบโอเพนซอร์ส
