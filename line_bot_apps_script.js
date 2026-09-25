/**
 * =========================================================================
 * 🤖 UPGRADED LINE OFFICIAL ACCOUNT CHATBOT & BROADCAST SYSTEM
 * (Google Apps Script - ระบบแชทบอทตอบคำถามอัตโนมัติ + ระบบบรอดแคสต์ผ่านชีต)
 * =========================================================================
 * 
 * 🌟 ความสามารถหลักของระบบ:
 * 1. 📢 One-Click LINE Broadcast: ยิงบรอดแคสต์หาเพื่อนทุกคน หรือเฉพาะลูกค้าเก่า ผ่านเมนูใน Google Sheets
 * 2. 🧪 Test Before Send: มีระบบทดสอบยิงเข้าไลน์ตัวเองก่อน เพื่อตรวจดูความสวยงามก่อนยิงหาลูกค้าจริง
 * 3. 📊 Quota Checker: ตรวจสอบโควตาข้อความคงเหลือประจำเดือนของ LINE ได้ทันทีในคลิกเดียว
 * 4. 📋 Smart Intent Routing: ตอบคำถามยอดฮิตอัตโนมัติ (เมนู, ราคา, โปรโมชั่น, พิกัด, ค่าส่ง, บัญชี, ติดต่อคน)
 * 5. 📑 Dynamic FAQ from Google Sheets: เพิ่มคำถาม-คำตอบเองในชีตได้ทันที ไม่ต้องแตะโค้ด
 * 6. 🛒 Multi-Turn Conversation (Order Wizard): จำบริบท ถาม-ตอบเป็นลำดับขั้นตอน บันทึกคำสั่งซื้อลงชีต
 * 7. ⚡ Contextual Quick Reply: มีปุ่มนำทางลอยให้ลูกค้ากดได้ทันทีทุกข้อความ
 * 8. 🛡️ Robust Webhook Handler: รองรับปุ่ม Verify, กัน Error 302, มีหน้า doGet เช็คสถานะ 24 ชม.
 * 
 * -------------------------------------------------------------------------
 * ⚙️ การตั้งค่าก่อนใช้งาน:
 * 1. ใส่ CHANNEL_ACCESS_TOKEN ของคุณที่บรรทัดด้านล่าง
 * 2. (ไม่บังคับ) ใส่ ADMIN_USER_ID เพื่อใช้ทดสอบยิงข้อความทดสอบเข้าแอดมิน
 * 3. Deploy > Manage deployments > Edit > New version > Deploy
 * 4. เปิด Google Sheet จะมีเมนูด้านบนชื่อ "📢 ระบบบรอดแคสต์ LINE" ปรากฏขึ้นอัตโนมัติ!
 * -------------------------------------------------------------------------
 */

// 🔑 1. ใส่ Long-lived Channel Access Token จาก LINE Developers Console
const CHANNEL_ACCESS_TOKEN = "ใส่_CHANNEL_ACCESS_TOKEN_ตรงนี้";

// 👤 2. ใส่ LINE User ID ของแอดมิน (เอาไว้สำหรับทดสอบยิง Test Broadcast ก่อนส่งจริง)
// วิธีดู User ID: ดูได้จากแท็บ "Chat_History" เมื่อคุณพิมพ์ทักไลน์บอทเข้ามา จะมี User ID ขึ้นต้นด้วย U...
const ADMIN_USER_ID = "ใส่_LINE_USER_ID_ของแอดมิน_ตรงนี้";

