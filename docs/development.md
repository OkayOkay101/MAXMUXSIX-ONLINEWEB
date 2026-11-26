# Development

The Thai version is [development_TH.md](development_TH.md).

## Requirements

- Node.js 22 or later. The membership guide states this requirement ([cloud-membership-setup.md](cloud-membership-setup.md)). `package.json` has no `engines` field.
- The Supabase SDK is pinned to `2.117.3` in `package.json`.
- Google Chrome, only for the browser test in `tests/browser/membership.cjs`.

## Install

```bash
npm ci --ignore-scripts
```

`--ignore-scripts` skips install scripts. The build does not need them.

## npm scripts

| Command | What it runs |
|---|---|
| `npm run test` | `node --test tests/unit/*.test.js` |
| `npm run test:verbose` | The same tests with the spec reporter |
| `npm run build:auth` | esbuild bundles `assets/js/supabase-entry.js` into `assets/vendor/supabase.js` |
| `npm run csp:hash` | `node scripts/csp-hash.js` |

## Deployment build

`vercel.json` sets the build command to `node scripts/build-public.js` and the output directory to `public`. The script copies only the files listed in `PUBLIC_FILES` into `public/`. It stops if a listed file is missing, and it refuses to delete the project folder.

Files that are not listed (tests, docs, Apps Script files, Supabase code) are not published.

`vercel.json` also sets these headers on every path: `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and `Strict-Transport-Security`.

## Browser test for membership

```bash
PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser/membership.cjs
```

The script uses a mocked Supabase provider. It does not send email or delete real accounts. `PLAYWRIGHT_MODULE` must point to an installed Playwright module, and the script launches Google Chrome.

## Unit tests

`npm test` runs `tests/unit/*.test.js`. Some of these tests (membership database, order email database, and shop orders database) run the SQL migrations in an in-memory PostgreSQL (PGlite). Other tests load browser scripts and Apps Script files through the helpers in `tests/helpers/`.

`tests/runtime/auth-email-webhook.test.ts` is a TypeScript file. No npm script runs it, so `npm test` does not include it.

## Supabase

- Migrations are in `supabase/migrations/`. Follow the order and the one-time rule in [cloud-membership-setup.md](cloud-membership-setup.md). Do not run a migration twice.
- Edge Functions are in `supabase/functions/`. Deploy them with the Supabase CLI, as described in the membership guide.
- The unit tests do not test a hosted Supabase project.

## Google Apps Script

Each of these root files is pasted into its own Apps Script project:

- `google_apps_script.js`: order and receipt emails
- `google_auth_apps_script.js`: auth email relay (deploy it in a separate project)
- `line_bot_smart_apps_script.js` or `line_bot_apps_script.js`: LINE bot. Choose one.

Do not put both LINE bot files in one project. The Apps Script files are not part of the build.

## Test folders

- `tests/unit/`: unit tests, one file per area (cart, catalog filters, quiz, auth, order email, LINE bot, captcha, and others)
- `tests/helpers/`: loaders that run browser scripts and Apps Script files in Node
- `tests/browser/`: browser test for membership
- `tests/runtime/`: TypeScript runtime test for the auth email webhook (not run by npm scripts)
