import { AuthEmailValidationError, buildAuthMessages } from './messages.mjs';

const encoder = new TextEncoder();
const REQUEST_LIMIT = 32 * 1024;
const RESPONSE_LIMIT = 16 * 1024;
const MAX_DEADLINE_MS = 4500;
const EVENT_ID = /^[A-Za-z0-9_-]{1,128}$/;
const VALIDATION_CODES = new Set([
    'INVALID_AUTH_PAYLOAD', 'INVALID_AUTH_CONFIG', 'INVALID_AUTH_URL', 'UNSUPPORTED_AUTH_ACTION'
]);

class RelayFailure extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
const fail = (status, message) => { throw new RelayFailure(status, message); };
const response = (status, body, timing) => new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', 'Server-Timing': timing }
});

function googleUrl(value, deployment = false) {
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash ||
            url.hostname !== (deployment ? 'script.google.com' : 'script.googleusercontent.com')) return false;
        return !deployment || (!url.search && /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname));
    } catch { return false; }
}

function validConfig(config, maxTimeoutMs = MAX_DEADLINE_MS) {
    return config?.projectUrl === 'https://lxvxffrexegvqzeojztw.supabase.co' &&
        config.siteUrl === 'https://maxmuxsix-demo.vercel.app/' &&
        typeof config.relaySecret === 'string' && config.relaySecret.length > 0 &&
        googleUrl(config.gasUrl, true) && Number.isSafeInteger(config.upstreamTimeoutMs) &&
        config.upstreamTimeoutMs > 0 && config.upstreamTimeoutMs <= maxTimeoutMs;
}

// Literal categories only; never parse, normalize or copy an incoming URL into logs.
// This is observation, not an expanded URL allowlist.
function urlDiagnosticFor(payload, config) {
    const data = payload?.email_data;
    const site = data?.site_url;
    const siteUrlShape = site === config.projectUrl || site === `${config.projectUrl}/` ? 'PROJECT_ROOT' :
        site === `${config.projectUrl}/auth/v1` || site === `${config.projectUrl}/auth/v1/` ? 'PROJECT_AUTH_V1' :
        site === config.siteUrl ? 'FRONTEND' : 'OTHER';
    return { siteUrlShape, redirectMatches: data?.redirect_to === config.siteUrl };
}

// Every awaited boundary races the same deadline, even when a provider ignores abort.
function deadline(now, timeoutMs) {
    const controller = new AbortController();
    const expires = now() + timeoutMs;
    const timeoutError = new RelayFailure(504, 'Auth email delivery outcome is unknown.');
    const expired = new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(timeoutError), { once: true });
    });
    // A synchronous budget check can abort before the first race attaches.
    expired.catch(() => {});
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const check = () => {
        if (now() >= expires) controller.abort();
        if (controller.signal.aborted) throw timeoutError;
    };
    return {
        signal: controller.signal, check,
        async run(operation) {
            check();
            const result = await Promise.race([Promise.resolve().then(() => { check(); return operation(); }), expired]);
            check();
            return result;
        },
        close() { clearTimeout(timer); }
    };
}

function cancelBody(body) {
    try { Promise.resolve(body?.cancel()).catch(() => {}); } catch { /* Best effort only. */ }
}

async function readBody(message, limit, budget, status) {
    const length = message.headers.get('content-length');
    if (length && /^[0-9]+$/.test(length) && Number(length) > limit) {
        cancelBody(message.body);
        fail(status, 'Auth email body exceeds the allowed size.');
    }
    if (!message.body) return '';
    const reader = message.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
    let bytes = 0;
    let text = '';
    let finished = false;
    try {
        while (true) {
            const { value, done } = await budget.run(() => reader.read());
            if (done) { finished = true; break; }
            bytes += value.byteLength;
            if (bytes > limit) fail(status, 'Auth email body exceeds the allowed size.');
            text += decoder.decode(value, { stream: true });
        }
        return text + decoder.decode();
    } finally {
        if (!finished) {
            try { Promise.resolve(reader.cancel()).catch(() => {}); } catch { /* Do not await uncooperative streams. */ }
        }
        try { reader.releaseLock(); } catch { /* A noncooperative read may still own the lock. */ }
    }
}

