# -*- coding: utf-8 -*-
"""
MAXMUXSIX - Local Real Email Dispatch Server
เซิร์ฟเวอร์ส่งอีเมลจริงสำหรับโปรเจกต์ MAXMUXSIX ข้าวหลามเตาถ่าน
ใช้ Python Standard Library ทั้งหมด (ไม่ต้องติดตั้ง pip เพิ่มเติม)
รองรับ CORS 100% สำหรับการเรียกใช้งานจากเบราว์เซอร์
"""

import os
import sys
import json
import smtplib
import traceback
from http.server import HTTPServer, BaseHTTPRequestHandler
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.header import Header

# Ensure stdout handles UTF-8 on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "email_config.json")
DEFAULT_CONFIG = {
    "enabled": False,
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_user": "",
    "smtp_pass": "",
    "from_email": "maxmuxsix@gmail.com",
    "from_name": "MAXMUXSIX ข้าวหลามเตาถ่าน"
}

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return {**DEFAULT_CONFIG, **json.load(f)}
        except Exception as e:
            print(f"[WARN] Failed to read {CONFIG_FILE}: {e}")
    return DEFAULT_CONFIG

def save_config(cfg):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)

def send_smtp_email(to_email, to_name, subject, html_content, text_content=""):
    config = load_config()
    smtp_user = config.get("smtp_user", "").strip()
    smtp_pass = config.get("smtp_pass", "").strip()
    smtp_host = config.get("smtp_host", "smtp.gmail.com").strip()
    smtp_port = int(config.get("smtp_port", 587))
    from_email = config.get("from_email", smtp_user or "welcome@maxmuxsix.local").strip()
    from_name = config.get("from_name", "MAXMUXSIX ข้าวหลามเตาถ่าน").strip()

    if not smtp_user or not smtp_pass:
        return {
            "success": False,
            "error": "SMTP_NOT_CONFIGURED",
            "message": "ยังไม่ได้ระบุอีเมล Gmail (smtp_user) หรือ App Password 16 หลัก (smtp_pass) ใน email_config.json"
        }

    # สร้าง MIMEMultipart related เพื่อรองรับ Inline Image (CID)
    msg = MIMEMultipart("related")
    msg["Subject"] = Header(subject, "utf-8")
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = f"{to_name} <{to_email}>" if to_name else to_email

    alt = MIMEMultipart("alternative")
    msg.attach(alt)

    if text_content:
        alt.attach(MIMEText(text_content, "plain", "utf-8"))

    # ฝังรูปภาพสินค้า max_1.jpg ถึง max_8.jpg เป็น inline CID อัตโนมัติ เพื่อให้แสดงผลใน Gmail สวยงาม 100%
    base_dir = os.path.dirname(os.path.abspath(__file__))
    images_to_attach = []
    processed_html = html_content

    for i in range(1, 9):
        img_filename = f"max_{i}.jpg"
        if img_filename in processed_html:
            cid_id = f"img_max_{i}"
            processed_html = processed_html.replace(f'src="{img_filename}"', f'src="cid:{cid_id}"')
            processed_html = processed_html.replace(f"src='{img_filename}'", f'src="cid:{cid_id}"')
            img_path = os.path.join(base_dir, img_filename)
            if os.path.exists(img_path):
                images_to_attach.append((cid_id, img_path))

    alt.attach(MIMEText(processed_html, "html", "utf-8"))

    # แนบไฟล์รูปภาพแบบ inline
    for cid_id, img_path in images_to_attach:
        try:
            with open(img_path, "rb") as f:
                img_data = f.read()
                img = MIMEImage(img_data, name=os.path.basename(img_path))
                img.add_header("Content-ID", f"<{cid_id}>")
                img.add_header("Content-Disposition", "inline", filename=os.path.basename(img_path))
                msg.attach(img)
        except Exception as e:
            print(f"[WARN] Failed to attach inline image {img_path}: {e}")

    try:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=20)
        server.ehlo()
        if smtp_port == 587:
            server.starttls()
            server.ehlo()
        server.login(smtp_user, smtp_pass)
        server.sendmail(from_email, [to_email], msg.as_string())
        server.quit()
        return {
            "success": True,
            "message": f"จัดส่งอีเมล HTML ดีไซน์เต็มรูปแบบไปยัง {to_email} สำเร็จเรียบร้อยแล้ว!"
        }
    except Exception as e:
        print(f"[ERROR] SMTP Send error: {e}")
        return {
            "success": False,
            "error": "SMTP_ERROR",
            "message": f"เกิดข้อผิดพลาดในการเชื่อมต่อ Gmail SMTP: {str(e)}"
        }

class EmailRequestHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/status" or self.path == "/":
            config = load_config()
            configured = bool(config.get("smtp_user") and config.get("smtp_pass"))
            response = {
                "status": "online",
                "service": "MAXMUXSIX Local Email Dispatcher",
                "smtp_configured": configured,
                "smtp_host": config.get("smtp_host"),
                "smtp_user": config.get("smtp_user", ""),
                "from_email": config.get("from_email", "")
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode("utf-8"))
        elif self.path == "/api/config":
            config = load_config()
            safe_config = {**config, "smtp_pass": "******" if config.get("smtp_pass") else ""}
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(safe_config, ensure_ascii=False).encode("utf-8"))
        else:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()

    def do_POST(self):
        if self.path == "/api/send-email":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length).decode("utf-8")
                data = json.loads(body)

                to_email = data.get("to", "").strip()
                to_name = data.get("toName", "").strip()
                subject = data.get("subject", "🎋 ยินดีต้อนรับสู่ครอบครัว MAXMUXSIX")
                html_content = data.get("htmlContent", "")
                text_content = data.get("textContent", "")

                if not to_email:
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self._send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "message": "Missing 'to' email address"}, ensure_ascii=False).encode("utf-8"))
                    return

                print(f"[INFO] Dispatching real email to: {to_email} (Subject: {subject})")
                res = send_smtp_email(to_email, to_name, subject, html_content, text_content)

                status_code = 200 if res.get("success") else 400
                self.send_response(status_code)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(res, ensure_ascii=False).encode("utf-8"))

            except Exception as e:
                traceback.print_exc()
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "message": str(e)}, ensure_ascii=False).encode("utf-8"))

        elif self.path == "/api/save-config":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length).decode("utf-8")
                data = json.loads(body)
                current = load_config()
                # ถ้าไม่ส่งรหัสผ่านใหม่มา หรือส่งเป็นค่าว่าง ให้คงรหัสเดิมไว้
                if not data.get("smtp_pass") and current.get("smtp_pass"):
                    data["smtp_pass"] = current["smtp_pass"]
                merged = {**current, **data}
                if merged.get("smtp_user") and not merged.get("from_email"):
                    merged["from_email"] = merged["smtp_user"]
                if merged.get("smtp_user") and merged.get("smtp_pass"):
                    merged["enabled"] = True
                save_config(merged)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "บันทึกการตั้งค่า Gmail เข้าเซิร์ฟเวอร์เรียบร้อยแล้ว!"}, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                traceback.print_exc()
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "message": str(e)}, ensure_ascii=False).encode("utf-8"))
        else:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()

def run_server(port=5000):
    server_address = ("", port)
    httpd = HTTPServer(server_address, EmailRequestHandler)
    print("=" * 60)
    print(f"🚀 MAXMUXSIX Real Email Dispatch Server กำลังทำงานที่ Port {port}")
    print(f"👉 API Endpoint: http://localhost:{port}/api/send-email")
    print(f"👉 ตรวจสอบสถานะ: http://localhost:{port}/api/status")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 หยุดการทำงานของเซิร์ฟเวอร์เรียบร้อย")

if __name__ == "__main__":
    run_server(5000)
