/**
 * ⚠️ repo นี้มี LINE bot สองไฟล์ ให้เลือกติดตั้งเพียงไฟล์เดียว ในหนึ่งโปรเจกต์ Apps Script (วางทั้งคู่จะชื่อฟังก์ชันชนกัน)
 * =========================================================================
 * 🤖 MAXMUXSIX LINE LOG BOT & BROADCAST SYSTEM (Google Apps Script)
 * =========================================================================
 *
 * ความสามารถ:
 * 1. บันทึกข้อความและพิกัดที่ลูกค้าส่งมาลงแท็บ "Chat_History"
 * 2. ตอบรับสั้น ๆ ข้อความเดียว แล้วให้แอดมินตอบเองในแชต
 * 3. บรอดแคสต์ผ่านเมนูใน Google Sheet พร้อมทดสอบส่งและตรวจโควตา
 *
 * -------------------------------------------------------------------------
 * ⚙️ การตั้งค่าก่อนใช้งาน:
 * 0. (ความปลอดภัย) ตั้ง Script Property ชื่อ LINE_WEBHOOK_KEY เป็นรหัสสุ่ม 32 ตัวขึ้นไป
 *    แล้วใส่ Webhook URL ใน LINE Developers เป็น .../exec?key=รหัสเดียวกัน (ถ้าไม่ตั้ง บอทจะไม่ตอบ)
 * 1. ตั้ง Script Property ชื่อ LINE_CHANNEL_ACCESS_TOKEN เป็น token ของคุณ (ห้ามวางลงในไฟล์นี้)
 * 2. (ไม่บังคับ) ตั้ง Script Property ชื่อ LINE_ADMIN_USER_ID เพื่อใช้ทดสอบยิงข้อความเข้าแอดมิน
 * 3. Deploy > Manage deployments > Edit > New version > Deploy
 * 4. เปิด Google Sheet จะมีเมนูด้านบนชื่อ "📢 ระบบบรอดแคสต์ LINE" ปรากฏขึ้นอัตโนมัติ!
 * -------------------------------------------------------------------------
 */

// ค่าลับอยู่ใน Project Settings > Script Properties เท่านั้น ห้ามพิมพ์ลงในไฟล์นี้
function scriptProperty(name) {
  return PropertiesService.getScriptProperties().getProperty(name) || "";
}

// 🔑 1. Long-lived Channel Access Token จาก LINE Developers Console
const CHANNEL_ACCESS_TOKEN = scriptProperty("LINE_CHANNEL_ACCESS_TOKEN");

// 👤 2. LINE User ID ของแอดมิน (เอาไว้สำหรับทดสอบยิง Test Broadcast ก่อนส่งจริง)
// วิธีดู User ID: ดูได้จากแท็บ "Chat_History" เมื่อคุณพิมพ์ทักไลน์บอทเข้ามา จะมี User ID ขึ้นต้นด้วย U...
const ADMIN_USER_ID = scriptProperty("LINE_ADMIN_USER_ID");

// 🏪 3. ชื่อร้าน (ใช้ในหน้าตรวจสถานะ)
const SHOP_CONFIG = {
  shopName: "MAXMUXSIX ข้าวหลามเตาถ่าน"
};

// ข้อความตอบกลับของบอต
const ACK_TEXT = "ได้รับข้อความแล้วครับ ✅ กรุณารอแอดมินตอบกลับในแชตนี้";
const WELCOME_TEXT = "สวัสดีครับ ยินดีต้อนรับสู่ MAXMUXSIX ข้าวหลามเตาถ่าน 🎋\nพิมพ์ข้อความไว้ในแชตนี้ได้เลยครับ แล้วรอแอดมินตอบกลับ";

// =========================================================================
// 📢 BROADCAST & GOOGLE SHEETS CUSTOM MENU (ระบบเมนูบรอดแคสต์บน Google Sheet)
// =========================================================================

