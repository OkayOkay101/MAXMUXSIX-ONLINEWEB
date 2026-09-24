const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createGasInstance } = require('../helpers/gas-loader');

describe('06. Google Apps Script Backend (doPost, doGet, Security & Mail Delivery)', () => {
    let gasEnv;
    let gas;

    beforeEach(() => {
        gasEnv = createGasInstance({ initialQuota: 100 });
        gas = gasEnv.gas;
    });

    const VALID_TOKEN = 'MAXMUXSIX_SECURE_TOKEN_2026';

    describe('Secret Token Authentication', () => {
        it('should reject request when token is completely missing', () => {
            const event = {
                postData: {
                    contents: JSON.stringify({
                        to: 'customer@example.com',
                        subject: 'ใบเสร็จคำสั่งซื้อ'
                    })
                }
            };

            const output = gas.doPost(event);
            const json = output.getJson();

            assert.strictEqual(json.status, 'error');
            assert.strictEqual(json.success, false);
            assert.ok(json.message.includes('Secret Token'));
            assert.strictEqual(gasEnv.sentEmails.length, 0);
        });

        it('should reject request with an invalid/unauthorized token', () => {
            const event = {
                postData: {
                    contents: JSON.stringify({
                        token: 'INTRUDER_TOKEN_9999',
                        to: 'customer@example.com',
                        subject: 'ใบเสร็จ'
                    })
                }
            };

            const output = gas.doPost(event);
            const json = output.getJson();

            assert.strictEqual(json.status, 'error');
            assert.strictEqual(json.success, false);
            assert.ok(json.message.includes('Secret Token'));
            assert.strictEqual(gasEnv.sentEmails.length, 0);
        });

        it('should accept request when token matches SECURITY_CONFIG.SECRET_TOKEN', () => {
            const event = {
                postData: {
                    contents: JSON.stringify({
                        token: VALID_TOKEN,
                        to: 'customer@example.com',
                        subject: 'ยืนยันคำสั่งซื้อ',
                        html: '<h1>ขอบคุณครับ</h1>'
                    })
                }
            };

            const output = gas.doPost(event);
            const json = output.getJson();

            assert.strictEqual(json.status, 'success');
            assert.strictEqual(json.success, true);
            assert.strictEqual(gasEnv.sentEmails.length, 1);
        });
    });

    describe('Mail Quota Protection', () => {
        it('should block email dispatch when daily quota is exhausted (quota < 1)', () => {
            gasEnv.setQuota(0);

            const event = {
                postData: {
                    contents: JSON.stringify({
                        token: VALID_TOKEN,
                        to: 'customer@example.com',
                        subject: 'คำสั่งซื้อ'
                    })
                }
            };

            const output = gas.doPost(event);
            const json = output.getJson();

            assert.strictEqual(json.status, 'error');
            assert.strictEqual(json.success, false);
            assert.ok(json.message.includes('โควตา'));
            assert.strictEqual(gasEnv.sentEmails.length, 0);
        });
    });

    describe('Recipient Validation & Sanitization', () => {
        it('should reject missing or empty recipient email', () => {
            const event = {
                postData: {
                    contents: JSON.stringify({
                        token: VALID_TOKEN,
                        to: '   ',
                        subject: 'ใบเสร็จ'
                    })
                }
            };

            const output = gas.doPost(event);
            const json = output.getJson();

            assert.strictEqual(json.status, 'error');
            assert.ok(json.message.includes('อีเมลผู้รับที่ถูกต้อง'));
        });

        it('should reject recipient without "@" symbol', () => {
            const event = {
                postData: {
                    contents: JSON.stringify({
                        token: VALID_TOKEN,
                        to: 'invalid_recipient_address',
                        subject: 'ใบเสร็จ'
                    })
                }
            };

            const output = gas.doPost(event);
            const json = output.getJson();

            assert.strictEqual(json.status, 'error');
            assert.ok(json.message.includes('อีเมลผู้รับที่ถูกต้อง'));
        });

        it('should reject recipient address longer than 100 characters', () => {
            const longEmail = 'a'.repeat(95) + '@example.com';
            const event = {
                postData: {
                    contents: JSON.stringify({
                        token: VALID_TOKEN,
                        to: longEmail,
                        subject: 'ใบเสร็จ'
                    })
                }
            };

            const output = gas.doPost(event);
            const json = output.getJson();

            assert.strictEqual(json.status, 'error');
            assert.ok(json.message.includes('อีเมลผู้รับที่ถูกต้อง'));
        });
    });

    describe('Payload Bound Limits (DoS & Overflow Prevention)', () => {
        it('should truncate subject lines longer than 150 characters', () => {
            const longSubject = 'ข้าวหลาม '.repeat(30); // > 150 chars
            const event = {
                postData: {
                    contents: JSON.stringify({
                        token: VALID_TOKEN,
                        to: 'customer@example.com',
                        subject: longSubject
                    })
                }
            };

            gas.doPost(event);
            assert.strictEqual(gasEnv.sentEmails.length, 1);
            assert.strictEqual(gasEnv.sentEmails[0].subject.length, 150);
        });

        it('should reject HTML body larger than 100,000 characters', () => {
            const hugeBody = '<div>' + 'A'.repeat(100001) + '</div>';
            const event = {
                postData: {
                    contents: JSON.stringify({
                        token: VALID_TOKEN,
                        to: 'customer@example.com',
                        subject: 'หัวข้อ',
                        html: hugeBody
                    })
                }
            };

            const output = gas.doPost(event);
            const json = output.getJson();

            assert.strictEqual(json.status, 'error');
            assert.ok(json.message.includes('ขนาดใหญ่เกินกว่าที่กำหนด'));
            assert.strictEqual(gasEnv.sentEmails.length, 0);
        });
    });

    describe('Service Health Check (doGet)', () => {
        it('should respond with online status and service metadata', () => {
            const output = gas.doGet();
            const json = output.getJson();

            assert.strictEqual(json.status, 'online');
            assert.strictEqual(json.service, 'MAXMUXSIX Email Web App Service');
            assert.ok(json.timestamp);
            assert.ok(json.message);
        });
    });
});
