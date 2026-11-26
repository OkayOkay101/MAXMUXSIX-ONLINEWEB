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
 * 5. นำ Web App URL ที่ลงท้ายด้วย /exec มาใช้งานในระบบฝั่งเซิร์ฟเวอร์เท่านั้น (ไม่ใส่ token ใน query string)
 *
 * 6. เลือกฟังก์ชัน rotateRelayToken แล้วกด "เรียกใช้" เพื่อสร้างรหัสลับ (ถ้าไม่ทำ ระบบจะไม่ส่งอีเมลเลย)
 * =========================================================================
 */

// =========================================================================
// 🔒 การตั้งค่าความปลอดภัย (Security Configuration)
// =========================================================================
var SECURITY_CONFIG = {
  MAX_SUBJECT_LEN: 150,
  MAX_BODY_LEN: 100000,
  ALLOWED_FROM_NAME: "MAXMUXSIX ข้าวหลามเตาถ่าน"
};

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  var diff = a.length ^ b.length;
  var len = Math.max(a.length, b.length);
  for (var i = 0; i < len; i++) {
    var ca = i < a.length ? a.charCodeAt(i) : 0;
    var cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

function isValidSingleRecipient(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 100 || /[\s,;<>()\x00-\x1f\x7f]/.test(value)) {
    return false;
  }
  var parts = value.split("@");
  return parts.length === 2 &&
    parts[0].length > 0 && parts[0].length <= 64 &&
    /^[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+(?:\.[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+)*$/.test(parts[0]) &&
    /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(parts[1]);
}

// 🔑 หมุนรหัสลับ: เลือกฟังก์ชันนี้แล้วกด "เรียกใช้" (Run) ในหน้า Apps Script
// รหัสใหม่จะถูกเก็บใน Script Properties (ORDER_RELAY_TOKEN) เท่านั้น ห้ามนำไปใส่ในโค้ดหรือหน้าเว็บ
function rotateRelayToken() {
  PropertiesService.getScriptProperties()
    .setProperty("ORDER_RELAY_TOKEN", (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ""));
  return { status: "rotated", property: "ORDER_RELAY_TOKEN" };
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var acquired = false;

  try {
    acquired = lock.tryLock(15000);
    if (!acquired) {
      return makeJsonResponse({
        status: "error",
        success: false,
        message: "ระบบกำลังประมวลผลคำขออื่นอยู่ กรุณาลองใหม่อีกครั้ง"
      });
    }

    var data = {};
    if (e && e.postData && typeof e.postData.contents === "string") {
      try {
        var parsed = JSON.parse(e.postData.contents);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          data = parsed;
        }
      } catch (parseError) {
        data = {};
      }
    }

    // 🔒 1. ตรวจสอบรหัสลับ (Secret Token) จาก POST body เท่านั้น (ไม่รับจาก query string)
    var clientToken = typeof data.token === "string" ? data.token : "";
    // ปิดไว้เป็นค่าเริ่มต้น: ถ้ายังไม่ได้ตั้งรหัส หรือรหัสสั้นเกินไป จะปฏิเสธทุกคำขอ
    var relayToken = PropertiesService.getScriptProperties().getProperty("ORDER_RELAY_TOKEN") || "";
    if (relayToken.length < 32 || !constantTimeEqual(clientToken, relayToken)) {
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
    var subject = (data.subject || SECURITY_CONFIG.ALLOWED_FROM_NAME).toString().replace(/[\x00-\x1f\x7f]+/g, " ").trim();
    var htmlContent = typeof data.html === "string" ? data.html : (typeof data.htmlContent === "string" ? data.htmlContent : "");
    var textContent = (data.text || data.textContent || "ขอบคุณสำหรับการสั่งซื้อกับ MAXMUXSIX").toString().trim();
    var fromName = SECURITY_CONFIG.ALLOWED_FROM_NAME;

    // 🛡️ 3. ตรวจสอบความถูกต้องของอีเมลผู้รับ (รับเฉพาะ 1 อีเมลเดี่ยว ป้องกัน header/multi-recipient injection)
    if (!isValidSingleRecipient(to)) {
      return makeJsonResponse({
        status: "error",
        success: false,
        message: "กรุณาระบุอีเมลผู้รับที่ถูกต้อง (Missing or invalid recipient 'to')"
      });
    }

    // 🛡️ 4. ป้องกัน Payload ขนาดใหญ่เกินปกติ
    if (!subject) {
      subject = SECURITY_CONFIG.ALLOWED_FROM_NAME;
    }
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
        textContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>") +
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
      message: "เกิดข้อผิดพลาดในการส่งอีเมล กรุณาลองใหม่ภายหลัง"
    });
  } finally {
    if (acquired) {
      try {
        lock.releaseLock();
      } catch (ignored) {}
    }
  }
}

function doGet(e) {
  return makeJsonResponse({
    status: "online",
    service: "MAXMUXSIX Email Web App Service",
    timestamp: new Date().toISOString(),
    message: "ระบบส่งอีเมลคลาวด์ของ MAXMUXSIX ทำงานปกติ 24 ชั่วโมง พร้อมรับคำสั่งส่งอีเมลจากระบบเซิร์ฟเวอร์ครับ"
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
