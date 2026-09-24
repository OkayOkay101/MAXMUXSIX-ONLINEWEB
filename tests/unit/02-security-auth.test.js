const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createAppInstance } = require('../helpers/app-loader');

describe('02. Security & Authentication (Hash, RateLimit, AuditLog, Admin)', () => {
    let app;
    let store;

    beforeEach(() => {
        const instance = createAppInstance();
        app = instance.app;
        store = instance.store;
    });

    describe('Password Hashing & isHashed', () => {
        it('should hash a password to a 64-character lowercase hex string (SHA-256)', async () => {
            const hash = await app.hashPassword('SecretPass123!');
            assert.strictEqual(typeof hash, 'string');
            assert.strictEqual(hash.length, 64);
            assert.match(hash, /^[0-9a-f]{64}$/);
        });

        it('should produce identical hashes for identical passwords', async () => {
            const hash1 = await app.hashPassword('MyPassword999');
            const hash2 = await app.hashPassword('MyPassword999');
            assert.strictEqual(hash1, hash2);
        });

        it('should produce different hashes for different passwords', async () => {
            const hash1 = await app.hashPassword('Password_A');
            const hash2 = await app.hashPassword('Password_B');
            assert.notStrictEqual(hash1, hash2);
        });

        it('should use site-specific salt (maxmuxsix_2026_) in hash generation', async () => {
            const rawPassword = 'test_password_abc';
            const expectedSalted = 'maxmuxsix_2026_' + rawPassword;
            const expectedHash = crypto.createHash('sha256').update(expectedSalted).digest('hex');

            const actualHash = await app.hashPassword(rawPassword);
            assert.strictEqual(actualHash, expectedHash);
        });

        it('should correctly identify 64-character hex strings as hashed', () => {
            const validHash = 'a'.repeat(64);
            assert.strictEqual(app.isHashed(validHash), true);

            const shaHash = crypto.createHash('sha256').update('hello').digest('hex');
            assert.strictEqual(app.isHashed(shaHash), true);
        });

        it('should reject non-hashed passwords or invalid hex strings in isHashed', () => {
            assert.strictEqual(app.isHashed('123456'), false);
            assert.strictEqual(app.isHashed('mySecretPassword'), false);
            assert.strictEqual(app.isHashed('a'.repeat(63)), false); // 63 chars
            assert.strictEqual(app.isHashed('a'.repeat(65)), false); // 65 chars
            assert.strictEqual(app.isHashed('z'.repeat(64)), false); // non-hex character
            assert.strictEqual(app.isHashed(null), false);
            assert.strictEqual(app.isHashed(undefined), false);
            assert.strictEqual(app.isHashed(12345678), false);
        });
    });

    describe('Rate Limiting System (checkRateLimit, recordRateLimitAttempt, clearRateLimitBlock)', () => {
        it('should allow initial attempts for all defined actions', () => {
            const actions = ['register', 'subscribe', 'login_fail'];
            actions.forEach(action => {
                const result = app.checkRateLimit(action);
                assert.strictEqual(result.allowed, true);
            });
        });

        it('should block actions when exceeding max attempts within the time window', () => {
            const action = 'register'; // max 3 attempts
            const maxAttempts = 3;

            for (let i = 0; i < maxAttempts; i++) {
                assert.strictEqual(app.checkRateLimit(action).allowed, true);
                app.recordRateLimitAttempt(action);
            }

            // Next attempt should be blocked
            const blockedResult = app.checkRateLimit(action);
            assert.strictEqual(blockedResult.allowed, false);
            assert.ok(blockedResult.message.includes('บ่อยเกินไป') || blockedResult.message.includes('รอ'));
        });

        it('should maintain distinct rate limit buckets for different actions', () => {
            // Fill login_fail to max (5 attempts)
            for (let i = 0; i < 5; i++) {
                app.recordRateLimitAttempt('login_fail');
            }
            assert.strictEqual(app.checkRateLimit('login_fail').allowed, false);

            // subscribe should still be allowed
            assert.strictEqual(app.checkRateLimit('subscribe').allowed, true);
        });

        it('should clear rate limit block when clearRateLimitBlock is invoked', () => {
            for (let i = 0; i < 5; i++) {
                app.recordRateLimitAttempt('login_fail');
            }
            assert.strictEqual(app.checkRateLimit('login_fail').allowed, false);

            app.clearRateLimitBlock('login_fail');
            assert.strictEqual(app.checkRateLimit('login_fail').allowed, true);
        });
    });

    describe('Security Audit Logging (logSecurityEvent)', () => {
        it('should record security events to localStorage', () => {
            app.logSecurityEvent('login_fail', 'User test@example.com bad password');

            const rawLog = store.local['maxmuxsix_security_log'];
            assert.ok(rawLog);

            const logs = JSON.parse(rawLog);
            assert.strictEqual(logs.length, 1);
            assert.strictEqual(logs[0].type, 'login_fail');
            assert.strictEqual(logs[0].detail, 'User test@example.com bad password');
            assert.ok(logs[0].t);
        });

        it('should cap the audit log at MAX_LOG_ENTRIES (50 entries)', () => {
            for (let i = 0; i < 60; i++) {
                app.logSecurityEvent('test_event', `Event number ${i}`);
            }

            const logs = JSON.parse(store.local['maxmuxsix_security_log']);
            assert.strictEqual(logs.length, 50);
            assert.strictEqual(logs[0].detail, 'Event number 59'); // Latest entry first
        });
    });

    describe('Admin Mode PIN Security', () => {
        it('should start in non-admin mode by default', () => {
            const adminModeInSession = store.session['maxmuxsix_admin_mode'] === 'true';
            assert.strictEqual(adminModeInSession, false);
        });

        it('should reject incorrect Admin PIN', () => {
            let alertMsg = '';
            app.alert = (msg) => { alertMsg = msg; };
            app.prompt = () => 'wrong_pin';

            app.promptAdminMode();
            assert.notStrictEqual(store.session['maxmuxsix_admin_mode'], 'true');
            assert.ok(alertMsg.includes('ไม่ถูกต้อง'));
        });

        it('should grant admin mode when correct PIN (1234) is entered', () => {
            app.prompt = () => '1234';

            app.promptAdminMode();
            assert.strictEqual(store.session['maxmuxsix_admin_mode'], 'true');
        });

        it('should support custom PIN stored in localStorage', () => {
            store.local['maxmuxsix_admin_pin'] = '9876';

            app.prompt = () => '9876';
            app.promptAdminMode();
            assert.strictEqual(store.session['maxmuxsix_admin_mode'], 'true');
        });
    });
});
