# MAXMUXSIX: ส่งอีเมล Auth ผ่าน Google Apps Script

วันที่: 2026-10-12
สถานะ: รอผู้ใช้ตรวจและอนุมัติเอกสารนี้ก่อนเขียนแผน implementation

## เป้าหมายและขอบเขต

ใช้ Google Apps Script ส่งอีเมลยืนยันสมาชิกและกู้รหัสผ่านของ Supabase แทนบริการอีเมลเริ่มต้น โดยยังต้องยืนยันอีเมลก่อนใช้งาน ไม่ซื้อโดเมนหรือบริการ SMTP และไม่กระทบอีเมลแจ้งคำสั่งซื้อ/สลิปเดิม

ผู้ใช้อนุมัติแนวทาง Apps Script แล้ว แต่ยังไม่ได้อนุมัติเอกสารนี้หรือแผน implementation การเพิ่ม/ลบสมาชิกโดยบุคคลทั่วไปเป็นงานอื่น ไม่อยู่ในขอบเขตนี้

## ทางเลือกและข้อสรุป

1. **เลือก: Send Email Hook → Supabase Edge Function → Apps Script MailApp แบบรอผลส่ง** มีส่วนประกอบน้อย และตรวจสอบลายเซ็น webhook ได้ แต่ต้องพิสูจน์ว่าเสร็จทัน HTTP hook ซึ่งมีเวลา 5 วินาที
2. คิวถาวรและ worker ส่งภายหลัง: รองรับความหน่วงได้ดีกว่า แต่ต้องเพิ่มฐานข้อมูลคิว การจัดเก็บ token ชั่วคราว การ retry และระบบติดตาม ไม่รวมในงานรอบนี้
3. Gmail SMTP: ต่อ Supabase ได้โดยตรง แต่ต้องตั้ง App Password/ข้อกำหนดบัญชี Google ผู้ใช้เลือก Apps Script จึงไม่ดำเนินการทางนี้

หากทางเลือกแรกไม่ผ่านการทดสอบเวลาจริง จะไม่เปิด hook และกลับมาหารือทางเลือกอื่น ไม่เปลี่ยนเป็นคิวโดยอัตโนมัติ

## สถาปัตยกรรม

- Edge Function ใหม่ `send-auth-email` รับเฉพาะ POST และตรวจ Standard Webhooks signature, timestamp และ raw body ก่อนทำงาน ไม่ใช้ publishable key เป็นหลักฐานอนุญาตส่งเมล
- ตรวจ payload ตามชนิด Auth email และสร้างข้อความจาก template ที่ควบคุมเอง ไม่รับ HTML, subject หรือ recipient เพิ่มเติมจาก frontend
- ส่งคำขอ JSON ที่เซ็น HMAC ด้วย secret ใหม่ไปยัง Apps Script สำหรับ Auth โดยเฉพาะ ใช้ timestamp และ event ID ป้องกัน replay
- สร้าง Apps Script deployment สำหรับ Auth แยกจาก dispatcher คำสั่งซื้อเดิม เก็บ secret ใน Script Properties และ Edge secrets เท่านั้น ไม่ใช้ token ที่อยู่ใน JavaScript สาธารณะ
- ไม่แก้หรือแทนที่ `/exec` คำสั่งซื้อเดิม บัญชี Google เดียวกันยังใช้โควตาส่งร่วมกัน การแยก deployment ไม่เพิ่มโควตา
- Apps Script ตรวจลายเซ็น อายุคำขอ schema และ event ID ก่อนเรียก MailApp ล็อกเป็นเวลาสั้นและตรวจผลการได้ล็อก ไม่ใช้การรอ 15 วินาทีของ dispatcher เดิม
- ไม่ใส่รหัสผ่าน, Auth token, signature, secret หรือเนื้อหาอีเมลใน logs รายงานเฉพาะ event ID, ประเภท, สถานะ และเวลา

## ข้อความและลิงก์

- รองรับ action ที่ระบบเปิดใช้อยู่: signup, recovery, invite, magiclink, email_change และ reauthentication พร้อม fixture แยกแต่ละชนิด
- ใช้ข้อมูล `email_data` ของ Supabase และการ mapping token ตามเอกสารปัจจุบัน ไม่สร้าง token ยืนยันเอง
- จำกัด project เป็น `lxvxffrexegvqzeojztw` และปลายทาง redirect เป็น `https://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/` เท่านั้น ลิงก์ยืนยันต้องชี้ไป Auth verify endpoint ของ project นี้
- Email change แบบยืนยันสองที่อยู่ต้องจับคู่ตามเอกสาร: `token_hash_new` ไปอีเมลปัจจุบันพร้อม `token`; `token_hash` ไปอีเมลใหม่พร้อม `token_new` และทดสอบกรณีตั้งค่าที่ใช้จริงก่อนเปิดใช้งาน
- Escape ข้อมูลผู้ใช้ทั้งหมดใน HTML พร้อม plain-text fallback ชื่อผู้ส่ง MAXMUXSIX ภาษาไทย และข้อความเตือนไม่ให้แชร์ลิงก์/รหัส
- ชนิดคำขอไม่รู้จักหรือข้อมูลไม่ครบให้คืนข้อผิดพลาด ไม่ตอบสำเร็จเงียบ ๆ

