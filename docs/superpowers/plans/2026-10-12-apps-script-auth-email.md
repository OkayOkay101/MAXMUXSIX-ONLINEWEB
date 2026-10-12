# Apps Script Auth Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ส่งอีเมล Auth ของ MAXMUXSIX ผ่าน Apps Script โดยคงการยืนยันอีเมลและระบบคำสั่งซื้อเดิม

**Architecture:** Signed Supabase Send Email Hook → Edge relay → isolated HMAC-protected Apps Script → MailApp. Relay รอผลส่งจริงในงบเวลา ไม่ใช้ background acknowledgement หรือเพิ่มคิวถาวร

**Tech Stack:** JavaScript ES modules, Node built-in test runner, Deno Edge Functions, Standard Webhooks library แบบ pin version, Google Apps Script V8/MailApp/Script Properties

**Spec:** `docs/superpowers/specs/2026-10-12-apps-script-auth-email-design.md` (อนุมัติแล้ว 2026-10-12)

## Global Constraints

- จำกัด project เป็น `lxvxffrexegvqzeojztw` และปลายทาง redirect เป็น `https://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/` เท่านั้น
- HTTP hook มีเพดาน 5 วินาที กำหนดเวลารอ upstream ไม่เกิน 3.5 วินาที และงบเวลารวมเป้าหมายต่ำกว่า 4.5 วินาที
- ไม่แก้หรือแทนที่ `/exec` คำสั่งซื้อเดิม บัญชี Google เดียวกันยังใช้โควตาส่งร่วมกัน การแยก deployment ไม่เพิ่มโควตา
- เก็บ secret ใน Script Properties และ Edge secrets เท่านั้น ไม่ใช้ token ที่อยู่ใน JavaScript สาธารณะ
- ไม่ใส่รหัสผ่าน, Auth token, signature, secret หรือเนื้อหาอีเมลใน logs รายงานเฉพาะ event ID, ประเภท, สถานะ และเวลา
- ไม่มี schema migration, frontend auth rewrite, public member management, auto-confirm, SMTP หรือบริการเสียเงินในแผนนี้
- ห้าม stage `output/`, `tmp/`, assets ภาพ หรือเอกสาร public-membership ที่ค้างอยู่ ใช้ชื่อไฟล์เฉพาะในแต่ละ commit; ไม่ push จนได้รับคำสั่ง

## Review Focus

1. Recipient ที่มี comma/newline ต้องถูกปฏิเสธ ไม่กลายเป็นส่งหลายคน — Task 1/2
2. Timeout หลัง MailApp ส่งแล้วเป็นผลไม่แน่นอน ต้องไม่ retry อัตโนมัติหรืออ้างว่าส่งไม่สำเร็จแน่นอน — Task 3
3. Email change ส่งสำเร็จหนึ่งที่อยู่แล้วอีกที่อยู่ล้มเหลว ต้องจำสถานะรายข้อความ — Task 2
4. Redirect ไป HTTP/host อื่น/307 ที่อาจส่ง body ซ้ำ ต้องไม่รั่ว secret — Task 3
5. Idempotency store เต็มหรือบันทึกไม่ได้ ต้องไม่ส่งเมลเพิ่มโดยไม่มีทางบันทึกสถานะ — Task 2

## File Map and Interfaces

Create:
- `supabase/functions/send-auth-email/messages.mjs`: pure payload validation and fixed Thai email templates
- `supabase/functions/send-auth-email/relay.mjs`: injected webhook verifier, HMAC envelope, bounded Google transport and hook response
- `supabase/functions/send-auth-email/index.ts`: Deno runtime wiring, Standard Webhooks dependency and private environment variables
- `google_auth_apps_script.js`: isolated GAS handler; never replace `google_apps_script.js`
- `tests/helpers/auth-gas-loader.js`: isolated VM mocks for PropertiesService, Utilities, LockService, MailApp and time
- `tests/unit/31-auth-email-messages.test.js`: template/payload coverage
- `tests/unit/32-auth-email-gas.test.js`: HMAC/replay/quota/idempotency coverage
- `tests/unit/33-auth-email-relay.test.js`: signed hook and upstream behavior coverage
- `docs/apps-script-auth-email-setup.md`: deployment, secret entry, test and rollback runbook