/**
 * สร้างเมนู "📢 ระบบบรอดแคสต์ LINE" อัตโนมัติเมื่อเปิด Google Sheets
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('📢 ระบบบรอดแคสต์ LINE')
      .addItem('🚀 1. บรอดแคสต์หาเพื่อนทุกคน (Broadcast to All)', 'menuBroadcastToAll')
      .addItem('🎯 2. บรอดแคสต์เฉพาะลูกค้าในชีต (Multicast)', 'menuBroadcastToSheetCustomers')
      .addItem('🧪 3. ทดสอบส่งเข้าไลน์แอดมิน (Test Send)', 'menuTestBroadcast')
      .addSeparator()
      .addItem('📊 4. ตรวจสอบโควตาข้อความ LINE คงเหลือ', 'menuCheckQuota')
      .addItem('📝 5. สร้าง/รีเซ็ตหน้าตั้งค่าบรอดแคสต์', 'menuSetupBroadcastSheet')
      .addToUi();
  } catch (e) {
    // โหมด Standalone หรือไม่มี UI
  }
}

/**
 * 1. เมนูส่ง Broadcast หาเพื่อนทุกคน (Broadcast to All Friends)
 */
function menuBroadcastToAll() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const draft = getBroadcastDraftFromSheet(ss);

  if (!draft || !draft.text) {
    ui.alert("⚠️ ไม่พบข้อความสำหรับบรอดแคสต์", "กรุณากรอกข้อความในแท็บ 'Broadcast' ช่อง 'ข้อความที่จะส่ง' ก่อนกดส่งครับ", ui.ButtonSet.OK);
    return;
  }

  // แจ้งเตือนยืนยันก่อนยิงจริง ป้องกันการเผลอกด
  const confirmMsg = 
    `⚠️ ยืนยันการส่งข้อความหา "เพื่อนทุกคนใน LINE OA"?\n\n` +
    `📌 แคมเปญ: ${draft.title || "-"}\n` +
    `💬 ข้อความ: "${draft.text.substring(0, 100)}${draft.text.length > 100 ? '...' : ''}"\n` +
    `🖼️ รูปภาพ: ${draft.imageUrl ? 'มีรูปภาพแนบ' : 'ไม่มี'}\n\n` +
    `*ข้อความจะถูกส่งหาผู้ติดตามทุกคน และคิดโควตาข้อความตามจำนวนเพื่อนจริง*`;

  const response = ui.alert("ยืนยันการส่ง Broadcast to All", confirmMsg, ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) {
    ui.alert("❌ ยกเลิกการส่งเรียบร้อยแล้ว");
    return;
  }

  const messages = buildBroadcastMessages(draft);
  const result = executeLineBroadcast(messages);

  if (result.success) {
    updateBroadcastStatus(ss, "ส่งสำเร็จ (Broadcast to All)", "ส่งหาเพื่อนทุกคนเรียบร้อย");
    logBroadcastHistory(ss, "Broadcast to All", draft, "ทุกคน (All Friends)", "สำเร็จ (200 OK)");
    ui.alert("🎉 ยิง Broadcast สำเร็จเรียบร้อย!", "ส่งข้อความหาเพื่อนทุกคนใน LINE OA แล้วครับ", ui.ButtonSet.OK);
  } else {
    updateBroadcastStatus(ss, "เกิดข้อผิดพลาด", result.error);
    logBroadcastHistory(ss, "Broadcast to All", draft, "-", "ล้มเหลว: " + result.error);
    ui.alert("❌ ส่งไม่สำเร็จ", "สาเหตุ: " + result.error, ui.ButtonSet.OK);
  }
}

/**
 * 2. เมนูส่ง Multicast เฉพาะลูกค้าในชีต (ลูกค้าที่เคยทักแชท / เคยสั่งซื้อ)
 */