## ผลส่ง เวลา และความผิดพลาด

- HTTP hook มีเพดาน 5 วินาที กำหนดเวลารอ upstream ไม่เกิน 3.5 วินาที และงบเวลารวมเป้าหมายต่ำกว่า 4.5 วินาที ไม่รับประกันว่า Apps Script cold start จะผ่านจนกว่าจะทดสอบจริง
- GAS JSON `success:false` ถือว่าล้มเหลวแม้ HTTP status เป็น 200; relay ตรวจทั้ง status และ body จำกัดขนาด response และไม่เผยรายละเอียด upstream ให้ลูกค้า
- GAS ContentService อาจ redirect; ติดตามเฉพาะ HTTPS ของ Google Apps Script/Googleusercontent ที่กำหนดไว้ ไม่ส่ง credential ต่อไปยัง host อื่น
- ตอบ hook สำเร็จเมื่อ MailApp ยอมรับการส่งทั้งหมดแล้วเท่านั้น ไม่ใช้ background task แล้วตอบสำเร็จล่วงหน้า การยอมรับโดย MailApp ไม่เท่ากับพิสูจน์ว่าถึง inbox
- บันทึก event ID ที่ส่งสำเร็จภายใต้ lock ใน Script Properties อายุสั้น มีการล้างรายการเก่าและขนาดจำกัด Duplicate ที่สำเร็จแล้วไม่ส่งซ้ำ โดย email change แยกสถานะตามปลายทาง
- ไม่ retry อัตโนมัติเมื่อผลไม่แน่นอน เพราะ timeout อาจเกิดหลังส่งแล้ว ยังมี crash window ระหว่างการส่งกับการบันทึกสถานะ จึงไม่อ้าง exactly-once delivery
- โควตาไม่พอ ล็อกไม่ได้ signature ไม่ผ่าน หรือ timeout ต้องคืน error ตามรูปแบบ Supabase Hook และไม่ปิดการยืนยันอีเมลเพื่อเลี่ยงปัญหา
- ยังมี Supabase Auth rate limits อื่น และโควตา Google ไม่ใช่การส่งไม่จำกัด

## การทดสอบและเกณฑ์เปิดใช้งาน

1. Unit tests: ลายเซ็นถูก/ผิด/หมดอายุ replay, payload ผิด, action ทุกชนิด, token mapping, URL allowlist, escaping, quota, lock, duplicate, partial email-change failure และ timeout/ผล JSON ผิดปกติ
2. รัน regression tests ของ dispatcher คำสั่งซื้อเดิมและระบบสมาชิก แยก mocked tests จากผลส่งจริงอย่างชัดเจน
3. ผู้ใช้เข้าสู่ Google และอนุญาต MailApp เอง ไม่ส่งรหัสผ่านหรือ secret ในแชต เก็บ deployment URL และ secrets ผ่านช่องทางตั้งค่าที่เหมาะสม
4. ก่อนเปิด hook ขอผู้ใช้ระบุอีเมลทดสอบที่ควบคุมเองและยินยอมรับอีเมล ระบุจำนวนการส่งจริงล่วงหน้า ไม่ส่งให้ลูกค้าจริงโดยพลการ
5. ทดสอบ cold/warm invocation ผ่าน relay ด้วยอีเมลทดสอบจริง บันทึกเวลาและตรวจ inbox/ลิงก์ยืนยันกับกู้รหัสผ่าน โดยไม่เผย token การทดสอบจำนวนน้อยไม่ใช่ SLA และไม่รับประกัน latency ทุกครั้ง
6. เปิด hook หลังผลทดสอบผ่านเท่านั้น แล้วทดสอบ signup/recovery แบบ end-to-end ที่ตกลงไว้ หาก timeout หรือผิดพลาดให้ปิด hook กลับค่าเดิมและแจ้งข้อจำกัดของบริการเดิม ไม่อ้างว่าระบบพร้อมใช้งาน
7. หากไม่สามารถเข้าถึง Google project/deploy หรือเวลาไม่ผ่าน ให้ส่งมอบโค้ดและขั้นตอนที่ทำได้ ระบุส่วนที่ยังไม่ได้เชื่อมจริงอย่างตรงไปตรงมา

## แหล่งอ้างอิง

- https://supabase.com/docs/guides/auth/auth-hooks
- https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/guides/services/quotas

## ขั้นตอนหลังอนุมัติ

เขียนแผน implementation ระบุไฟล์ tests การตั้งค่า deployment/secret และขั้นตอน rollback ให้ตรวจและเลือกวิธีดำเนินงานก่อนเริ่มเขียน product code