Modify: `supabase/config.toml` only to configure the new function. Do not modify existing dispatcher tests or frontend credentials.

Shared contracts (all code tasks use these exact names):

```js
// messages.mjs
// Input: verified Supabase {user, email_data}; config {projectUrl, siteUrl}
// Throws typed validation errors; returns 1 or 2 messages.
buildAuthMessages(payload, config); // Array<{messageId, to, subject, htmlBody, body}>
// messageId is a stable slot (current/new/primary), not a hash of a token.

// relay.mjs
createAuthEmailHandler({verify, fetchImpl, now, config}); // (Request) => Promise<Response>
// verify(rawBody, headers) => verified payload; production uses Standard Webhooks.
// config: {projectUrl, siteUrl, gasUrl, relaySecret, upstreamTimeoutMs:3500}

// relay -> GAS: JSON envelope, HMAC SHA-256 / base64 over `${timestamp}.${eventId}.${payload}`
// payload is an exact JSON string: {version:1,messages:[...]}
// {timestamp: integer seconds, eventId: string, payload: string, signature: string}
// GAS -> relay: {success:true,eventId:string} or {success:false,code:string}
// GAS global entry points: doPost(e), doGet(e); doGet never sends mail or exposes quota/secrets.
```

### Task 1: Validate Auth payloads and render controlled messages

**Files:** messages.mjs and 31-auth-email-messages.test.js from file map.

- [ ] Read the approved spec and current Supabase changelog (`https://supabase.com/changelog.md`); inspect relevant breaking changes and Send Email Hook docs via MCP. Confirm action names, email-change mapping, reauthentication OTP behavior and verify URL syntax before coding. Record reviewed URLs in the runbook; stop for design correction if incompatible.
- [ ] Write failing tests using Node `node:test` / `assert/strict`. Use fixture-only addresses on `example.test`, never production mail. Example:

```js
const {test} = require('node:test');
const assert = require('node:assert/strict');
test('signup uses only the configured project and redirect', async () => {
  const {buildAuthMessages} = await import('../../supabase/functions/send-auth-email/messages.mjs');
  const config = {projectUrl:'https://lxvxffrexegvqzeojztw.supabase.co',siteUrl:'https://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/'};
  const rows = buildAuthMessages({user:{email:'buyer@example.test'},email_data:{email_action_type:'signup',token:'123456',token_hash:'fixture-hash',redirect_to:config.siteUrl,site_url:config.siteUrl}},config);
  assert.equal(rows.length,1);
  assert.equal(rows[0].to,'buyer@example.test');
  assert.match(rows[0].body,/fixture-hash/);
  assert.equal(rows[0].messageId,'primary');
});
```

- [ ] Add concrete fixture cases for signup/recovery/invite/magiclink/reauthentication; email-change one/two-recipient variants and reversed hash mapping; unsupported actions; missing token/hash/email; comma, semicolon and CRLF in recipient; metadata containing `<img>`; external redirect and site URL. Assert rejection before mail creation, escaping in HTML, plain text preserved, and no links for OTP-only reauthentication.
- [ ] Run `node --test tests/unit/31-auth-email-messages.test.js` and confirm failure from missing module/assertions.
- [ ] Implement pure renderer with six explicit action branches, fixed Thai subject/body, URL construction through `URL`/`searchParams`, strict single-recipient validation and allowlisted config. No networking, environment access or logging. Validation throws a stable code (not the full payload).
- [ ] Run targeted tests to green and `npm test` for regression. Commit only the renderer/test: `feat: render validated MAXMUXSIX auth emails`.

### Task 2: Build isolated authenticated Apps Script sender

**Files:** google_auth_apps_script.js, auth-gas-loader.js, 32-auth-email-gas.test.js.

**Consumes:** HMAC envelope and message contracts from file map. **Produces:** GAS JSON success/error contract; Script Properties `AUTH_RELAY_SECRET` plus bounded `AUTH_SENT_INDEX` ledger.