function menuBroadcastToSheetCustomers() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const draft = getBroadcastDraftFromSheet(ss);

  if (!draft || !draft.text) {
    ui.alert("⚠️ ไม่พบข้อความสำหรับบรอดแคสต์", "กรุณากรอกข้อความในแท็บ 'Broadcast' ก่อนครับ", ui.ButtonSet.OK);
    return;
  }

  const userIds = getDistinctCustomerUserIds(ss);
  if (!userIds || userIds.length === 0) {
    ui.alert("⚠️ ไม่พบรายชื่อลูกค้า", "ยังไม่มีประวัติ User ID ของลูกค้าในแท็บ Chat_History หรือ Orders ครับ", ui.ButtonSet.OK);
    return;
  }

  const confirmMsg = 
    `🎯 ยืนยันการส่งข้อความหาลูกค้าในชีตจำนวน ${userIds.length} คน?\n\n` +
    `📌 แคมเปญ: ${draft.title || "-"}\n` +
    `💬 ข้อความ: "${draft.text.substring(0, 100)}${draft.text.length > 100 ? '...' : ''}"\n` +
    `👥 จำนวนผู้รับ: ${userIds.length} บัญชี\n\n` +
    `กด 'YES' เพื่อยิงข้อความทันที`;

  const response = ui.alert("ยืนยันการส่ง Targeted Multicast", confirmMsg, ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) {
    ui.alert("❌ ยกเลิกการส่งเรียบร้อยแล้ว");
    return;
  }

  const messages = buildBroadcastMessages(draft);
  const result = executeLineMulticast(userIds, messages);

  if (result.success) {
    updateBroadcastStatus(ss, "ส่งสำเร็จ (Multicast)", `ส่งถึง ${userIds.length} คนสำเร็จ`);
    logBroadcastHistory(ss, "Targeted Multicast", draft, `${userIds.length} คน`, "สำเร็จ (200 OK)");
    ui.alert("🎉 ยิง Multicast สำเร็จ!", `ส่งข้อความหาลูกค้าจำนวน ${userIds.length} คนเรียบร้อยแล้วครับ`, ui.ButtonSet.OK);
  } else {
    updateBroadcastStatus(ss, "เกิดข้อผิดพลาด", result.error);
    logBroadcastHistory(ss, "Targeted Multicast", draft, `${userIds.length} คน`, "ล้มเหลว: " + result.error);
    ui.alert("❌ ส่งไม่สำเร็จ", "สาเหตุ: " + result.error, ui.ButtonSet.OK);
  }
}

/**
 * 3. เมนูทดสอบส่งข้อความเข้าแอดมิน (Test Push Message)
 */
function menuTestBroadcast() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const draft = getBroadcastDraftFromSheet(ss);

  if (!draft || !draft.text) {
    ui.alert("⚠️ ไม่พบข้อความสำหรับทดสอบ", "กรุณากรอกข้อความในแท็บ 'Broadcast' ก่อนครับ", ui.ButtonSet.OK);
    return;
  }

  let targetUserId = ADMIN_USER_ID;
  if (!targetUserId) {
    // ถ้ายังไม่ได้ใส่ ID ในโค้ด ให้ลองดึง ID ล่าสุดจาก Chat_History
    const latestUser = getLatestChatUserId(ss);
    const input = ui.prompt(
      "🧪 ระบุ LINE User ID เพื่อทดสอบ",
      `กรุณาใส่ LINE User ID (ขึ้นต้นด้วย U...)\n(หรือใช้ ID ล่าสุดที่พบในชีต: ${latestUser || 'ไม่พบ'})`,
      ui.ButtonSet.OK_CANCEL
    );

    if (input.getSelectedButton() !== ui.Button.OK || !input.getResponseText().trim()) {
      ui.alert("❌ ยกเลิกการทดสอบ");
      return;
    }
    targetUserId = input.getResponseText().trim();
  }

  const messages = buildBroadcastMessages(draft);
  const result = executeLinePush(targetUserId, messages);

  if (result.success) {
    ui.alert("✅ ส่งข้อความทดสอบสำเร็จ!", `ส่งข้อความทดสอบไปยัง User ID: ${targetUserId} แล้วครับ ลองเปิดดูในแอป LINE ได้เลยครับ`, ui.ButtonSet.OK);
  } else {
    ui.alert("❌ ส่งทดสอบไม่สำเร็จ", "สาเหตุ: " + result.error, ui.ButtonSet.OK);
  }
}

/**
 * 4. เมนูตรวจสอบโควตาข้อความ LINE ประจำเดือน
 */
