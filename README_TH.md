# MAXMUXSIX ร้านออนไลน์

เว็บสาธิตของ MAXMUXSIX ร้านข้าวหลามเผาเตาถ่าน หนองมน ชลบุรี เว็บนี้ไม่ได้ขาย จัดส่ง หรือรับชำระเงินจริง

[English](README.md) · [คู่มือใช้งาน](docs/user-guide_TH.md) · [การตั้งค่า](docs/configuration_TH.md) · [การพัฒนา](docs/development_TH.md)

![หน้าร้าน MAXMUXSIX](store_front.jpg)

## ความต้องการ

- Node.js 22 ขึ้นไป (สำหรับการรันทดสอบและ build)
- Python 3 (หรือ static HTTP server อื่นสำหรับเปิดเว็บในเครื่อง)
- Google Chrome (ใช้เฉพาะการทดสอบ `tests/browser/membership.cjs`)

## การติดตั้ง

```bash
npm ci --ignore-scripts
python -m http.server 8000
```

บน macOS หรือ Linux ให้ใช้ `python3 -m http.server 8000` หากคำสั่ง `python` ไม่พร้อมใช้งาน จากนั้นเปิด `http://localhost:8000/` ในเบราว์เซอร์ อย่าเปิด `index.html` จากดิสก์โดยตรง (`file://`) เพราะลิงก์ในอีเมลของระบบสมาชิกและนโยบายความปลอดภัยของเบราว์เซอร์ต้องใช้ HTTP(S)

## คุณสมบัติ

- **ร้านค้า:** ค้นหาและกรองสินค้า ตะกร้าที่ใช้โค้ดส่วนลดได้ (`MAX10`, `WELCOME10`) และแบบทดสอบแนะนำรสชาติ
- **สมาชิก:** สมัครสมาชิก ยืนยันอีเมล เข้าสู่ระบบ และรีเซ็ตรหัสผ่านผ่าน Supabase Auth (รองรับ Cloudflare Turnstile)
- **อีเมลและแชต:** อีเมลยืนยันคำสั่งซื้อ/ต้อนรับ และ LINE OA chatbot ทำงานผ่าน Google Apps Script

## การใช้งาน

| งาน | ที่อยู่ในหน้าเว็บ |
|---|---|
| ค้นหาสินค้า | ช่องค้นหาและตัวกรองที่หน้าแรก |
| ใส่ตะกร้า | ปุ่ม "🛒 เพิ่มลงตะกร้า" บนการ์ดสินค้า |
| ใช้โค้ดส่วนลด | ช่องโค้ดส่วนลดในตะกร้า (`MAX10` ขั้นต่ำ 150 บาท, `WELCOME10` ไม่มีขั้นต่ำ) |
| เข้าสู่ระบบ | ส่วนสมาชิก ปุ่ม "เข้าสู่ระบบ" |

## การตั้งค่า

การตั้งค่าที่เปิดเผยได้ฝั่งหน้าเว็บอยู่ในไฟล์ `auth-config.js` ดูรายละเอียดทั้งหมดใน [docs/configuration_TH.md](docs/configuration_TH.md) ห้ามใส่ `service_role` หรือ `sb_secret` ในไฟล์ใดของ repo นี้

## การทดสอบ

```bash
npm test
```

## โครงสร้างโปรเจกต์

- `index.html` (หน้าร้าน) และ `auth-config.js` (ค่า Supabase และ Turnstile ที่เปิดเผยได้)
- `assets/`, `scripts/`: โมดูล JavaScript, ไลบรารีที่รวมไว้, รูปภาพ, วิดีโอ และสคริปต์ช่วย build/CSP
- `supabase/`, `tests/`: SQL migration, Edge Functions, unit tests และ browser tests
- `docs/`: คู่มือใช้งาน การตั้งค่า การพัฒนา บันทึกการตั้งค่า และ ADR
- `*_apps_script.js`: ไฟล์ Google Apps Script (ติดตั้ง LINE bot เพียงไฟล์เดียวต่อหนึ่งโปรเจกต์)

## สัญญาอนุญาต

`package.json` ระบุสัญญาอนุญาตเป็น `UNLICENSED` ซึ่งไม่ได้อนุญาตให้ใช้แบบโอเพนซอร์ส
