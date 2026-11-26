// The shop's mail design (from the page's receipt and welcome templates), kept compact:
// the signed relay accepts at most 32 KiB per mail. Every dynamic value is escaped here.
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const DEMO_NOTICE = 'เว็บตัวอย่าง ไม่มีการขายหรือจัดส่งจริง ห้ามโอนเงิน';

const FONT = "font-family:'Segoe UI',Tahoma,Arial,sans-serif;";
const table = (attrs, rows) => `<table role="presentation" cellpadding="0" cellspacing="0" ${attrs}>${rows}</table>`;

function page(title, preview, rows) {
    return '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
        `<title>${title}</title>` +
        '<style>@media screen and (max-width:600px){.pad{padding-left:16px!important;padding-right:16px!important}.col{display:block!important;width:100%!important;box-sizing:border-box}}</style></head>' +
        `<body style="margin:0;padding:0;background-color:#0A0704;${FONT}">` +
        `<div style="display:none;max-height:0;overflow:hidden">${preview}</div>` +
        '<center style="width:100%;background-color:#0A0704">' +
        table('width="100%" style="max-width:600px;margin:0 auto;background-color:#0D0906;border:1px solid #1E543C;border-radius:12px;overflow:hidden"',
            `<tr><td align="center" style="background-color:#FFD60A;color:#1A0F00;font-size:13px;font-weight:800;padding:10px">🧪 ${DEMO_NOTICE}</td></tr>` + rows) +
        '</center></body></html>';
}

const header = (siteUrl, tag) => '<tr><td style="background-color:#0F2A1C;border-top:4px solid #FAA307;padding:16px 24px">' +
    table('width="100%"', `<tr><td align="left"><a href="${siteUrl}" style="text-decoration:none">` +
        '<span style="font-size:22px;font-weight:900;color:#FAA307">MAXMUXSIX</span>' +
        '<span style="display:block;font-size:12px;font-weight:600;color:#FEE8BE">ข้าวหลามเตาถ่านไฟแรง</span></a></td>' +
        `<td align="right"><span style="display:inline-block;background-color:#E85D04;color:#FFF9ED;font-size:11px;font-weight:700;padding:5px 14px;border-radius:20px">${tag}</span></td></tr>`) +
    '</td></tr>';

const hero = (subtitle, pill, text) => '<tr><td align="center" style="background-color:#0D0906;background-image:radial-gradient(rgba(232,93,4,0.35) 1.4px,transparent 1.4px);background-size:22px 22px;padding:36px 20px 20px">' +
    table('align="center" style="width:230px;height:230px;border-radius:50%;background:linear-gradient(180deg,#12331F,#0A1C14);border:3px solid #FEE8BE;box-shadow:0 0 40px 6px rgba(250,163,7,0.45)"',
        '<tr><td align="center" valign="middle"><div style="font-size:32px;letter-spacing:6px">🔥🎋</div>' +
        '<div style="font-size:30px;font-weight:900;color:#FAA307;margin-top:4px">MAXMUXSIX</div>' +
        `<div style="font-size:13px;font-weight:700;color:#FEE8BE;margin-top:4px">${subtitle}</div></td></tr>`) +
    table('style="margin-top:22px"', `<tr><td align="center" style="background-color:#FEE8BE;border-radius:30px;padding:10px 24px"><span style="font-size:15px;font-weight:800;color:#3A1400">${pill}</span></td></tr>`) +
    `<p style="margin:16px 0 0;max-width:480px;font-size:14px;line-height:22px;color:#C0D8CC">${text}</p></td></tr>`;

const button = (href, label) => '<tr><td align="center" style="padding:16px 28px">' +
    `<a href="${href}" style="display:inline-block;background-color:#E85D04;color:#FFF9ED;font-size:15px;font-weight:800;text-decoration:none;padding:14px 34px;border-radius:50px">${label}</a></td></tr>`;

