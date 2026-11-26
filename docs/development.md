# Development

## Requirements

- Node.js 22 or later. The Supabase SDK is pinned to `2.117.3` in `package.json`.
- Google Chrome, only for the browser test in `tests/browser/membership.cjs`.

## Install

```bash
npm ci --ignore-scripts
```

`--ignore-scripts` skips install scripts. The build does not need them.

## Commands

| Command | What it does |
|---|---|
| `npm test` | Runs `node --test tests/unit/*.test.js` |
| `npm run test:verbose` | Same tests with the spec reporter |
| `npm run build:auth` | Bundles `assets/js/supabase-entry.js` into `assets/vendor/supabase.js` with esbuild |
| `npm run csp:hash` | Runs `scripts/csp-hash.js` to compute the inline script hash for the Content Security Policy |

## Deployment build

`vercel.json` sets the build command to `node scripts/build-public.js` and the output directory to `public`. The script copies only the files listed in `PUBLIC_FILES` into `public/`. It refuses to run if a listed file is missing, and it refuses to delete the project folder.

Files that are not listed (tests, docs, Apps Script files, Supabase code) are not published.

Security headers for the deployed site are set in `vercel.json`: `X-Frame-Options: DENY`, a `frame-ancestors 'none'` CSP, `nosniff`, `no-referrer`, a restricted `Permissions-Policy`, and HSTS.

## Browser test for membership

```bash
PLAYWRIGHT_MODULE=/path/to/playwright node tests/browser/membership.cjs
```

The script uses a mocked Supabase provider. It does not send email or delete real accounts. Set `PLAYWRIGHT_MODULE` to the path of an installed Playwright module.

## Supabase

- Migrations are in `supabase/migrations/`. Run each file once, in order, on a new project. Do not run a migration twice.
- Edge Functions are in `supabase/functions/`. Deploy with the Supabase CLI (see [the membership setup guide](cloud-membership-setup.md)).
- Unit tests use an in-memory PostgreSQL (PGlite) to run the migrations and RLS checks locally. They do not test a hosted Supabase project.

## Google Apps Script

Each `.js` file at the root that ends in `_apps_script.js` is pasted into its own Apps Script project. The Apps Script files are not covered by the build.

- `google_apps_script.js`: order and receipt emails
- `google_auth_apps_script.js`: auth email relay (deploy in a separate project)
- `line_bot_smart_apps_script.js` or `line_bot_apps_script.js`: LINE bot. Choose one.

Do not put two LINE bot files in one project.

## Tests folder

- `tests/unit/`: unit tests, one file per area (cart, catalog filters, auth, order email, LINE, captcha, and others)
- `tests/helpers/`: loaders that run browser scripts and Apps Script files in Node
- `tests/browser/`: browser test for membership
- `tests/runtime/`: runtime test for the auth email webhook
