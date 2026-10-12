/** Deploy in a separate Apps Script project. Configure AUTH_RELAY_SECRET privately. */
var AUTH_MAIL_DAY_MS = 24 * 60 * 60 * 1000;
var AUTH_MAIL_LEDGER_BYTES = 8 * 1024;

function authMailJson(value) {
    return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function AuthMailFailure(code) {
    this.code = code;
}

function authMailFail(code) {
    throw new AuthMailFailure(code);
}

function authMailRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function authMailKeys(value, keys) {
    return authMailRecord(value) && Object.keys(value).length === keys.length &&
        keys.every(function (key) { return Object.prototype.hasOwnProperty.call(value, key); });
}

function authMailBytes(text) {
    return Utilities.newBlob(text).getBytes().length;
}

function authMailParse(text, code) {
    try { return JSON.parse(text); } catch (_) { authMailFail(code); }
}

function authMailEventId(value) {
    return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

function authMailSlot(value) {
    return value === 'primary' || value === 'current' || value === 'new';
}

function authMailRecipient(value) {
    if (typeof value !== 'string' || value.length > 254 || /[\s,;<>\x00-\x1f\x7f]/.test(value)) return false;
    var parts = value.split('@');
    return parts.length === 2 && parts[0].length <= 64 &&
        /^[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+(?:\.[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+)*$/.test(parts[0]) &&
        /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(parts[1]);
}

function authMailValidateMessages(payload) {
    var data = authMailParse(payload, 'INVALID_PAYLOAD');
    if (!authMailKeys(data, ['version', 'messages']) || data.version !== 1 ||
        !Array.isArray(data.messages) || data.messages.length < 1 || data.messages.length > 2) authMailFail('INVALID_PAYLOAD');
    var slots = [];
    data.messages.forEach(function (message) {
        if (!authMailKeys(message, ['messageId', 'to', 'subject', 'htmlBody', 'body']) ||
            !authMailSlot(message.messageId) || slots.indexOf(message.messageId) !== -1 ||
            !authMailRecipient(message.to) || typeof message.subject !== 'string' ||
            message.subject.length < 1 || message.subject.length > 200 || /[\x00-\x1f\x7f]/.test(message.subject) ||
            typeof message.body !== 'string' || message.body.length < 1 ||
            typeof message.htmlBody !== 'string' || message.htmlBody.length < 1) authMailFail('INVALID_PAYLOAD');
        slots.push(message.messageId);
    });
    return data.messages;
}

function authMailVerify(envelope, secret) {
    if (typeof envelope.signature !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(envelope.signature)) authMailFail('INVALID_SIGNATURE');
    var expected = Utilities.computeHmacSha256Signature(
        envelope.timestamp + '.' + envelope.eventId + '.' + envelope.payload, secret, Utilities.Charset.UTF_8);
    var actual;
    try { actual = Utilities.base64Decode(envelope.signature); } catch (_) { authMailFail('INVALID_SIGNATURE'); }
    // Fixed 32-byte comparison; signed GAS bytes are normalized before XOR.
    var difference = actual.length ^ 32;
    for (var i = 0; i < 32; i++) difference |= (expected[i] & 255) ^ (actual[i] & 255);
    if (difference !== 0) authMailFail('INVALID_SIGNATURE');
}

function authMailReadLedger(properties, now) {
    var raw;
    try { raw = properties.getProperty('AUTH_SENT_INDEX'); } catch (_) { authMailFail('STATE_UNAVAILABLE'); }
    if (raw === null) return { version: 1, events: [] };
    if (authMailBytes(raw) >= AUTH_MAIL_LEDGER_BYTES) authMailFail('STATE_UNAVAILABLE');
    var ledger = authMailParse(raw, 'STATE_UNAVAILABLE');
    if (!authMailKeys(ledger, ['version', 'events']) || ledger.version !== 1 ||
        !Array.isArray(ledger.events) || ledger.events.length > 100) authMailFail('STATE_UNAVAILABLE');
    var ids = [];
    ledger.events.forEach(function (entry) {
        if (!authMailKeys(entry, ['id', 'digest', 'expires', 'slots', 'sent']) || !authMailEventId(entry.id) ||
            ids.indexOf(entry.id) !== -1 || typeof entry.digest !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(entry.digest) ||
            !Number.isSafeInteger(entry.expires) || entry.expires <= 0 ||
            !Array.isArray(entry.slots) || entry.slots.length < 1 || entry.slots.length > 2 ||
            !Array.isArray(entry.sent) || entry.sent.length > entry.slots.length) authMailFail('STATE_UNAVAILABLE');
        ids.push(entry.id);
        var seen = [];
        entry.slots.forEach(function (slot) {
            if (!authMailSlot(slot) || seen.indexOf(slot) !== -1) authMailFail('STATE_UNAVAILABLE');
            seen.push(slot);
        });
        seen = [];
        entry.sent.forEach(function (slot) {
            if (entry.slots.indexOf(slot) === -1 || seen.indexOf(slot) !== -1) authMailFail('STATE_UNAVAILABLE');
            seen.push(slot);
        });
    });
    // Never evict an active entry, even when the store is full.
    ledger.events = ledger.events.filter(function (entry) { return entry.expires > now; });
    return ledger;
}

function authMailLedgerText(ledger) {
    var text = JSON.stringify(ledger);
    if (ledger.events.length > 100 || authMailBytes(text) >= AUTH_MAIL_LEDGER_BYTES) authMailFail('LEDGER_FULL');
    return text;
}

function authMailSave(properties, text, afterSend) {
    try { properties.setProperty('AUTH_SENT_INDEX', text); }
    catch (_) { authMailFail(afterSend ? 'SEND_STATE_UNKNOWN' : 'STATE_UNAVAILABLE'); }
}

function doPost(e) {
    var lock;
    var acquired = false;
    try {
        var raw = e && e.postData && e.postData.contents;
        if (typeof raw !== 'string') authMailFail('INVALID_REQUEST');
        // Reject character overflow before allocating a UTF-8 byte array.
        if (raw.length > 32768 || authMailBytes(raw) > 32768) authMailFail('REQUEST_TOO_LARGE');
        var envelope = authMailParse(raw, 'INVALID_REQUEST');
        if (!authMailKeys(envelope, ['timestamp', 'eventId', 'payload', 'signature']) ||
            !Number.isSafeInteger(envelope.timestamp) || !authMailEventId(envelope.eventId) ||
            typeof envelope.payload !== 'string') authMailFail('INVALID_REQUEST');
        var now = Date.now();
        if (Math.abs(Math.floor(now / 1000) - envelope.timestamp) > 300) authMailFail('EXPIRED_REQUEST');
        var properties;
        var secret;
        try {
            properties = PropertiesService.getScriptProperties();
            secret = properties.getProperty('AUTH_RELAY_SECRET');
        } catch (_) { authMailFail('CONFIG_ERROR'); }
        if (typeof secret !== 'string' || secret.length < 1) authMailFail('CONFIG_ERROR');
        authMailVerify(envelope, secret);
        var messages = authMailValidateMessages(envelope.payload);
        var digest = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, envelope.payload, Utilities.Charset.UTF_8));
        lock = LockService.getScriptLock();
        acquired = lock.tryLock(100);
        if (!acquired) authMailFail('BUSY');
        var ledger = authMailReadLedger(properties, now);
        var entry = ledger.events.filter(function (item) { return item.id === envelope.eventId; })[0];
        if (entry && entry.digest !== digest) authMailFail('EVENT_CONFLICT');
        if (!entry) {
            entry = { id: envelope.eventId, digest: digest, expires: now + AUTH_MAIL_DAY_MS,
                slots: messages.map(function (message) { return message.messageId; }), sent: [] };
            ledger.events.push(entry);
        }
        var pending = messages.filter(function (message) { return entry.sent.indexOf(message.messageId) === -1; });
        if (pending.length === 0) return authMailJson({ success: true, eventId: envelope.eventId });

        // Reserve capacity for the final state, not merely the shorter pending state.
        var completed = JSON.parse(JSON.stringify(ledger));
        var reserved = completed.events.filter(function (item) { return item.id === envelope.eventId; })[0];
        reserved.sent = entry.slots.slice();
        // A later acceptance can extend expiry; reserve its maximum integer width too.
        reserved.expires = Number.MAX_SAFE_INTEGER;
        authMailLedgerText(completed);
        if (MailApp.getRemainingDailyQuota() < pending.length) authMailFail('QUOTA_EXCEEDED');
        authMailSave(properties, authMailLedgerText(ledger), false);
        for (var i = 0; i < pending.length; i++) {
            var message = pending[i];
            try {
                MailApp.sendEmail({ to: message.to, subject: message.subject, body: message.body,
                    htmlBody: message.htmlBody, name: 'MAXMUXSIX' });
            } catch (_) { authMailFail('SEND_FAILED'); }
            entry.sent.push(message.messageId);
            entry.expires = Date.now() + AUTH_MAIL_DAY_MS;
            authMailSave(properties, authMailLedgerText(ledger), true);
        }
        return authMailJson({ success: true, eventId: envelope.eventId });
    } catch (error) {
        return authMailJson({ success: false, code: error instanceof AuthMailFailure ? error.code : 'INTERNAL_ERROR' });
    } finally {
        if (acquired) {
            try { lock.releaseLock(); } catch (_) { /* Mail and state result is already determined. */ }
        }
    }
}

function doGet() {
    return authMailJson({ service: 'MAXMUXSIX Auth Mail' });
}
