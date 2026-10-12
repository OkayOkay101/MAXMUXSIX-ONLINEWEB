const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

/** Isolated GAS boundary doubles; all signing and JSON processing remain real. */
function createAuthGasInstance(options = {}) {
    const sentEmails = [];
    const properties = { AUTH_RELAY_SECRET: options.secret ?? 'fixture-relay-secret' };
    let nowMs = options.nowMs ?? 1800000000000;
    let quota = options.quota ?? 100;
    let lockAcquired = options.lockAcquired ?? true;
    let failSendAt = options.failSendAt;
    let failPropertyWrite = options.failPropertyWrite;
    let writes = 0;
    let sends = 0;
    const lockState = { attempts: [], releases: 0 };
    class Clock extends Date {
        constructor(...args) { super(...(args.length ? args : [nowMs])); }
        static now() { return nowMs; }
    }
    const signedBytes = buffer => Array.from(buffer, byte => byte > 127 ? byte - 256 : byte);
    const gas = {
        Date: Clock,
        Utilities: {
            Charset: { UTF_8: 'UTF-8' },
            DigestAlgorithm: { SHA_256: 'SHA-256' },
            newBlob: text => ({ getBytes: () => signedBytes(Buffer.from(text, 'utf8')) }),
            computeHmacSha256Signature: (text, secret) => signedBytes(crypto.createHmac('sha256', secret).update(text, 'utf8').digest()),
            computeDigest: (algorithm, text) => {
                if (algorithm !== 'SHA-256') throw new Error('Unexpected digest');
                return signedBytes(crypto.createHash('sha256').update(text, 'utf8').digest());
            },
            base64Encode: bytes => Buffer.from(bytes).toString('base64'),
            base64Decode: text => signedBytes(Buffer.from(text, 'base64'))
        },
        PropertiesService: { getScriptProperties: () => ({
            getProperty: key => Object.hasOwn(properties, key) ? properties[key] : null,
            setProperty: (key, value) => {
                writes++;
                if (failPropertyWrite === true || writes === failPropertyWrite) throw new Error('private property failure');
                properties[key] = String(value);
            }
        }) },
        LockService: { getScriptLock: () => ({
            tryLock: ms => { lockState.attempts.push(ms); return lockAcquired; },
            releaseLock: () => { lockState.releases++; }
        }) },
        MailApp: {
            getRemainingDailyQuota: () => quota,
            sendEmail: message => {
                sends++;
                if (sends === failSendAt || quota < 1) throw new Error('private send failure buyer@example.test token-fixture');
                quota--;
                sentEmails.push({ ...message });
            }
        },
        ContentService: {
            MimeType: { JSON: 'application/json' },
            createTextOutput: text => ({
                setMimeType(type) { this.mimeType = type; return this; },
                getContent: () => text,
                getJson: () => JSON.parse(text)
            })
        }
    };
    vm.createContext(gas);
    vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../../google_auth_apps_script.js'), 'utf8'), gas);
    return {
        gas, sentEmails, properties, lockState,
        setQuota: value => { quota = value; },
        setNow: value => { nowMs = value; },
        setLockAcquired: value => { lockAcquired = value; },
        setFailSendAt: value => { failSendAt = value; },
        setFailPropertyWrite: value => { failPropertyWrite = value; }
    };
}

module.exports = { createAuthGasInstance };