- [ ] Add an independent VM loader (do not change legacy gas-loader.js) mocking Utilities HMAC/base64 using Node crypto; Script Properties; clock; lock; quota; send and property-write failures. Export `createAuthGasInstance({secret,nowMs,quota,lockAcquired,failSendAt,failPropertyWrite})` returning `{gas,sentEmails,properties}`. Its `doPost` receives `{postData:{contents:JSON.stringify(envelope)}}`.
- [ ] Add red tests: unsigned/altered/expired/future envelope sends zero mail; valid sends once; duplicate skips; concurrent lock unavailable sends zero. Example assertion:

```js
assert.equal(sender.gas.doPost({postData:{contents:JSON.stringify({timestamp:1,eventId:'evt',payload:'{}',signature:'bad'})}}).getJson().success,false);
assert.equal(sender.sentEmails.length,0);
```

- [ ] Add replay window tests at 300 seconds, malformed/oversized JSON, at most two messages, duplicate messageId, comma/newline recipient, fixed name MAXMUXSIX, quota 0, tryLock false, send exception, ledger-full, property-write failure and partial email-change send. Same event ID with different payload must fail; expired ledger entries must be pruned.
- [ ] Run `node --test tests/unit/32-auth-email-gas.test.js` and capture expected failures.
- [ ] Implement doPost with a 32 KiB envelope cap; strict schema; timestamp tolerance 300 seconds; constant-work byte comparison; short lock <=100 ms. Validate all messages and required quota before sending. Key ledger by event ID and payload digest; retain successful message slots 24 hours, prune expired entries, cap 100 events and serialized ledger <8 KiB. Full ledger fails closed. Persist a reserved entry before any send, then each accepted slot immediately; incomplete events resume only missing slots if called again with the same signed payload. No automatic retry initiation. Failed post-send ledger writes report ambiguous failure, never success.
- [ ] Implement JSON error codes without thrown error text or recipient/token; release lock only if acquired. doGet returns a static service label only. Use Script Properties secret, never hardcode it. Provide no automatic testRun that sends mail.
- [ ] Run targeted tests, `node --test tests/unit/06-google-apps-script.test.js`, and `npm test`. Commit these three files only: `feat: add signed Apps Script auth mail sender`.

### Task 3: Implement signed Edge relay and deadline-safe transport

**Files:** relay.mjs, index.ts, 33-auth-email-relay.test.js, supabase/config.toml.

**Consumes:** buildAuthMessages and GAS contract. **Produces:** authenticated HTTP hook returning 200 `{}` only on confirmed upstream success, otherwise documented Supabase hook error JSON.

- [ ] Write failing tests with injected verifier/fetch/time. Verify missing/invalid signatures do not call fetch; valid hook creates exact HMAC envelope and expects matching response eventId. Exercise stale timestamps with the real pinned Standard Webhooks library in runtime verification, not just a permissive mock.
- [ ] Include tests for method rejection, bounded request/response body (32/16 KiB), unknown event action, missing env/secret, wrong response eventId, HTTP200+success:false, malformed JSON, quota response, timeout, and network failure. Assert errors never echo raw request/secret/recipient/token.
- [ ] Add redirect cases: allow HTTPS `script.google.com` deployment URL and expected 302/303 response-location to exact `script.googleusercontent.com`; follow with credential-free GET. Reject custom ports, URL userinfo, non-Google hosts, downgrade, 307/308 and >2 redirects. The initial URL must be `https://script.google.com/macros/s/<deployment-id>/exec`. Test an upstream that resolves only after abort and assert no success or retry.
- [ ] Run `node --test tests/unit/33-auth-email-relay.test.js` to red, then implement handler using the interface above. Read bounded streams; set one AbortController deadline spanning fetch, redirects and response parsing (3500 ms), clear timer in finally. Do not create a new deadline after redirect. Reject outbound JSON size over 32 KiB before fetch; log status/duration/eventId only.
- [ ] Wire index.ts to `Deno.serve` and a pinned current-verified Standard Webhooks dependency. Environment names: `SEND_EMAIL_HOOK_SECRET`, `AUTH_GAS_URL`, `AUTH_GAS_RELAY_SECRET`, `SITE_URL`. Project URL is fixed to the approved project. Validate secret format without printing it; production verifier must consume original raw request body and headers.

