/**
 * =========================================================================
 * MAXMUXSIX - Google Apps Script Email Dispatcher (ระบบส่งอีเมลคลาวด์ฟรี 24 ชม.)
 * =========================================================================
 * 
 * 📌 วัตถุประสงค์:
 * ส่งอีเมลยืนยันการสั่งซื้อ (Order Confirmation) และอีเมลต้อนรับสมาชิกใหม่ (Welcome Email)
 * พร้อมดีไซน์ HTML สีดำ-ทองเตาถ่าน และรูปภาพสินค้าครบ 100% เข้าสู่ Gmail ผู้รับจริง
 * โดยทำงานบนเซิร์ฟเวอร์ Cloud ของ Google ตลอด 24 ชม. ไม่ต้องเปิดคอมพิวเตอร์ทิ้งไว้
 * 
 * -------------------------------------------------------------------------
 * 🚀 วิธีติดตั้งใน 2 นาที (ทำเพียงครั้งเดียว):
 * -------------------------------------------------------------------------
 * 1. เปิดเว็บเบราว์เซอร์แล้วไปที่: https://script.google.com
 *    (ล็อกอินด้วยบัญชี Gmail ของคุณ เช่น tanatep23@gmail.com)
 * 
 * 2. กดปุ่ม "+ โครงการใหม่" (New project) ที่มุมซ้ายบน
 * 
 * 3. ลบโค้ดเริ่มต้นในหน้าต่างออกทั้งหมด แล้ว "คัดลอกโค้ดทั้งหมดในไฟล์นี้" ไปวางแทนที่
 * 
 * 4. กดปุ่มรูปแผ่นดิสก์ "บันทึกโครงการ" (Save project) หรือกด Ctrl + S
 * 
 * 5. กดปุ่มสีน้ำเงินด้านขวาบน: "ทำให้ใช้งานได้" (Deploy) > เลือก "การทำให้ใช้งานได้ใหม่" (New deployment)
 * 
 * 6. ในหน้าต่างที่เด้งขึ้นมา:
 *    - กดรูปฟันเฟือง ⚙️ ด้านซ้ายคำว่า "เลือกประเภท" แล้วเลือก "เว็บแอป" (Web app)
 *    - ช่อง "คำอธิบาย" (Description): พิมพ์ว่า MAXMUXSIX Email
 *    - ช่อง "ดำเนินการในฐานะ" (Execute as): เลือก "ฉัน (อีเมลของคุณ)"
 *    - ช่อง "ผู้มีสิทธิ์เข้าถึง" (Who has access): *** เลือก "ทุกคน" (Anyone) *** สำคัญมาก!
 * 
 * 7. กดปุ่ม "ทำให้ใช้งานได้" (Deploy)
 *    - Google จะขออนุญาต ให้กด "ให้สิทธิ์การเข้าถึง" (Authorize Access)
 *    - เลือกบัญชี Gmail ของคุณ
 *    - หากขึ้นเตือน "Google ยังไม่ได้ยืนยันแอปนี้" ให้กด "ขั้นสูง" (Advanced) > แล้วกด "ไปที่... (ไม่ปลอดภัย)" (Go to Untitled project)
 *    - กด "อนุญาต" (Allow)
 * 
 * 8. คัดลอก "URL ของเว็บแอป" (Web app URL) ที่ลงท้ายด้วย /exec
 *    เช่น: https://script.google.com/macros/s/AKfycbxxxxxxx/exec
 * 
 * 9. นำ URL มาวางในหน้าเว็บ MAXMUXSIX ในช่อง "Google Apps Script Web App URL" แล้วกดบันทึก!
 * =========================================================================
 */

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

    var to = data.to;
    var subject = data.subject || "MAXMUXSIX ข้าวหลามเตาถ่าน";
    var htmlContent = data.html || data.htmlContent || "";
    var textContent = data.text || data.textContent || "ขอบคุณสำหรับการสั่งซื้อกับ MAXMUXSIX";
    var fromName = data.fromName || "MAXMUXSIX ข้าวหลามเตาถ่าน";

    if (!to || to.indexOf("@") === -1) {
      return makeJsonResponse({
        status: "error",
        success: false,
        message: "กรุณาระบุอีเมลผู้รับที่ถูกต้อง (Missing valid recipient 'to')"
      });
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
  return makeJsonResponse({
    status: "online",
    service: "MAXMUXSIX Email Web App Service",
    timestamp: new Date().toISOString(),
    message: "ระบบส่งอีเมลคลาวด์ของ MAXMUXSIX ทำงานปกติ 24 ชั่วโมง พร้อมรับคำสั่งส่งอีเมลจากหน้าเว็บครับ"
  });
}

function makeJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