function menuCheckQuota() {
  const ui = SpreadsheetApp.getUi();
  const quotaInfo = getLineQuotaDetails();

  if (quotaInfo.error) {
    ui.alert("⚠️ ตรวจสอบโควตาไม่สำเร็จ", "สาเหตุ: " + quotaInfo.error, ui.ButtonSet.OK);
    return;
  }

  const msg = 
    `📊 สรุปโควตาข้อความ LINE ประจำเดือนนี้\n` +
    `----------------------------------------\n` +
    `• ประเภทแพ็กเกจ: ${quotaInfo.type}\n` +
    `• โควตาทั้งหมด: ${quotaInfo.total} ข้อความ\n` +
    `• ส่งไปแล้วในเดือนนี้: ${quotaInfo.used} ข้อความ\n` +
    `• คงเหลือสำหรับส่ง: ${quotaInfo.remaining} ข้อความ\n` +
    `----------------------------------------\n` +
    `*โควตาจะรีเซ็ตใหม่ทุกวันที่ 1 ของเดือนครับ*`;

  ui.alert("รายงานโควตาข้อความ LINE", msg, ui.ButtonSet.OK);
}

/**
 * 5. สร้างหรือรีเซ็ตหน้าแท็บ Broadcast ใน Google Sheet
 */
function menuSetupBroadcastSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupBroadcastSheet(ss);
  SpreadsheetApp.getUi().alert("✅ ตั้งค่าหน้า Broadcast และ Broadcast_History เรียบร้อยแล้วครับ!");
}

// =========================================================================
// 🚀 LINE MESSAGING API BROADCAST CALLERS
// =========================================================================

/**
 * ส่งข้อความ Broadcast หาเพื่อนทุกคน (Broadcast API)
 */
