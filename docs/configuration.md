# Configuration

Every value below is read from the file named in its row. Defaults are the values in the code at the time of writing.

## Public storefront settings (`auth-config.js`)

`window.MAXMUXSIX_AUTH_CONFIG` is frozen and loaded in the browser. These values are public and can be committed. Access control depends on Row Level Security in Supabase, not on hiding these values.

| Field | Meaning | Default |
|---|---|---|
| `url` | Supabase project URL | Project URL, `https://<ref>.supabase.co` |
| `publishableKey` | Supabase publishable key | `sb_publishable_…` |
| `redirectUrl` | Redirect after sign-up or recovery | `https://maxmuxsix-demo.vercel.app/` |
| `turnstileSiteKey` | Cloudflare Turnstile site key | Empty string = CAPTCHA off |

If you change the Supabase project, update the `connect-src` entry in the Content Security Policy in `index.html` to match.

## Membership security limits (`index.html`)

| Constant | Meaning | Value |
|---|---|---|
| `RATE_LIMITS.register` | Sign-up attempts | 3 per 10 minutes |
| `RATE_LIMITS.subscribe` | Subscribe attempts | 5 per hour |
| `RATE_LIMITS.login_fail` | Failed sign-in attempts | Block for 5 minutes after 5 failures |
| `MAX_LOG_ENTRIES` | Entries kept in the local audit log | 50 |

These limits run in the browser. Treat them as a convenience, not as the main protection; Supabase Auth rate limits are configured in the Supabase dashboard.

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
| `SHOP_CONFIG.phone` | Contact phone shown to customers | Sample number |
| `SHOP_CONFIG.businessHours` | Opening hours text | `ทุกวัน 08:00 - 18:00 น.` |
| `SHOP_CONFIG.promptPay` | Payment text | Sample only; the file says no payments are taken |
| `ORDER_STATE_TTL_MS` | How long an unfinished order step is kept | 30 minutes |
| `CHUNK_SIZE` (broadcast) | Recipients per LINE request | 500 |

The other LINE bot file, `line_bot_apps_script.js`, is an alternative. Install only one of the two in the same Apps Script project; both define the same function names.

## Auth email relay (`google_auth_apps_script.js`)

| Setting | Meaning | Value |
|---|---|---|
| `AUTH_MAIL_DAY_MS` | Length of the daily window | 24 hours |
| `AUTH_MAIL_LEDGER_BYTES` | Size of the send ledger | 8 KiB |

The relay secret (`AUTH_RELAY_SECRET`) is set privately in Apps Script. Do not write it in any file.

## Supabase secrets (set in the Supabase dashboard or CLI)

| Name | Used by | Notes |
|---|---|---|
| `SITE_URL` | `admin-users` Edge Function | Allowed origin for CORS. Set to the live site URL |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | Standard platform variables. Never put them in the frontend |

`supabase/config.toml` sets `verify_jwt = false` for `admin-users`, `order-email` and `send-auth-email`. Each handler checks the user token itself with `Auth.getUser`. Do not remove those checks.

For the full membership setup, see the [membership setup guide](cloud-membership-setup.md).
