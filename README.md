# MAXMUXSIX Online Store

Demo storefront for MAXMUXSIX, a charcoal-grilled sticky rice (ข้าวหลามเตาถ่าน) shop in Nong Mon, Chon Buri. It does not sell, deliver, or take payments.

[ภาษาไทย](README_TH.md) · [User guide](docs/user-guide.md) · [Configuration](docs/configuration.md) · [Development](docs/development.md)

![MAXMUXSIX storefront](store_front.jpg)

## Requirements

- Node.js 22 or later (for unit tests and builds)
- Python 3 (or any static HTTP server to serve files locally)
- Google Chrome (only for `tests/browser/membership.cjs`)

## Setup

```bash
npm ci --ignore-scripts
python -m http.server 8000
```

On macOS or Linux, use `python3 -m http.server 8000` if `python` points to Python 2 or is unavailable. Open `http://localhost:8000/` in your browser. Do not open `index.html` directly from disk (`file://`): membership email links and browser security policies require HTTP(S).

## Features

- **Shopping:** product search and category filters, cart with coupon codes (`MAX10`, `WELCOME10`), and a flavour recommendation quiz
- **Membership:** sign-up, email confirmation, sign-in, and password reset via Supabase Auth (protected by Cloudflare Turnstile when enabled)
- **Email and chat:** order/welcome emails and a LINE OA chatbot, both powered by Google Apps Script

## Usage

| Task | Where |
|---|---|
| Find a product | Search box and filters on the front page |
| Add to cart | "🛒 เพิ่มลงตะกร้า" on a product card |
| Apply a coupon | Coupon box in the cart (`MAX10` requires 150 baht minimum; `WELCOME10` has no minimum) |
| Sign in | Membership area, "เข้าสู่ระบบ" |

## Configuration

Public frontend settings live in `auth-config.js`; see [docs/configuration.md](docs/configuration.md). Never put a `service_role` or `sb_secret` key in this repository.

## Tests

```bash
npm test
```

## Project layout

- `index.html` (storefront) and `auth-config.js` (public Supabase & Turnstile settings)
- `assets/`, `scripts/`: JavaScript modules, bundled vendor SDK, images, video, and build/CSP helpers
- `supabase/`, `tests/`: SQL migrations, Edge Functions, unit tests, and browser tests
- `docs/`: user guide, configuration, development, setup notes, and ADRs
- `*_apps_script.js`: Google Apps Script files (install only one LINE bot file per Apps Script project)

## License

`package.json` sets the license to `UNLICENSED`. No open-source license is granted.