// 🏪 3. ข้อมูลร้านค้า (ปรับเปลี่ยนให้ตรงกับธุรกิจของคุณได้ทันที)
const SHOP_CONFIG = {
  shopName: "MAXMUXSIX ข้าวหลามเตาถ่าน",
  phone: "081-234-5678",
  businessHours: "ทุกวัน 08:00 - 18:00 น.",
  address: "ร้าน MAXMUXSIX ถนนสายหลัก ตลาดเตาถ่าน",
  promptPay: "0812345678 (พร้อมเพย์: นายสมศักดิ์ ข้าวหลามทอง)",
  bankAccount: "ธ.กสิกรไทย 123-4-56789-0 (ชื่อบัญชี: บจก. แม็กซ์มักซ์ซิกส์)"
};

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
  if (!targetUserId || targetUserId === "ใส่_LINE_USER_ID_ของแอดมิน_ตรงนี้") {
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

  // 1. ถ้ามีรูปภาพ ให้สร้าง Image Message
  if (draft.imageUrl && /^https?:\/\//i.test(draft.imageUrl)) {
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

  // สร้าง Quick Reply ตามที่ระบุไว้ หรือใช้ค่าเริ่มต้น
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
  } else {
    textMsg.quickReply = getMainQuickReply();
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
    sheet.getRange("B7").setValue(`${status} (${nowStr}) - ${detail}`);
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
    ]);
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