function executeLineBroadcast(messages) {
  const url = "https://api.line.me/v2/bot/message/broadcast";
  const payload = { messages: messages };

  const options = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const res = UrlFetchApp.fetch(url, options);
    const code = res.getResponseCode();
    if (code === 200) {
      return { success: true };
    }
    const resBody = res.getContentText();
    return { success: false, error: `HTTP ${code}: ${resBody}` };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * ส่งข้อความ Multicast เจาะจงเฉพาะกลุ่ม User ID (รองรับสูงสุด 500 คนต่อชุด)
 */
function executeLineMulticast(userIds, messages) {
  const url = "https://api.line.me/v2/bot/message/multicast";
  const CHUNK_SIZE = 500; // LINE API จำกัด 500 คนต่อ 1 request

  try {
    for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
      const chunk = userIds.slice(i, i + CHUNK_SIZE);
      const payload = {
        to: chunk,
        messages: messages
      };

      const options = {
        method: "post",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      const res = UrlFetchApp.fetch(url, options);
      const code = res.getResponseCode();
      if (code !== 200) {
        return { success: false, error: `HTTP ${code}: ${res.getContentText()}` };
      }
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * ส่งข้อความเดี่ยวหาแอดมินเพื่อทดสอบ (Push Message API)
 */
function executeLinePush(userId, messages) {
  const url = "https://api.line.me/v2/bot/message/push";
  const payload = {
    to: userId,
    messages: messages
  };

  const options = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const res = UrlFetchApp.fetch(url, options);
    const code = res.getResponseCode();
    if (code === 200) {
      return { success: true };
    }
    return { success: false, error: `HTTP ${code}: ${res.getContentText()}` };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * ดึงข้อมูลโควตาข้อความจาก LINE API
 */
function getLineQuotaDetails() {
  try {
    // 1. ตรวจสอบขีดจำกัดโควตา (Quota Limit)
    const quotaRes = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/quota", {
      headers: { "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN },
      muteHttpExceptions: true
    });
    
    // 2. ตรวจสอบการใช้งานแล้วในเดือนนี้ (Consumption)
    const useRes = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/quota/consumption", {
      headers: { "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN },
      muteHttpExceptions: true
    });

    if (quotaRes.getResponseCode() !== 200 || useRes.getResponseCode() !== 200) {
      return { error: `ไม่สามารถเชื่อมต่อ LINE API: ${quotaRes.getContentText()}` };
    }

    const quotaData = JSON.parse(quotaRes.getContentText());
    const useData = JSON.parse(useRes.getContentText());

    const total = quotaData.value || (quotaData.type === "none" ? "ไม่จำกัด" : 500);
    const used = useData.totalUsage || 0;
    const remaining = (typeof total === "number") ? (total - used) : "ไม่จำกัด";

    return {
      type: quotaData.type === "limited" ? "แบบจำกัด (Free / Basic Plan)" : "ไม่จำกัด (Pro Plan)",
      total: total,
      used: used,
      remaining: remaining
    };
  } catch (e) {
    return { error: e.toString() };
  }
}

// =========================================================================
// 🛠️ BROADCAST HELPERS & BUILDERS
// =========================================================================

/**
 * สร้าง Array ของ Message สำหรับส่ง (รองรับรูปภาพ + ข้อความ + Quick Reply)
 */
function buildBroadcastMessages(draft) {
  const messages = [];

  // 1. ถ้ามีรูปภาพ ให้สร้าง Image Message (ต้องเป็น https:// ตามข้อกำหนด LINE)
  if (draft.imageUrl && /^https:\/\//i.test(draft.imageUrl)) {
    messages.push({
      type: "image",
      originalContentUrl: draft.imageUrl,
      previewImageUrl: draft.imageUrl
    });
  }

  // 2. Text Message พร้อม Quick Reply
  const textMsg = {
    type: "text",
    text: draft.text
  };

  // แนบปุ่ม Quick Reply เฉพาะเมื่อระบุไว้ในชีต
  if (draft.quickReplyItems && draft.quickReplyItems.length > 0) {
    textMsg.quickReply = {
      items: draft.quickReplyItems.map(function(label) {
        return {
          type: "action",
          action: {
            type: "message",
            label: label.substring(0, 20),
            text: label
          }
        };
      })
    };
  }

  messages.push(textMsg);
  return messages;
}

/**
 * ดึงข้อมูลข้อความบรอดแคสต์ล่าสุดจากแท็บ "Broadcast"
 */
function getBroadcastDraftFromSheet(ss) {
  try {
    const sheet = ss.getSheetByName("Broadcast");
    if (!sheet) return null;

    const title = String(sheet.getRange("B3").getValue() || "").trim();
    const text = String(sheet.getRange("B4").getValue() || "").trim();
    const imageUrl = String(sheet.getRange("B5").getValue() || "").trim();
    const quickRepliesRaw = String(sheet.getRange("B6").getValue() || "").trim();

    let items = [];
    if (quickRepliesRaw) {
      items = quickRepliesRaw.split(/[,/|\n]/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
    }

    return {
      title: title,
      text: text,
      imageUrl: imageUrl,
      quickReplyItems: items
    };
  } catch (e) {
    return null;
  }
}

/**
 * อัปเดตสถานะการส่งในแท็บ Broadcast
 */
function updateBroadcastStatus(ss, status, detail) {
  try {
    const sheet = ss.getSheetByName("Broadcast");
    if (!sheet) return;
    const nowStr = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
    sheet.getRange("B7").setValue(safeCell(`${status} (${nowStr}) - ${detail}`));
  } catch (e) {}
}

/**
 * บันทึกประวัติการส่งบรอดแคสต์ลงแท็บ "Broadcast_History"
 */
function logBroadcastHistory(ss, type, draft, targetAudience, status) {
  try {
    let sheet = ss.getSheetByName("Broadcast_History");
    if (!sheet) {
      sheet = ss.insertSheet("Broadcast_History");
      sheet.appendRow(["วันที่-เวลา", "ประเภทการส่ง", "ชื่อแคมเปญ", "ข้อความ", "รูปภาพ", "กลุ่มเป้าหมาย", "สถานะ"]);
      sheet.setFrozenRows(1);
    }

    const nowStr = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
    sheet.appendRow([
      nowStr,
      type,
      draft.title || "-",
      draft.text || "-",
      draft.imageUrl || "-",
      targetAudience,
      status
    ].map(safeCell));
  } catch (e) {}
}

/**
 * ค้นหา User ID ที่ไม่ซ้ำจากแท็บ Chat_History และ Orders
 */
function getDistinctCustomerUserIds(ss) {
  const userMap = {};

  // 1. ดึงจาก Chat_History
  const chatSheet = ss.getSheetByName("Chat_History");
  if (chatSheet) {
    const data = chatSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const uid = String(data[i][1] || "").trim();
      if (uid && uid.startsWith("U")) {
        userMap[uid] = true;
      }
    }
  }

  // 2. ดึงจาก Orders
  const orderSheet = ss.getSheetByName("Orders");
  if (orderSheet) {
    const data = orderSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const uid = String(data[i][1] || "").trim();
      if (uid && uid.startsWith("U")) {
        userMap[uid] = true;
      }
    }
  }

  return Object.keys(userMap);
}

/**
 * หา User ID ล่าสุดจาก Chat_History สำหรับทดสอบ
 */
function getLatestChatUserId(ss) {
  const chatSheet = ss.getSheetByName("Chat_History");
  if (!chatSheet) return "";
  const data = chatSheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    const uid = String(data[i][1] || "").trim();
    if (uid && uid.startsWith("U")) {
      return uid;
    }
  }
  return "";
}

/**
 * ฟังก์ชันสร้างและจัดรูปแบบแท็บ "Broadcast"
 */
function setupBroadcastSheet(ss) {
  let sheet = ss.getSheetByName("Broadcast");
  if (!sheet) {
    sheet = ss.insertSheet("Broadcast");
  }

  sheet.clear();
  sheet.getRange("A1:B1").merge().setValue("📢 แผงควบคุมระบบบรอดแคสต์ LINE (LINE Broadcast Control Panel)")
    .setFontWeight("bold").setFontSize(14).setBackground("#0D2218").setFontColor("#FFFFFF");

  sheet.getRange("A2:B2").merge().setValue("💡 วิธีใช้งาน: กรอกข้อความที่ต้องการส่งด้านล่างนี้ จากนั้นคลิกเมนูด้านบน '📢 ระบบบรอดแคสต์ LINE' เพื่อสั่งส่ง")
    .setFontStyle("italic").setFontColor("#555555");

  const fields = [
    ["📌 หัวข้อแคมเปญ (Campaign Title):", "โปรโมชั่นพิเศษประจำสัปดาห์ 🎋"],
    ["💬 ข้อความที่จะส่ง (Message Text):", "🔥 พิเศษเฉพาะลูกค้าคนพิเศษ! สั่งจองข้าวหลามเตาถ่านวันนี้ 5 กระบอก รับฟรีทันที 1 กระบอกเล็ก!\n\n🎋 กะทิสดสูตรโบราณ ย่างเตาถ่านหอมกรุ่น สดใหม่ทุกวันครับ\nกดปุ่มสั่งซื้อด้านล่างได้เลยครับ 👇"],
    ["🖼️ ลิงก์รูปภาพ (Image URL - ใส่หรือไม่ใส่ก็ได้):", "https://raw.githubusercontent.com/OkayOkay101/MAXMUXSIX-ONLINEWEB/main/max_1.jpg"],
    ["⚡ ปุ่ม Quick Reply (คั่นด้วยจุลภาค ,):", "🛒 สั่งซื้อเลย, 📋 ดูเมนู, 💰 ดูโปรโมชั่น, 👤 คุยกับแอดมิน"],
    ["📊 สถานะการส่งล่าสุด (Status):", "พร้อมใช้งาน (ยังไม่มีการส่ง)"]
  ];

  for (let i = 0; i < fields.length; i++) {
    const row = i + 3;
    sheet.getRange(row, 1).setValue(fields[i][0]).setFontWeight("bold").setBackground("#F3F4F6");
    sheet.getRange(row, 2).setValue(fields[i][1]);
  }

  sheet.setColumnWidth(1, 260);
  sheet.setColumnWidth(2, 600);
  sheet.getRange("B4").setWrap(true);
}

// =========================================================================
// 🌐 WEB SERVER HANDLERS (doGet & doPost)
// =========================================================================

/**
 * ฟังก์ชันรับคำขอแบบ GET (เช็คสถานะผ่านเว็บเบราว์เซอร์ ไม่ติด Error 302)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    botName: SHOP_CONFIG.shopName,
    message: "LINE Webhook & Broadcast System is running OK! (ระบบพร้อมทำงาน 24 ชม.)",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// Customer text must stay text: a leading = + - @ would otherwise run as a Sheet formula.
function safeCell(value) {
  return typeof value === "string" && value !== "-" && /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

// Apps Script cannot read x-line-signature, so the webhook URL carries a secret: .../exec?key=<LINE_WEBHOOK_KEY>
// Stays closed until the Script Property LINE_WEBHOOK_KEY (32+ characters) is set.
function isTrustedWebhook(e) {
  const expected = PropertiesService.getScriptProperties().getProperty("LINE_WEBHOOK_KEY") || "";
  const provided = e && e.parameter && typeof e.parameter.key === "string" ? e.parameter.key : "";
  return expected.length >= 32 && constantTimeEqual(provided, expected);
}

/**
 * ฟังก์ชันรับ Webhook POST Event จาก LINE Messaging API
 */
function doPost(e) {
  let lock = null;
  let lockAcquired = false;
  try {
    if (!isTrustedWebhook(e)) {
      return ContentService.createTextOutput("OK");
    }

    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput("OK");
    }

    if (typeof LockService !== "undefined" && LockService.getScriptLock) {
      lock = LockService.getScriptLock();
      lockAcquired = lock.tryLock(10000);
      if (!lockAcquired) {
        return ContentService.createTextOutput("OK");
      }
    }

    const body = JSON.parse(e.postData.contents);
    const events = body.events;

    // กรณี LINE กดปุ่ม Verify Webhook (events จะว่างเปล่า)
    if (!events || events.length === 0) {
      return ContentService.createTextOutput("OK");
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initDatabaseSheets(ss);

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const replyToken = event.replyToken;
      const userId = event.source ? event.source.userId : "";

      // 1. กรณีผู้ใช้แอดไลน์หรือปลดบล็อก (Follow Event) -> ส่งข้อความต้อนรับทันที
      if (event.type === "follow") {
        logChat(ss, userId, "[FOLLOW: เพิ่มเพื่อนใหม่]", "ส่งข้อความต้อนรับ");
        sendLineReply(replyToken, [{ type: "text", text: WELCOME_TEXT }]);
        continue;
      }

      // 2. กรณีผู้ใช้ส่งข้อความ Text
      if (event.type === "message" && event.message.type === "text") {
        const rawText = event.message.text.trim();
        handleUserMessage(ss, replyToken, userId, rawText);
      }

      // 3. กรณีผู้ใช้ส่ง Location (แชร์พิกัด)
      if (event.type === "message" && event.message.type === "location") {
        const address = event.message.address || `${event.message.latitude}, ${event.message.longitude}`;
        handleUserMessage(ss, replyToken, userId, "พิกัด: " + address);
      }
    }
  } catch (err) {
    console.error("Critical Webhook Error: " + err.toString());
  } finally {
    if (lock && lockAcquired) {
      try { lock.releaseLock(); } catch (_) {}
    }
  }

  return ContentService.createTextOutput("OK");
}