async function envelopeFor(messages, eventId, config, now, budget) {
    const timestamp = Math.floor(now() / 1000);
    const payload = JSON.stringify({ version: 1, messages });
    const key = await budget.run(() => crypto.subtle.importKey('raw', encoder.encode(config.relaySecret),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']));
    const digest = await budget.run(() => crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${eventId}.${payload}`)));
    const signature = btoa(String.fromCharCode(...new Uint8Array(digest)));
    const body = JSON.stringify({ timestamp, eventId, payload, signature });
    if (encoder.encode(body).byteLength > REQUEST_LIMIT) fail(413, 'Auth email body exceeds the allowed size.');
    return body;
}

async function deliver(body, eventId, config, fetchImpl, budget) {
    let url = config.gasUrl;
    let options = { method: 'POST', body, headers: { 'Content-Type': 'application/json' },
        redirect: 'manual', credentials: 'omit', signal: budget.signal };
    let redirects = 0;
    while (true) {
        const upstream = await budget.run(() => fetchImpl(url, options));
        if (upstream.status >= 300 && upstream.status < 400) {
            cancelBody(upstream.body);
            const location = upstream.headers.get('location');
            if (![302, 303].includes(upstream.status) || redirects >= 2 || !googleUrl(location)) {
                fail(502, 'Auth email provider did not confirm delivery.');
            }
            redirects++;
            url = location;
            options = { method: 'GET', redirect: 'manual', credentials: 'omit', signal: budget.signal };
            continue;
        }
        if (!upstream.ok) {
            cancelBody(upstream.body);
            fail(502, 'Auth email provider did not confirm delivery.');
        }
        const raw = await readBody(upstream, RESPONSE_LIMIT, budget, 502);
        let result;
        try { result = JSON.parse(raw); } catch { fail(502, 'Auth email provider did not confirm delivery.'); }
        if (result?.success !== true || result.eventId !== eventId) {
            fail(502, 'Auth email provider did not confirm delivery.');
        }
        budget.check();
        return;
    }
}

/** Signs and delivers already-validated messages; throws unless the sender confirms. */
export async function sendRelayMessages(messages, eventId, config, { fetchImpl = fetch, now = Date.now } = {}) {
    // Not bound by the 5 s auth-hook ceiling, so a cold Apps Script start can finish.
    if (!EVENT_ID.test(eventId) || !validConfig(config, 15000)) fail(500, 'Mail relay is not configured.');
    const budget = deadline(now, config.upstreamTimeoutMs);
    try {
        const body = await envelopeFor(messages, eventId, config, now, budget);
        await deliver(body, eventId, config, fetchImpl, budget);
    } finally {
        budget.close();
    }
}

/** Authenticates the raw hook before rendering or contacting the isolated sender. */
export function createAuthEmailHandler({ verify, fetchImpl = fetch, now = Date.now, config }) {
    return async request => {
        const started = now();
        let eventId;
        let status = 500;
        let budget;
        let upstreamStarted;
        let validationCode;
        let payload;
        let urlDiagnostic;
        // Numeric durations only: never echo request data, credentials or provider URLs.
        // Upstream includes redirects and bounded response parsing, not just first-byte time.
        const respond = (code, body) => {
            const ended = now();
            const duration = start => Math.max(0, Math.round(ended - start));
            const timing = `relay;dur=${duration(started)}` +
                (upstreamStarted === undefined ? '' : `, upstream;dur=${duration(upstreamStarted)}`);
            return response(code, body, timing);
        };
        try {
            if (request.method !== 'POST') fail(405, 'Auth email hook requires POST.');
            if (typeof verify !== 'function' || !validConfig(config)) fail(500, 'Auth email hook is not configured.');
            budget = deadline(now, config.upstreamTimeoutMs);
            const raw = await readBody(request, REQUEST_LIMIT, budget, 413);
            const headers = Object.fromEntries(request.headers);
            if (!EVENT_ID.test(headers['webhook-id'] ?? '') || !/^[0-9]+$/.test(headers['webhook-timestamp'] ?? '') ||
                !headers['webhook-signature']) fail(401, 'Auth email hook signature is invalid.');
            try { payload = await budget.run(() => verify(raw, headers)); }
            catch (error) {
                if (error instanceof RelayFailure) throw error;
                fail(401, 'Auth email hook signature is invalid.');
            }
            eventId = headers['webhook-id'];
            const messages = buildAuthMessages(payload, config);
            const body = await envelopeFor(messages, eventId, config, now, budget);
            upstreamStarted = now();
            await deliver(body, eventId, config, fetchImpl, budget);
            status = 200;
            return respond(status, {});
        } catch (error) {
            const known = error instanceof RelayFailure;
            if (error instanceof AuthEmailValidationError) {
                // Never log arbitrary error text or a code derived from request values.
                validationCode = VALIDATION_CODES.has(error.code) ? error.code : 'INVALID_AUTH_PAYLOAD';
                if (validationCode === 'INVALID_AUTH_URL' && eventId && upstreamStarted === undefined) {
                    urlDiagnostic = urlDiagnosticFor(payload, config);
                }
            }
            status = known ? error.status : error instanceof AuthEmailValidationError ? 400 : 502;
            return respond(status, { error: { http_code: status, message: known ? error.message :
                status === 400 ? 'Auth email payload is invalid.' : 'Auth email provider did not confirm delivery.' } });
        } finally {
            budget?.close();
            console.info(JSON.stringify({ status, durationMs: Math.max(0, now() - started), ...(eventId ? { eventId } : {}),
                ...(validationCode ? { validationCode } : {}), ...(urlDiagnostic ? { urlDiagnostic } : {}) }));
        }
    };
}