/**
 * ฟังก์ชันรับ Webhook POST Event จาก LINE Messaging API
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput("OK");
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
        sendWelcomeMessage(replyToken);
        logChat(ss, userId, "[FOLLOW: เพิ่มเพื่อนใหม่]", "ส่งข้อความต้อนรับ");
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
  }

  return ContentService.createTextOutput("OK");
}

// =========================================================================
// 🧠 CORE CONVERSATION ENGINE (ระบบประมวลผลบทสนทนา)
// =========================================================================

function handleUserMessage(ss, replyToken, userId, text) {
  const lowerText = text.toLowerCase();

  // 1. ตรวจสอบการยกเลิก / รีเซ็ต
  if (lowerText === "ยกเลิก" || lowerText === "เริ่มใหม่" || lowerText === "เมนูหลัก" || lowerText === "menu") {
    clearUserState(ss, userId);
    sendWelcomeMessage(replyToken, "🔄 กลับสู่เมนูหลักเรียบร้อยแล้วครับ! เลือกหัวข้อที่สนใจได้เลยครับ 👇");
    logChat(ss, userId, text, "รีเซ็ตสถานะกลับสู่เมนูหลัก");
    return;
  }

  // 2. ตรวจสอบขั้นตอนการคุยต่อเนื่อง (Multi-Step Conversation)
  const state = getUserState(ss, userId);
  if (state && state.step) {
    const isStepHandled = handleMultiStepFlow(ss, replyToken, userId, text, state);
    if (isStepHandled) return;
  }

  // 3. Smart Intent Matching (จับใจความสำคัญของคำถามยอดฮิต)
  const intentResult = matchSmartIntents(text);
  if (intentResult) {
    sendLineReply(replyToken, intentResult.messages);
    logChat(ss, userId, text, intentResult.intentName);

    if (intentResult.startFlow === "ORDER_FLOW") {
      setUserState(ss, userId, "ORDER_STEP_1_SELECT_PRODUCT", {});
    }
    return;
  }

  // 4. Dynamic Sheet FAQ (ดึงคำตอบจากแท็บ FAQ ในชีต)
  const faqAnswer = searchFaqFromSheet(ss, text);
  if (faqAnswer) {
    sendLineReply(replyToken, [
      {
        type: "text",
        text: faqAnswer,
        quickReply: getGeneralQuickReply()
      }
    ]);
    logChat(ss, userId, text, "[FAQ-SHEET]: " + faqAnswer.substring(0, 30));
    return;
  }

  // 5. Fallback Handler เมื่อไม่เข้าใจคำถาม
  sendFallbackMessage(replyToken, text);
  logChat(ss, userId, text, "[FALLBACK]: ไม่เข้าใจคำถาม");
}

function matchSmartIntents(text) {
  const t = text.toLowerCase();

  // ทักทาย
  if (/^(สวัสดี|ดีครับ|ดีค่ะ|หวัดดี|hello|hi|เริ่ม|สอบถาม)/.test(t)) {
    return {
      intentName: "GREETING",
      messages: [{
        type: "text",
        text: `ยินดีต้อนรับสู่ ${SHOP_CONFIG.shopName} ครับ! 🌾🔥\n\nยินดีให้บริการครับ ลูกค้าสามารถกดเลือกหัวข้อที่ต้องการ หรือพิมพ์สอบถามได้เลยครับ`,
        quickReply: getMainQuickReply()
      }]
    };
  }

  // สั่งซื้อ
  if (/(สั่งซื้อ|สั่งของ|ซื้อ|จอง|สั่งข้าวหลาม|order)/.test(t)) {
    return {
      intentName: "START_ORDER",
      startFlow: "ORDER_FLOW",
      messages: [{
        type: "text",
        text: "🛒 เริ่มต้นการสั่งซื้อ/สั่งจองล่วงหน้า\n\nกรุณาเลือกชุดสินค้าที่ต้องการได้เลยครับ 👇",
        quickReply: {
          items: [
            { type: "action", action: { type: "message", label: "ชุดคลาสสิก (3 กระบอก)", text: "ชุดคลาสสิก (3 กระบอก)" } },
            { type: "action", action: { type: "message", label: "ชุดครอบครัว (5 กระบอก)", text: "ชุดครอบครัว (5 กระบอก)" } },
            { type: "action", action: { type: "message", label: "ชุดจุใจ (10 กระบอก)", text: "ชุดจุใจ (10 กระบอก)" } },
            { type: "action", action: { type: "message", label: "❌ ยกเลิก", text: "ยกเลิก" } }
          ]
        }
      }]
    };
  }

  // เมนูและราคา
  if (/(เมนู|ราคา|สินค้า|มีอะไรบ้าง|ขายอะไร|ไส้)/.test(t)) {
    return {
      intentName: "SHOW_MENU",
      messages: [{
        type: "text",
        text: `📋 เมนูแนะนำของ ${SHOP_CONFIG.shopName} 🎋\n` +
              `------------------------------------\n` +
              `1. ข้าวหลามกะทิสดถั่วดำ - 50.- / กระบอก\n` +
              `2. ข้าวหลามข้าวเหนียวดำเผือกหอม - 60.- / กระบอก\n` +
              `3. ข้าวหลามกะทิลาวามะพร้าวอ่อน - 70.- / กระบอก\n` +
              `4. ข้าวหลามชาเขียวมัทฉะถั่วแดง - 75.- / กระบอก\n\n` +
              `🔥 เซ็ตสุดคุ้ม:\n` +
              `• เซ็ตครอบครัว 5 กระบอก เพียง 270.- (ปกติ 300.-)\n` +
              `• ข้าวหลามย่างเตาถ่านแท้ หอม ละมุน หวานมันกลมกล่อม`,
        quickReply: {
          items: [
            { type: "action", action: { type: "message", label: "🛒 สั่งซื้อเลย", text: "สั่งซื้อ" } },
            { type: "action", action: { type: "message", label: "💰 ดูโปรโมชั่น", text: "โปรโมชั่น" } },
            { type: "action", action: { type: "message", label: "🚚 ค่าจัดส่ง", text: "ค่าจัดส่ง" } },
            { type: "action", action: { type: "message", label: "🏠 เมนูหลัก", text: "เมนูหลัก" } }
          ]
        }
      }]
    };
  }

  // โปรโมชั่น
  if (/(โปร|โปรโมชั่น|ส่วนลด|ลดราคา|แถม|พิเศษ)/.test(t)) {
    return {
      intentName: "PROMOTION",
      messages: [{
        type: "text",
        text: `🎉 โปรโมชั่นพิเศษประจำเดือนนี้!\n` +
              `------------------------------------\n` +
              `✨ สั่งครบ 10 กระบอก จัดส่งฟรีทั่วประเทศ!\n` +
              `✨ ลูกค้าสั่งซื้อครั้งแรก รับส่วนลดทันที 20 บาท\n` +
              `✨ สั่งจองล่วงหน้า 1 วัน แถมฟรี 1 กระบอกเล็ก! 🎋`,
        quickReply: {
          items: [
            { type: "action", action: { type: "message", label: "🛒 สั่งซื้อสินค้า", text: "สั่งซื้อ" } },
            { type: "action", action: { type: "message", label: "📋 ดูเมนูสินค้า", text: "เมนู" } },
            { type: "action", action: { type: "message", label: "🏠 เมนูหลัก", text: "เมนูหลัก" } }
          ]
        }
      }]
    };
  }

  // การจัดส่ง
  if (/(ส่ง|ค่าส่ง|รอบส่ง|จัดส่ง|ปลายทาง|ขนส่ง)/.test(t)) {
    return {
      intentName: "SHIPPING_INFO",
      messages: [{
        type: "text",
        text: `🚚 ข้อมูลการจัดส่งของทางร้าน\n` +
              `------------------------------------\n` +
              `• รอบจัดส่ง: ทุกวันจันทร์ - เสาร์ (ตัดรอบ 10.00 น.)\n` +
              `• กทม.และปริมณฑล: ได้รับวันถัดไปทันที\n` +
              `• ต่างจังหวัด: 1-2 วันทำการ (แพ็กสูญญากาศรักษาความสดใหม่)\n` +
              `• ค่าจัดส่งเริ่มต้น 50 บาท (สั่งครบ 500 บาท ส่งฟรี!)`,
        quickReply: {
          items: [
            { type: "action", action: { type: "message", label: "🛒 สั่งซื้อเลย", text: "สั่งซื้อ" } },
            { type: "action", action: { type: "message", label: "📍 หน้าร้านอยู่ที่ไหน", text: "หน้าร้าน" } },
            { type: "action", action: { type: "message", label: "🏠 เมนูหลัก", text: "เมนูหลัก" } }
          ]
        }
      }]
    };
  }

  // หน้าร้าน
  if (/(ร้าน|หน้าร้าน|พิกัด|เปิดกี่โมง|ปิดกี่โมง|ที่อยู่|แผนที่|อยู่ที่ไหน|สาขา)/.test(t)) {
    return {
      intentName: "STORE_LOCATION",
      messages: [{
        type: "text",
        text: `📍 ข้อมูลหน้าร้าน ${SHOP_CONFIG.shopName}\n` +
              `------------------------------------\n` +
              `🏠 ที่อยู่: ${SHOP_CONFIG.address}\n` +
              `⏰ เวลาทำการ: ${SHOP_CONFIG.businessHours}\n` +
              `📞 โทร: ${SHOP_CONFIG.phone}\n\n` +
              `แวะมาชิมร้อนๆ จากเตาถ่านได้ทุกวันเลยครับ มีที่จอดรถสะดวกสบายครับ! 🚗`,
        quickReply: {
          items: [
            { type: "action", action: { type: "location", label: "📌 แชร์พิกัดของคุณ" } },
            { type: "action", action: { type: "message", label: "📋 เมนูสินค้า", text: "เมนู" } },
            { type: "action", action: { type: "message", label: "👤 โทรหาหน้าร้าน", text: "ติดต่อแอดมิน" } },
            { type: "action", action: { type: "message", label: "🏠 เมนูหลัก", text: "เมนูหลัก" } }
          ]
        }
      }]
    };
  }

  // การชำระเงิน
  if (/(โอน|ชำระเงิน|เลขบัญชี|จ่ายเงิน|พร้อมเพย์|ธนาคาร|คิวอาร์|qr)/.test(t)) {
    return {
      intentName: "PAYMENT_INFO",
      messages: [{
        type: "text",
        text: `💳 ช่องทางการชำระเงิน\n` +
              `------------------------------------\n` +
              `1. พร้อมเพย์: ${SHOP_CONFIG.promptPay}\n` +
              `2. บัญชีธนาคาร: ${SHOP_CONFIG.bankAccount}\n\n` +
              `⚠️ โอนเงินแล้วสามารถส่งรูปสลิปเข้ามาในแชทนี้ได้เลยครับ`,
        quickReply: {
          items: [
            { type: "action", action: { type: "message", label: "🛒 สั่งซื้อสินค้า", text: "สั่งซื้อ" } },
            { type: "action", action: { type: "message", label: "👤 แจ้งแอดมิน", text: "ติดต่อแอดมิน" } },
            { type: "action", action: { type: "message", label: "🏠 เมนูหลัก", text: "เมนูหลัก" } }
          ]
        }
      }]
    };
  }

  // ติดต่อคน / แอดมิน
  if (/(แอดมิน|คน|คุยกับคน|ติดต่อ|โทร|เจ้าหน้าที่|พนักงาน)/.test(t)) {
    return {
      intentName: "CONTACT_ADMIN",
      messages: [{
        type: "text",
        text: `👤 ติดต่อทีมงาน / แอดมิน\n` +
              `------------------------------------\n` +
              `🔔 แจ้งเตือนแอดมินให้แล้วครับ!\n\n` +
              `📞 โทรด่วน: ${SHOP_CONFIG.phone}\n` +
              `⏰ เวลาทำการ: ${SHOP_CONFIG.businessHours}\n\n` +
              `พิมพ์ข้อความทิ้งไว้ได้เลยครับ เจ้าหน้าที่จะรีบเข้ามาตอบกลับโดยเร็วที่สุดครับ!`,
        quickReply: {
          items: [
            { type: "action", action: { type: "message", label: "📋 ดูเมนูสินค้า", text: "เมนู" } },
            { type: "action", action: { type: "message", label: "🏠 เมนูหลัก", text: "เมนูหลัก" } }
          ]
        }
      }]
    };
  }

  return null;
}

// Flow การสั่งซื้อต่อเนื่อง
function handleMultiStepFlow(ss, replyToken, userId, text, state) {
  const step = state.step;
  const data = state.data || {};

  if (step === "ORDER_STEP_1_SELECT_PRODUCT") {
    data.product = text;
    setUserState(ss, userId, "ORDER_STEP_2_QUANTITY", data);

    sendLineReply(replyToken, [{
      type: "text",
      text: `รับทราบครับ: คุณเลือก "${text}" 🎋\n\nต้องการรับจำนวนกี่ชุดดีครับ? สามารถกดเลือกหรือพิมพ์ระบุได้เลยครับ`,
      quickReply: {
        items: [
          { type: "action", action: { type: "message", label: "1 ชุด", text: "1 ชุด" } },
          { type: "action", action: { type: "message", label: "2 ชุด", text: "2 ชุด" } },
          { type: "action", action: { type: "message", label: "3 ชุด", text: "3 ชุด" } },
          { type: "action", action: { type: "message", label: "5 ชุด (ส่งฟรี)", text: "5 ชุด" } },
          { type: "action", action: { type: "message", label: "❌ ยกเลิก", text: "ยกเลิก" } }
        ]
      }
    }]);
    return true;
  }

  if (step === "ORDER_STEP_2_QUANTITY") {
    data.quantity = text;
    setUserState(ss, userId, "ORDER_STEP_3_CONTACT_INFO", data);

    sendLineReply(replyToken, [{
      type: "text",
      text: `บันทึกจำนวน "${text}" แล้วครับ ✅\n\nรบกวนแจ้ง "ชื่อผู้รับ + เบอร์โทร + ที่อยู่จัดส่ง" (หรือกดปุ่มแชร์พิกัด) ได้เลยครับ 👇`,
      quickReply: {
        items: [
          { type: "action", action: { type: "location", label: "📍 แชร์พิกัดที่อยู่" } },
          { type: "action", action: { type: "message", label: "รับเองที่หน้าร้าน", text: "รับเองที่หน้าร้าน" } },
          { type: "action", action: { type: "message", label: "❌ ยกเลิก", text: "ยกเลิก" } }
        ]
      }
    }]);
    return true;
  }

  if (step === "ORDER_STEP_3_CONTACT_INFO") {
    data.customerInfo = text;
    saveOrderToSheet(ss, userId, data);
    clearUserState(ss, userId);

    sendLineReply(replyToken, [{
      type: "text",
      text: `🎉 บันทึกคำสั่งซื้อเรียบร้อยแล้วครับ!\n` +
            `------------------------------------\n` +
            `📦 สินค้า: ${data.product}\n` +
            `🔢 จำนวน: ${data.quantity}\n` +
            `📍 ข้อมูลจัดส่ง: ${data.customerInfo}\n` +
            `------------------------------------\n` +
            `💳 บัญชีโอนเงิน: ${SHOP_CONFIG.promptPay}\n` +
            `เจ้าหน้าที่จะเร่งเตรียมสินค้าและแจ้งเลขพัสดุให้ทราบครับ ขอบพระคุณมากครับ! 🙏✨`,
      quickReply: getMainQuickReply()
    }]);
    return true;
  }

  return false;
}

// ค้นหาในชีต FAQ
function searchFaqFromSheet(ss, userText) {
  try {
    const faqSheet = ss.getSheetByName("FAQ");
    if (!faqSheet) return null;
    const data = faqSheet.getDataRange().getValues();
    if (data.length <= 1) return null;

    const cleanInput = userText.toLowerCase().trim();
    for (let i = 1; i < data.length; i++) {
      const keyword = String(data[i][0] || "").toLowerCase().trim();
      const answer = String(data[i][1] || "").trim();
      if (!keyword || !answer) continue;

      if (cleanInput.indexOf(keyword) !== -1 || keyword.indexOf(cleanInput) !== -1) {
        return answer;
      }
    }
  } catch (err) {}
  return null;
}

// เทมเพลต Quick Reply
function getMainQuickReply() {
  return {
    items: [
      { type: "action", action: { type: "message", label: "📋 ดูเมนูและราคา", text: "เมนู" } },
      { type: "action", action: { type: "message", label: "🛒 สั่งซื้อสินค้า", text: "สั่งซื้อ" } },
      { type: "action", action: { type: "message", label: "💰 โปรโมชั่น", text: "โปรโมชั่น" } },
      { type: "action", action: { type: "message", label: "🚚 ข้อมูลจัดส่ง", text: "ค่าจัดส่ง" } },
      { type: "action", action: { type: "message", label: "📍 หน้าร้าน/เวลา", text: "หน้าร้าน" } },
      { type: "action", action: { type: "message", label: "💳 เลขบัญชี", text: "เลขบัญชี" } },
      { type: "action", action: { type: "message", label: "👤 ติดต่อแอดมิน", text: "ติดต่อแอดมิน" } }
    ]
  };
}

function getGeneralQuickReply() {
  return {
    items: [
      { type: "action", action: { type: "message", label: "🛒 สั่งซื้อเลย", text: "สั่งซื้อ" } },
      { type: "action", action: { type: "message", label: "📋 ดูเมนูสินค้า", text: "เมนู" } },
      { type: "action", action: { type: "message", label: "👤 ติดต่อเจ้าหน้าที่", text: "ติดต่อแอดมิน" } },
      { type: "action", action: { type: "message", label: "🏠 เมนูหลัก", text: "เมนูหลัก" } }
    ]
  };
}

function sendWelcomeMessage(replyToken, customText) {
  const welcomeText = customText || 
    `ยินดีต้อนรับสู่ ${SHOP_CONFIG.shopName} ข้าวหลามเตาถ่านสูตรโบราณหอมกรุ่น 🎋🔥\n\n` +
    `เราพร้อมให้บริการแล้วครับ สามารถเลือกหัวข้อที่คุณต้องการจากเมนูด้านล่างนี้ได้ทันทีเลยครับ 👇`;

  sendLineReply(replyToken, [{
    type: "text",
    text: welcomeText,
    quickReply: getMainQuickReply()
  }]);
}

function sendFallbackMessage(replyToken, originalText) {
  sendLineReply(replyToken, [{
    type: "text",
    text: `ขออภัยครับ บอทยังไม่เข้าใจคำถาม "${originalText}" 🙏\n\n` +
          `ลูกค้าสามารถเลือกหัวข้อที่ต้องการทราบจากปุ่มด้านล่างนี้ หรือกด "ติดต่อแอดมิน" เพื่อให้เจ้าหน้าที่เข้ามาตอบได้เลยครับ 👇`,
    quickReply: getMainQuickReply()
  }]);
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
  UrlFetchApp.fetch(url, options);
}

// =========================================================================
// 🗄️ DATABASE & STATE MANAGEMENT (Google Sheets)
// =========================================================================

function initDatabaseSheets(ss) {
  let faqSheet = ss.getSheetByName("FAQ");
  if (!faqSheet) {
    faqSheet = ss.insertSheet("FAQ");
    faqSheet.appendRow(["คีย์เวิร์ดคำถาม (Keyword)", "คำตอบที่ต้องการให้บอทพูด (Bot Answer)"]);
    faqSheet.appendRow(["เก็บได้กี่วัน", "ข้าวหลามอยู่นอกตู้เย็นได้ 3 วัน และในตู้เย็นได้ 7 วันครับ นำมาอุ่นไมโครเวฟ 1 นาทีก็อร่อยเหมือนเดิมครับ 🎋"]);
    faqSheet.appendRow(["มีไส้อะไรบ้าง", "มีไส้ถั่วดำกะทิสด, ข้าวเหนียวดำเผือกหอม, ลาวามะพร้าวอ่อน และชาเขียวมัทฉะถั่วแดงครับ"]);
    faqSheet.setFrozenRows(1);
  }

  let orderSheet = ss.getSheetByName("Orders");
  if (!orderSheet) {
    orderSheet = ss.insertSheet("Orders");
    orderSheet.appendRow(["วันที่-เวลา", "LINE User ID", "สินค้าที่สั่ง", "จำนวน", "ข้อมูลจัดส่ง/เบอร์โทร", "สถานะ"]);
    orderSheet.setFrozenRows(1);
  }

  let chatSheet = ss.getSheetByName("Chat_History");
  if (!chatSheet) {
    chatSheet = ss.insertSheet("Chat_History");
    chatSheet.appendRow(["วันที่-เวลา", "LINE User ID", "ข้อความลูกค้า", "การตอบกลับของระบบ"]);
    chatSheet.setFrozenRows(1);
  }

  let stateSheet = ss.getSheetByName("User_State");
  if (!stateSheet) {
    stateSheet = ss.insertSheet("User_State");
    stateSheet.appendRow(["LINE User ID", "Current Step", "Payload Data (JSON)", "อัปเดตล่าสุด"]);
    stateSheet.setFrozenRows(1);
  }

  let broadcastSheet = ss.getSheetByName("Broadcast");
  if (!broadcastSheet) {
    setupBroadcastSheet(ss);
  }
}

function getUserState(ss, userId) {
  try {
    const sheet = ss.getSheetByName("User_State");
    if (!sheet) return null;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        let payload = {};
        try { payload = JSON.parse(data[i][2] || "{}"); } catch (e) {}
        return { step: data[i][1], data: payload, rowIndex: i + 1 };
      }
    }
  } catch (err) {}
  return null;
}

function setUserState(ss, userId, step, dataObj) {
  try {
    const sheet = ss.getSheetByName("User_State");
    if (!sheet) return;
    const existing = getUserState(ss, userId);
    const jsonStr = JSON.stringify(dataObj || {});
    const now = new Date();
    if (existing && existing.rowIndex) {
      sheet.getRange(existing.rowIndex, 2, 1, 3).setValues([[step, jsonStr, now]]);
    } else {
      sheet.appendRow([userId, step, jsonStr, now]);
    }
  } catch (err) {}
}

function clearUserState(ss, userId) {
  try {
    const sheet = ss.getSheetByName("User_State");
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
  } catch (err) {}
}

function saveOrderToSheet(ss, userId, data) {
  try {
    const sheet = ss.getSheetByName("Orders");
    if (!sheet) return;
    sheet.appendRow([
      new Date(),
      userId,
      data.product || "-",
      data.quantity || "-",
      data.customerInfo || "-",
      "รอดำเนินการ / ตรวจสลิป"
    ]);
  } catch (err) {}
}

function logChat(ss, userId, userMessage, botReply) {
  try {
    const sheet = ss.getSheetByName("Chat_History");
    if (!sheet) return;
    sheet.appendRow([new Date(), userId, userMessage, botReply]);
  } catch (err) {}
}
