/**
 * =========================================================================
 * MAXMUXSIX - Google Apps Script Email Dispatcher (ระบบส่งอีเมลคลาวด์ฟรี 24 ชม.)
 * =========================================================================
 * 
 * 📌 วัตถุประสงค์:
 * ส่งอีเมลยืนยันการสั่งซื้อ (Order Confirmation), ใบเสร็จรับเงิน และอีเมลต้อนรับสมาชิกใหม่
 * พร้อมดีไซน์ HTML สีดำ-ทองเตาถ่าน และรูปภาพสินค้าครบ 100% เข้าสู่ Gmail ผู้รับจริง
 * โดยทำงานบนเซิร์ฟเวอร์ Cloud ของ Google ตลอด 24 ชม. ไม่ต้องเปิดคอมพิวเตอร์ทิ้งไว้
 * 
 * -------------------------------------------------------------------------
 * 🚀 วิธีอัปเดต / ติดตั้งใน Google Apps Script (ทำเพียงครั้งเดียว):
 * -------------------------------------------------------------------------
 * 1. เปิดเว็บเบราว์เซอร์แล้วไปที่: https://script.google.com
 *    (เปิดโปรเจกต์เดิมของคุณ หรือกด "+ โครงการใหม่")
 * 
 * 2. ลบโค้ดเดิมในหน้าต่างออกทั้งหมด แล้ว "คัดลอกโค้ดทั้งหมดในไฟล์นี้" ไปวางแทนที่
 * 
 * 3. กดปุ่มรูปแผ่นดิสก์ "บันทึกโครงการ" (Save project หรือ Ctrl + S)
 * 
 * 4. กดปุ่มสีน้ำเงินด้านขวาบน: "ทำให้ใช้งานได้" (Deploy) > เลือก "จัดการการทำให้ใช้งานได้" (Manage deployments)
 *    - กดรูปดินสอ ✏️ (แก้ไข / Edit) ที่การเผยแพร่เดิม
 *    - ในช่อง "เวอร์ชัน" (Version): เลือก "เวอร์ชันใหม่" (New version) *** สำคัญมาก! เพื่อให้อัปเดตโค้ดล่าสุด ***
 *    - ตรวจสอบช่อง "ผู้มีสิทธิ์เข้าถึง" (Who has access): ต้องเป็น "ทุกคน" (Anyone)
 *    - กดปุ่ม "ทำให้ใช้งานได้" (Deploy)
 * 
 * 5. นำ Web App URL ที่ลงท้ายด้วย /exec มาใช้งานในหน้าเว็บ MAXMUXSIX
 *    (หรือใช้ URL เริ่มต้นที่ตั้งไว้ในระบบได้ทันที)
 * =========================================================================
 */

// =========================================================================
// 🔒 การตั้งค่าความปลอดภัย (Security Configuration)
// =========================================================================
var SECURITY_CONFIG = {
  // รหัสลับเฉพาะของร้าน MAXMUXSIX (ต้องตรงกับในหน้าเว็บ)
  SECRET_TOKEN: "MAXMUXSIX_SECURE_TOKEN_2026",
  MAX_SUBJECT_LEN: 150,
  MAX_BODY_LEN: 100000,
  ALLOWED_FROM_NAME: "MAXMUXSIX ข้าวหลามเตาถ่าน"
};

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseError) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    // 🔒 1. ตรวจสอบรหัสลับ (Secret Token) ป้องกันบุคคลภายนอกแอบใช้ส่งสแปม
    var clientToken = data.token || (e && e.parameter && e.parameter.token) || "";
    if (SECURITY_CONFIG.SECRET_TOKEN && clientToken !== SECURITY_CONFIG.SECRET_TOKEN) {
      return makeJsonResponse({
        status: "error",
        success: false,
        message: "⛔ ไม่อนุญาต: รหัสความปลอดภัย (Secret Token) ไม่ถูกต้องหรือขาดหายไป"
      });
    }

    // 🛡️ 2. ตรวจสอบโควตาคงเหลือของ Google Mail
    var remainingQuota = MailApp.getRemainingDailyQuota();
    if (remainingQuota < 1) {
      return makeJsonResponse({
        status: "error",
        success: false,
        message: "⚠️ โควตาส่งอีเมลประจำวันของ Google หมดแล้ว (กรุณารอ 24 ชม.)"
      });
    }

    var to = (data.to || data.email || "").toString().trim();
    var subject = (data.subject || "MAXMUXSIX ข้าวหลามเตาถ่าน").toString().trim();
    var htmlContent = data.html || data.htmlContent || "";
    var textContent = (data.text || data.textContent || "ขอบคุณสำหรับการสั่งซื้อกับ MAXMUXSIX").toString().trim();
    var fromName = (data.fromName || SECURITY_CONFIG.ALLOWED_FROM_NAME || "MAXMUXSIX ข้าวหลามเตาถ่าน").toString().trim();

    // 🛡️ 3. ตรวจสอบความถูกต้องของอีเมลผู้รับ
    if (!to || to.indexOf("@") === -1 || to.length > 100) {
      return makeJsonResponse({
        status: "error",
        success: false,
        message: "กรุณาระบุอีเมลผู้รับที่ถูกต้อง (Missing or invalid recipient 'to')"
      });
    }

    // 🛡️ 4. ป้องกัน Payload ขนาดใหญ่เกินปกติ
    if (subject.length > SECURITY_CONFIG.MAX_SUBJECT_LEN) {
      subject = subject.substring(0, SECURITY_CONFIG.MAX_SUBJECT_LEN);
    }
    if (htmlContent.length > SECURITY_CONFIG.MAX_BODY_LEN) {
      return makeJsonResponse({
        status: "error",
        success: false,
        message: "เนื้อหาอีเมลมีขนาดใหญ่เกินกว่าที่กำหนด"
      });
    }

    // ถ้าไม่มี HTML ให้แปลง text เป็น HTML แบบง่าย
    if (!htmlContent && textContent) {
      htmlContent = '<div style="font-family: sans-serif; padding: 16px; color: #222;">' +
        textContent.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>") +
        '</div>';
    }

    // ส่งอีเมลจริงผ่าน Google Mail Service
    MailApp.sendEmail({
      to: to,
      subject: subject,
      name: fromName,
      htmlBody: htmlContent,
      body: textContent
    });

    return makeJsonResponse({
      status: "success",
      success: true,
      message: "ส่งอีเมลสำเร็จผ่าน Google Apps Script ไปยัง " + to,
      recipient: to,
      remainingQuota: remainingQuota - 1,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return makeJsonResponse({
      status: "error",
      success: false,
      message: "เกิดข้อผิดพลาดในการส่งอีเมล: " + err.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var remaining = 0;
  try {
    remaining = MailApp.getRemainingDailyQuota();
  } catch (ignored) {}

  return makeJsonResponse({
    status: "online",
    service: "MAXMUXSIX Email Web App Service",
    timestamp: new Date().toISOString(),
    remainingDailyQuota: remaining,
    message: "ระบบส่งอีเมลคลาวด์ของ MAXMUXSIX ทำงานปกติ 24 ชั่วโมง พร้อมรับคำสั่งส่งอีเมลจากหน้าเว็บครับ"
  });
}

function makeJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ฟังก์ชันสำหรับกด "เรียกใช้" (Run) ใน Google Apps Script เพื่อขอสิทธิ์เข้าถึง (Authorization) หรือทดสอบสถานะ
function testRun() {
  var quota = 0;
  try {
    quota = MailApp.getRemainingDailyQuota();
  } catch (e) {
    quota = -1;
  }
  return { status: "ready", remainingDailyQuota: quota };
}