```toml
[functions.send-auth-email]
verify_jwt = false
```

- [ ] Add the stanza above without changing admin-users. Gateway JWT is disabled because hook calls precede sessions; webhook signature remains mandatory and missing configuration fails closed.
- [ ] Run all Node tests; check Deno availability with `deno --version`. If available run `deno check supabase/functions/send-auth-email/index.ts` plus an isolated real-library signed/modified/stale payload test. If unavailable report runtime verification as incomplete; do not infer deployment success from Node mocks. Commit only relay/runtime/config/tests: `feat: relay signed Supabase auth mail to Apps Script`.

### Task 4: Deployment runbook, controlled live tests and activation gate

**Files:** docs/apps-script-auth-email-setup.md. Hosted changes only after preceding tests pass and user supplies required Google access/test recipient.

- [ ] Write runbook with exact secrets above; never include values. Create a separate Google Apps Script project for google_auth_apps_script.js, execute as owner, grant MailApp permission privately and deploy Web App with Anyone access. Do not replace existing order project/deployment. Generate fresh 32-byte random relay secret locally; enter privately in Script Properties and Edge secrets without tool-output echo. Hook secret is separately generated/configured in Supabase.
- [ ] Explain Google account shared daily quota, non-SMTP nature, 5-second limit, ambiguous sends/duplicate crash window and no exactly-once/SLA guarantee. Record prior hosted hook configuration privately for rollback without secret logging.
- [ ] Before live tests ask for one user-controlled mailbox and permission for up to 6 emails total: 4 signed relay probes (first invocation after deployment, two warm, one after an idle interval), then one real signup and one recovery. Fixtures/probes must be labelled test and contain no fabricated working Auth tokens. Existing customer accounts must not be altered or deleted. If more emails are needed, ask first.
- [ ] Deploy GAS and Edge while Send Email Hook remains disabled. Verify real hook-library tests and negative signed/unsigned requests cause no mail. Record probe duration, upstream status and user-confirmed receipt without logging recipient/tokens. Every observed total must be <4500 ms and upstream <3500 ms. Failures stop activation; limited samples cannot establish worst-case latency.
- [ ] Only after timing/receipt passes, enable Send Email Hook pointing to `https://lxvxffrexegvqzeojztw.supabase.co/functions/v1/send-auth-email` and private signing secret. Preserve Confirm Email and existing Site URL/redirect. Execute approved signup/recovery once each; user verifies inbox and completes links privately. Confirm session/profile belongs to the test account using authenticated identity without exposing personal data.
- [ ] On timeout, send failure or broken link disable the new hook, restore recorded prior config and report default-mail limitations remain. Do not auto-confirm or silently switch providers. If Google authorization, deploy, Deno verification or test mailbox is unavailable, stop at local implementation with explicit remaining steps.
- [ ] Run `npm test`, `git diff --check` and security review for frontend secret exposure, unsigned paths, SSRF and response/PII logs. Ensure legacy dispatcher unchanged. Commit runbook and task-owned fixes only: `docs: document Apps Script auth mail rollout and rollback`. Do not commit hosted secrets or mail artifacts.
- [ ] Report separately: local tests, runtime checks, deployed-but-disabled status, actual email receipt, signup/recovery results, hook state, remaining blockers. No production success claim solely from deployment or mocks.

## Self-review and handoff

- Spec coverage: payload/actions/templates Task 1; isolated GAS/HMAC/ledger Task 2; signature/URL/deadline/errors Task 3; real delivery/permissions/rollback/regression Task 4.
- All five Review Focus conditions have explicit tests in the owning tasks.
- This document is a plan, not implementation evidence. No hosted settings or real accounts have changed from writing it.
- Execution awaits user review and choice: **Subagent-driven** (implementer + independent review per task) or **Native** (one implementer with final independent review). Recommend Subagent-driven because this changes Auth email delivery and a signature/token-mapping mistake can block signups or expose account links.
