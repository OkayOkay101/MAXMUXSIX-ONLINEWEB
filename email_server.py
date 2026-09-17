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
from http.server import HTTPServer, BaseHTTPRequestHandler
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
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
            "message": "ยังไม่ได้ระบุ smtp_user หรือ smtp_pass ใน email_config.json (สามารถกรอกข้อมูล Gmail App Password ได้เลยครับ)"
        }

    msg = MIMEMultipart("alternative")
    msg["Subject"] = Header(subject, "utf-8")
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = f"{to_name} <{to_email}>" if to_name else to_email

    if text_content:
        msg.attach(MIMEText(text_content, "plain", "utf-8"))
    if html_content:
        msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
        server.ehlo()
        if smtp_port == 587:
            server.starttls()
            server.ehlo()
        server.login(smtp_user, smtp_pass)
        server.sendmail(from_email, [to_email], msg.as_string())
        server.quit()
        return {
            "success": True,
            "message": f"จัดส่งอีเมลจริงไปยัง {to_email} สำเร็จเรียบร้อยแล้ว!"
        }
    except Exception as e:
        print(f"[ERROR] SMTP Send error: {e}")
        return {
            "success": False,
            "error": "SMTP_ERROR",
            "message": f"เกิดข้อผิดพลาดในการส่งอีเมล: {str(e)}"
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
                "from_email": config.get("from_email")
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
                    self.wfile.write(json.dumps({"success": False, "message": "Missing 'to' email address"}).encode("utf-8"))
                    return

                print(f"[INFO] Dispatching real email to: {to_email} (Subject: {subject})")
                res = send_smtp_email(to_email, to_name, subject, html_content, text_content)

                status_code = 200 if res["success"] else 400
                self.send_response(status_code)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(res, ensure_ascii=False).encode("utf-8"))

            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "message": str(e)}).encode("utf-8"))

        elif self.path == "/api/save-config":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length).decode("utf-8")
                data = json.loads(body)
                current = load_config()
                if not data.get("smtp_pass") and current.get("smtp_pass"):
                    data["smtp_pass"] = current["smtp_pass"]
                save_config(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "Config saved successfully!"}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "message": str(e)}).encode("utf-8"))
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
