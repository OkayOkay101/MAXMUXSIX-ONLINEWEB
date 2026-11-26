# Configuration

Each value below is read from the file named in its section. Defaults are the values in the code at the time of writing. The Thai version is [configuration_TH.md](configuration_TH.md).

## Public storefront settings (`auth-config.js`)

`window.MAXMUXSIX_AUTH_CONFIG` is frozen and loaded in the browser. These values are public and can be committed. Access control depends on Row Level Security in Supabase, not on hiding these values.

| Field | Meaning | Default |
|---|---|---|
| `url` | Supabase project URL | Set to the Supabase project URL |
| `publishableKey` | Supabase publishable key | Set to a `sb_publishable_…` key |
| `redirectUrl` | Where email links return to | Set to the demo site address |
| `turnstileSiteKey` | Cloudflare Turnstile site key | Empty string = CAPTCHA off |

The Content Security Policy in `index.html` (the `connect-src` line) lists the Supabase project address directly. If you change the Supabase project, update that line to match. A custom or self-hosted Supabase address also needs the validation changes described in [the membership setup guide](cloud-membership-setup.md).

## Membership limits (`index.html`)

| Constant | Meaning | Value |
|---|---|---|
| `RATE_LIMITS.register` | Sign-up attempts | 3 per 10 minutes |
| `RATE_LIMITS.subscribe` | Subscribe attempts | 5 per hour |
| `RATE_LIMITS.login_fail` | Failed sign-in attempts | Block for 5 minutes after 5 failures |
| `MAX_LOG_ENTRIES` | Entries kept in the local security log | 50 |

These limits run in the browser. They help with normal use but are not a security boundary. Configure Supabase Auth rate limits in the Supabase dashboard.

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

## LINE bot (`line_bot_smart_apps_script.js`)

| Setting | Meaning | Value |
|---|---|---|
| `SHOP_CONFIG.shopName` | Shop name in replies | `MAXMUXSIX ข้าวหลามเตาถ่าน` |
| `SHOP_CONFIG.phone` | Contact phone in replies | Sample number |
| `SHOP_CONFIG.businessHours` | Opening hours text | `ทุกวัน 08:00 - 18:00 น.` |
| `SHOP_CONFIG.promptPay` | Payment text | Sample text; the file says no payments are taken |
| `ORDER_STATE_TTL_MS` | How long an unfinished order step is kept | 30 minutes |
| `CHUNK_SIZE` (broadcast) | Recipients per LINE request | 500 |

The other LINE bot file, `line_bot_apps_script.js`, is an alternative. Install only one of the two in the same Apps Script project, because both define the same function names.

## Auth email relay (`google_auth_apps_script.js`)

| Setting | Meaning | Value |
|---|---|---|
| `AUTH_MAIL_DAY_MS` | Length of the daily window | 24 hours |
| `AUTH_MAIL_LEDGER_BYTES` | Size of the send ledger | 8 KiB |

The relay secret is read from Apps Script properties under `AUTH_RELAY_SECRET`. Set it in the Apps Script project. Do not write it in any file.

## Supabase Edge Functions (`supabase/config.toml`, environment)

| Name | Used by | Notes |
|---|---|---|
| `verify_jwt = false` | `admin-users`, `order-email`, `send-auth-email` | Each handler checks the user token itself with `Auth.getUser`. Do not remove those checks. |
| `SITE_URL` | `admin-users` | The only origin allowed for CORS preflight. Set it to the live site address. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Platform variables. Never put them in the frontend. |

For the full membership setup, see the [membership setup guide](cloud-membership-setup.md).
