# Development

The Thai version is [development_TH.md](development_TH.md).

## Requirements

- Node.js 22 or later (required by [cloud-membership-setup.md](cloud-membership-setup.md); `package.json` has no `engines` field).
- `@supabase/supabase-js` is pinned to `2.117.3` in `package.json`.
- Google Chrome, only for the browser test in `tests/browser/membership.cjs`.

## Install

```bash
npm ci --ignore-scripts
```

`--ignore-scripts` skips install scripts. The build and test suite do not need them.

## npm scripts

| Command | What it runs |
|---|---|
| `npm test` | `node --test tests/unit/*.test.js` |
| `npm run test:verbose` | The same unit tests with the `spec` reporter |
| `npm run build:auth` | `esbuild` bundles `assets/js/supabase-entry.js` into `assets/vendor/supabase.js` |
| `npm run csp:hash` | `node scripts/csp-hash.js` (updates inline `<script>` SHA-256 hashes in `index.html`) |

**CSP hash rule:** `index.html` uses a strict `script-src` without `'unsafe-inline'`. Whenever you edit an inline `<script>` in `index.html`, run `npm run csp:hash` before committing; otherwise `tests/unit/47-csp-strict-script.test.js` will fail and browsers will block the script. Note that `.gitattributes` pins `index.html` to LF line endings so hashes stay identical across Windows and Linux.

## Deployment build

`vercel.json` sets `"framework": null`, `"installCommand": ""`, `"buildCommand": "node scripts/build-public.js"`, and `"outputDirectory": "public"`.

`scripts/build-public.js` copies only the 18 files listed in `PUBLIC_FILES` into `public/`. It fails if any listed file is missing, and refuses to delete the project root or its parent. Files outside `PUBLIC_FILES` (tests, docs, Apps Script files, Supabase code) are not published.

`vercel.json` also sets six security headers on `/(.*)`:
- `X-Frame-Options: DENY`
- `Content-Security-Policy: frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

## Browser test for membership

```bash
PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser/membership.cjs
```

The script uses a mocked Supabase provider. It does not send email or delete real accounts. `PLAYWRIGHT_MODULE` must point to an installed Playwright module, and the script launches Google Chrome.

## Unit tests

`npm test` runs `tests/unit/*.test.js`. Three database test files (`12-membership-database.test.js`, `35-order-email-database.test.js`, and `41-shop-orders-database.test.js`) run the SQL migrations in an in-memory PostgreSQL (`@electric-sql/pglite`). Other tests load browser scripts and Apps Script files through the helpers in `tests/helpers/`.

`tests/runtime/auth-email-webhook.test.ts` is a TypeScript runtime test. No npm script runs it, so `npm test` does not include it.

## Supabase

- Migrations are in `supabase/migrations/`. Follow the order and the one-time rule in [cloud-membership-setup.md](cloud-membership-setup.md). Do not run a migration twice.
- Edge Functions are in `supabase/functions/`. Deploy them with the Supabase CLI as described in the membership guide.
- Unit tests do not hit a live hosted Supabase project.

## Google Apps Script

Each of these root files is pasted into its own Apps Script project:

- `google_apps_script.js`: order and welcome emails
- `google_auth_apps_script.js`: auth email relay (deploy in a separate project)
- `line_bot_smart_apps_script.js` or `line_bot_apps_script.js`: LINE bot (choose one; see [ADR 0001](adr/0001-keep-two-line-bots.md))

Do not put both LINE bot files in the same Apps Script project. Apps Script files are not part of the Vercel build.

## Test folders

- `tests/unit/`: unit tests separated by feature/area (sanitizer, security, cart, quiz, catalog, GAS, responsive UI, LINE bot, SEO, cloud auth, PGlite DB, captcha, CSP, etc.)
- `tests/helpers/`: loaders that execute browser scripts and Apps Script files in Node
- `tests/browser/`: Playwright browser test for membership
- `tests/runtime/`: TypeScript runtime test for the auth email webhook (not run by npm scripts)