// =========================================================================
// 🧠 รับข้อความ: จดลงชีตและตอบรับ
// =========================================================================

function handleUserMessage(ss, replyToken, userId, text) {
  // จดก่อนตอบ: ถึง LINE จะปฏิเสธการตอบ ข้อความก็ยังอยู่ในชีต
  logChat(ss, userId, text, "ตอบรับข้อความ");
  sendLineReply(replyToken, [{ type: "text", text: ACK_TEXT }]);
}

function sendLineReply(replyToken, messages) {
  const url = "https://api.line.me/v2/bot/message/reply";
  const payload = { replyToken: replyToken, messages: messages };
  const options = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  const res = UrlFetchApp.fetch(url, options);
  if (res.getResponseCode() !== 200) {
    console.error("LINE reply failed: " + res.getResponseCode() + " " + res.getContentText());
  }
}

// =========================================================================
// 🗄️ DATABASE & STATE MANAGEMENT (Google Sheets)
// =========================================================================

function initDatabaseSheets(ss) {
  let chatSheet = ss.getSheetByName("Chat_History");
  if (!chatSheet) {
    chatSheet = ss.insertSheet("Chat_History");
    chatSheet.appendRow(["วันที่-เวลา", "LINE User ID", "ข้อความลูกค้า", "การตอบกลับของระบบ"]);
    chatSheet.setFrozenRows(1);
  }

  let broadcastSheet = ss.getSheetByName("Broadcast");
  if (!broadcastSheet) {
    setupBroadcastSheet(ss);
  }
}

function logChat(ss, userId, userMessage, botReply) {
  try {
    const sheet = ss.getSheetByName("Chat_History");
    if (!sheet) throw new Error("sheet not found");
    sheet.appendRow([new Date(), userId, userMessage, botReply].map(safeCell));
  } catch (err) {
    console.error("Chat_History write failed: " + err.message);
  }
}