const footer = (siteUrl, note) => '<tr><td align="center" style="background-color:#07150E;border-top:3px solid #FAA307;padding:24px 20px">' +
    `<a href="${siteUrl}" style="font-size:14px;font-weight:800;color:#FAA307;text-decoration:none">🌐 เข้าสู่เว็บไซต์ MAXMUXSIX ข้าวหลามเตาถ่าน (คลิกที่นี่)</a>` +
    `<div style="margin-top:8px;font-size:11px;line-height:18px;color:#8BA89B">${note}</div></td></tr>`;

const section = (content, extra = '') => `<tr><td class="pad" style="padding:8px 28px;${extra}">${content}</td></tr>`;
const card = (rows, style = '') => table(`width="100%" style="background-color:#07150E;border:1px solid #1E543C;border-radius:12px;padding:14px;${style}"`, rows);

function itemRow(item, siteUrl, images) {
    const name = escapeHtml(item.name);
    // Only the seeded catalog ids have a picture file on the site.
    const picture = images && /^max_\d+$/.test(item.id)
        ? `<td width="60"><img src="${siteUrl}${item.id}.jpg" alt="${name}" width="50" height="50" style="display:block;border-radius:8px;border:1px solid #1E543C;object-fit:cover"></td>`
        : '';
    const cell = 'style="padding:8px 10px;border-top:1px solid #143526;font-size:13px;font-weight:700;color:#FEE8BE"';
    return `<tr><td ${cell}>${table('', `<tr>${picture}<td style="font-size:13px;font-weight:700;color:#FEE8BE">${name}` +
        `<div style="font-size:11px;font-weight:400;color:#8BA89B">ราคาชิ้นละ ${Number(item.price)} บาท</div></td></tr>`)}</td>` +
        `<td align="center" ${cell}>x${Number(item.qty)}</td><td align="right" ${cell}>${item.qty * item.price} บาท</td></tr>`;
}

