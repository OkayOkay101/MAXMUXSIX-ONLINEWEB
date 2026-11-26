# Configuration

Each value below is read from the file named in its section. Defaults reflect the current codebase. The Thai version is [configuration_TH.md](configuration_TH.md).

## Public storefront settings (`auth-config.js`)

`window.MAXMUXSIX_AUTH_CONFIG` is frozen (`Object.freeze`) and loaded in the browser. These values are public and safe to commit. Access control depends on Row Level Security (RLS) in Supabase, not on hiding these values.

| Field | Meaning | Current value in `auth-config.js` |
|---|---|---|
| `url` | Supabase project URL | `https://lxvxffrexegvqzeojztw.supabase.co` |
| `publishableKey` | Supabase publishable key | `sb_publishable_…` key |
| `redirectUrl` | Where auth email links return to | `https://maxmuxsix-demo.vercel.app/` |
| `turnstileSiteKey` | Cloudflare Turnstile site key | `0x4AAAAAAGTS3jm-E4yU4CzM` (set to `""` to disable CAPTCHA) |

The Content Security Policy `<meta>` tag in `index.html` (`connect-src` directive) lists the Supabase project origin directly. If you switch Supabase projects, update `connect-src` to match. A custom or self-hosted Supabase URL also requires the validation updates described in [cloud-membership-setup.md](cloud-membership-setup.md).

## Membership limits (`index.html`)

| Constant | Meaning | Value |
|---|---|---|
| `RATE_LIMITS.register` | Sign-up attempts | 3 per 10 minutes |
| `RATE_LIMITS.subscribe` | Subscribe attempts | 5 per hour |
| `RATE_LIMITS.login_fail` | Failed sign-in attempts | Block for 5 minutes after 5 failures |
| `MAX_LOG_ENTRIES` | Entries kept in the local security log | 50 |

These limits run in the browser via `localStorage`. They assist normal use but are not a security boundary. Configure server-side rate limits in the Supabase Auth dashboard.

## Coupon rules (`index.html`)

| Code | Rule |
|---|---|
| `MAX10` | 10% off when the subtotal is at least 150 baht |
| `WELCOME10` | 10% off with no minimum |

## Google Apps Script email (`google_apps_script.js`)

| Setting | Meaning | Value |
|---|---|---|
| `SECURITY_CONFIG.MAX_SUBJECT_LEN` | Maximum subject length | 150 |
| `SECURITY_CONFIG.MAX_BODY_LEN` | Maximum body length | 100000 |
| `SECURITY_CONFIG.ALLOWED_FROM_NAME` | Sender display name | `MAXMUXSIX ข้าวหลามเตาถ่าน` |

The relay token is read from Apps Script Properties under `ORDER_RELAY_TOKEN` (rotate it with `rotateRelayToken()`). Never commit it to any file.

## LINE bot (`line_bot_smart_apps_script.js`)

| Setting | Meaning | Value |
|---|---|---|
| `SHOP_CONFIG.shopName` | Shop name in replies | `MAXMUXSIX ข้าวหลามเตาถ่าน` |
| `SHOP_CONFIG.phone` | Contact phone in replies | `081-234-5678` (sample number) |
| `SHOP_CONFIG.businessHours` | Opening hours text | `ทุกวัน 08:00 - 18:00 น.` |
| `SHOP_CONFIG.address` | Shop address text | `ร้าน MAXMUXSIX ถนนสายหลัก ตลาดเตาถ่าน` |
| `SHOP_CONFIG.promptPay` / `bankAccount` | Payment text | `เว็บตัวอย่าง ไม่มีการรับชำระเงิน ห้ามโอนเงิน` |
| `ORDER_STATE_TTL_MS` | How long an unfinished order step is kept | 30 minutes |
| `CHUNK_SIZE` (broadcast) | Recipients per LINE multicast request | 500 |

The other LINE bot file, `line_bot_apps_script.js`, is an alternative (see [ADR 0001](adr/0001-keep-two-line-bots.md)). Install only one of the two in the same Apps Script project, because both define the same entry-point function names.

## Auth email relay (`google_auth_apps_script.js`)

| Setting | Meaning | Value |
|---|---|---|
| `AUTH_MAIL_DAY_MS` | Length of the daily window | 24 hours |
| `AUTH_MAIL_LEDGER_BYTES` | Size limit of the send ledger | 8 KiB |

The relay secret is read from Apps Script Properties under `AUTH_RELAY_SECRET`. Set it in the Apps Script project; never write it in any file.

## Supabase Edge Functions (`supabase/config.toml` and environment)

| Name | Used by | Notes |
|---|---|---|
| `verify_jwt = false` | `admin-users`, `order-email` | Legacy gateway JWT verification does not support publishable keys; each handler verifies the user token via `Auth.getUser(jwt)`. Do not remove those checks. |
| `verify_jwt = false` | `send-auth-email` | Auth hooks run before user sessions exist; the handler verifies requests with Standard Webhooks (`npm:standardwebhooks@1.1.1`). |
| `SITE_URL` | `admin-users`, `order-email`, `send-auth-email` | Allowed origin for CORS and auth-redirect validation. Set to the live site URL (`https://maxmuxsix-demo.vercel.app/`). |
| `AUTH_GAS_URL`, `AUTH_GAS_RELAY_SECRET` | `send-auth-email`, `order-email` | Edge Function secrets pointing to the Apps Script auth-mail relay and its shared secret. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Platform secrets. Never put them in the frontend. |

For the full membership setup, see [cloud-membership-setup.md](cloud-membership-setup.md).