/** view: siteUrl, orderId, dateText, customer{name,email,phone?,address?}, order (server totals). */
export function receiptHtml({ siteUrl, orderId, dateText, customer, order }, { images }) {
    const url = escapeHtml(siteUrl);
    const id = escapeHtml(orderId);
    const info = (label, value) => value
        ? `<tr><td width="100" valign="top" style="font-weight:600;color:#8BA89B">${label}</td><td style="color:#FEE8BE">${escapeHtml(value)}</td></tr>` : '';
    const money = (label, value, color = '#FEE8BE') =>
        `<tr><td style="padding:4px 8px;font-size:13px;color:#8BA89B">${label}</td><td align="right" style="padding:4px 8px;font-size:13px;font-weight:700;color:${color}">${value} บาท</td></tr>`;
    const heading = text => `<div style="margin-bottom:8px;font-size:15px;font-weight:800;color:#FAA307">${text}</div>`;
    return page('สรุปคำสั่งซื้อ - MAXMUXSIX', `ยืนยันคำสั่งซื้อ #${id} ยอดรวม ${Number(order.total)} บาท 🔥🎋`,
        header(url, '🧾 ใบสรุปคำสั่งซื้อ') +
        hero('ยืนยันคำสั่งซื้อสำเร็จ', '🎉 ขอบคุณสำหรับคำสั่งซื้อของคุณ!',
            'เราได้รับรายการสั่งซื้อของคุณเรียบร้อยแล้ว ขอบคุณที่อุดหนุนข้าวหลามเตาถ่านไฟแรงของเราครับ') +
        section(card('<tr><td style="font-size:11px;color:#8BA89B">หมายเลขคำสั่งซื้อ (Order ID)' +
            `<div style="font-family:monospace;font-size:17px;font-weight:700;color:#FAA307">${id}</div></td>` +
            `<td align="right" style="font-size:11px;color:#8BA89B">วันที่ส่งเมล<div style="font-size:13px;font-weight:600;color:#FEE8BE">${escapeHtml(dateText)}</div></td></tr>` +
            '<tr><td colspan="2" style="padding-top:10px">' +
            '<span style="display:inline-block;background-color:#E85D04;color:#FFF9ED;font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px">รับคำสั่งซื้อแล้ว 🔥</span> ' +
            '<span style="display:inline-block;background-color:#1E543C;color:#FEE8BE;font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px">⏳ รอร้านตรวจสอบการชำระเงิน</span></td></tr>')) +
        section(card(`<tr><td>${heading('📍 ข้อมูลผู้รับและการจัดส่ง')}` +
            table('width="100%" style="font-size:13px;line-height:22px"',
                info('ชื่อผู้รับ:', customer.name) + info('เบอร์ติดต่อ:', customer.phone) +
                info('อีเมล:', customer.email) + info('ที่อยู่จัดส่ง:', customer.address)) + '</td></tr>')) +
        section(heading('🎋 รายการสินค้าที่สั่งซื้อ') +
            table('width="100%" style="background-color:#07150E;border:1px solid #1E543C;border-radius:12px;overflow:hidden"',
                '<tr style="background-color:#0F2A1C;font-size:12px;color:#FAA307"><th align="left" style="padding:10px">สินค้า</th><th style="padding:10px">จำนวน</th><th align="right" style="padding:10px">ราคารวม</th></tr>' +
                order.items.map(item => itemRow(item, url, images)).join(''))) +
        section(card(money('ยอดรวมค่าสินค้า (Subtotal):', Number(order.subtotal)) +
            money('ค่าจัดส่ง:', Number(order.shippingCost)) +
            money('ส่วนลดคูปอง:', `-${Number(order.discountAmount)}`, '#4ADE80') +
            '<tr><td style="padding:10px 8px 4px;border-top:1px solid #1E543C;font-size:15px;font-weight:800;color:#FAA307">ยอดชำระสุทธิ (Grand Total):</td>' +
            `<td align="right" style="padding:10px 8px 4px;border-top:1px solid #1E543C;font-size:26px;font-weight:900;color:#FAA307">${Number(order.total)} บาท</td></tr>`, 'border:2px solid #FAA307')) +
        section('<div style="border:1px dashed #4ADE80;border-radius:10px;padding:14px;text-align:center;background-color:#05140C">' +
            '<div style="font-size:13px;font-weight:700;color:#4ADE80">🎋 กรรมวิธีเตาถ่านโบราณ พิถีพิถันทุกกระบอก</div>' +
            '<div style="font-size:12px;line-height:18px;color:#C0D8CC">ข้าวเหนียวเขี้ยวงูนุ่มหนึบ • กะทิคั้นสดหวานมันพอดี • เผาด้วยเตาถ่านไฟแรงธรรมชาติ ให้กลิ่นหอมกรุ่นเฉพาะตัว</div></div>') +
        button(`${url}?orderId=${id}#order-history`, '📦 ติดตามสถานะคำสั่งซื้อบนเว็บไซต์') +
        footer(url, 'หากมีข้อสงสัยเกี่ยวกับคำสั่งซื้อ ทักแชท LINE @052edqsq<br>เมลสรุปคำสั่งซื้อนี้จัดส่งโดยระบบอัตโนมัติของ MAXMUXSIX'));
}

// Names and prices must match the seeded catalog (checked by tests/unit/43-shop-mail-design.test.js).
const FEATURED = [
    ['max_1', 'ข้าวหลามถั่วดำระเบิดเตา (ต้นตำรับ)', 45, '🫘 ยอดฮิต', '#FF5A4E'],
    ['max_4', 'ข้าวหลามสังขยาลาวาไข่เป็ด', 55, '👑 พรีเมียม', '#FAA307'],
    ['max_2', 'ข้าวหลามช็อตมะพร้าวน้ำหอม', 40, '🥥 หวานมัน', '#4ADE80'],
    ['max_3', 'ข้าวหลามเผือกหอมกวนกะทิเยิ้ม', 50, '🍠 หอมกวน', '#C084FC']
];

export function welcomeHtml({ siteUrl, name, referralCode }) {
    const url = escapeHtml(siteUrl);
    const promo = `${url}?promo=WELCOME10`;
    const menuCard = ([id, title, price, badge, color]) => '<td class="col" width="50%" valign="top" style="padding:8px">' +
        `<a href="${promo}" style="text-decoration:none">` +
        table(`width="100%" style="background-color:#07150E;border:2px solid ${color};border-radius:12px"`,
            `<tr><td><img src="${url}${id}.jpg" alt="${title}" width="250" style="display:block;width:100%;border-radius:10px 10px 0 0"></td></tr>` +
            `<tr><td style="padding:12px 14px 16px"><span style="display:inline-block;background-color:${color};color:#1A0F00;font-size:10px;font-weight:800;padding:3px 10px;border-radius:10px">${badge}</span>` +
            `<div style="margin-top:6px;font-size:14px;font-weight:700;color:#FEE8BE">${title}</div>` +
            `<div style="margin-top:4px;font-size:15px;font-weight:800;color:${color}">${price} บาท</div></td></tr>`) + '</a></td>';
    return page('ยินดีต้อนรับสู่ครอบครัว MAXMUXSIX', 'ยินดีต้อนรับสู่ครอบครัว MAXMUXSIX รับส่วนลด 10% 🔥🎋',
        header(url, 'หลามหร่อยเร้าใจ') +
        hero('ข้าวหลาม', '🎉 ยินดีต้อนรับสมาชิกใหม่',
            'ต้นตำรับข้าวหลามเผาเตาถ่านไฟแรง ข้าวเหนียวเขี้ยวงูนุ่มหนึบ กะทิคั้นสดแท้ ขอบคุณที่สมัครสมาชิกกับเรา') +
        section('<div style="font-size:24px;line-height:34px;font-weight:900;color:#FEE8BE">' +
            `ยินดีต้อนรับคุณ <span style="color:#FAA307">${escapeHtml(name)}</span><br>สู่ครอบครัว <span style="color:#FAA307">MAXMUXSIX</span>! 🎉</div>`, 'text-align:center;background-color:#0A1C14') +
        section('<div style="background:linear-gradient(135deg,#FAA307,#E85D04);border-radius:16px;padding:24px 20px;text-align:center;color:#3A1400">' +
            '<div style="font-size:13px;font-weight:700">🎁 ส่วนลดต้อนรับสมาชิกใหม่</div>' +
            '<div style="margin:8px 0;font-family:\'Courier New\',monospace;font-size:32px;font-weight:900;letter-spacing:6px">WELCOME10</div>' +
            '<div style="font-size:14px;font-weight:600">ใส่โค้ดตอนสั่งซื้อ รับส่วนลด 10%</div>' +
            `<div style="margin-top:6px;font-size:12px;font-weight:700">รหัสชวนเพื่อนของคุณ: ${escapeHtml(referralCode)}</div></div>`) +
        button(promo, '🛒 สั่งข้าวหลามเลยตอนนี้ (รับส่วนลด 10%)') +
        section('<div style="text-align:center;font-size:19px;font-weight:800;color:#FAA307">🔥 เมนูขายดีที่ต้องลอง</div>') +
        section(table('width="100%"', `<tr>${menuCard(FEATURED[0])}${menuCard(FEATURED[1])}</tr><tr>${menuCard(FEATURED[2])}${menuCard(FEATURED[3])}</tr>`)) +
        footer(url, 'MAXMUXSIX ข้าวหลามเผาเตาถ่าน<br>คุณได้รับอีเมลนี้เพราะสมัครสมาชิกจากเว็บไซต์ของเรา'));
}
