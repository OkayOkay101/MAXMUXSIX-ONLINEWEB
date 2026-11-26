# MAXMUXSIX Online Store

Demo storefront for MAXMUXSIX, a charcoal-grilled sticky rice (ข้าวหลามเตาถ่าน) shop in Nong Mon, Chon Buri. The site is a sample: it does not sell or deliver anything, and it does not accept payments.

[ภาษาไทย](README_TH.md) · [User guide](docs/user-guide.md) · [Configuration](docs/configuration.md) · [Development](docs/development.md)

![MAXMUXSIX storefront](store_front.jpg)

## Requirements

- Node.js 22 or later, for tests and builds (see [docs/development.md](docs/development.md))
- Google Chrome, only for the browser test

## Setup

```bash
npm ci --ignore-scripts
```

Serve the folder with any static HTTP server, then open the address it prints. Do not open `index.html` directly from disk: the membership email links need HTTP(S).

## Usage

- **Browse the menu:** search and filter the products on the front page. See the [user guide](docs/user-guide.md).
- **Cart and coupons:** add items, then enter a coupon code in the cart.
- **Membership:** sign up, confirm email, and sign in. Needs a Supabase project; see the configuration guide.

## Configuration

Public settings live in `auth-config.js`. The full list, with defaults, is in [docs/configuration.md](docs/configuration.md). Never put a `service_role` or `sb_secret` key in any file in this repo.

| Setting | File | Default |
|---|---|---|
| Supabase project URL | `auth-config.js` | Set to the project URL |
| Publishable key | `auth-config.js` | Set to the publishable key |
| Redirect URL | `auth-config.js` | Field `redirectUrl` |
| Turnstile site key | `auth-config.js` | Empty = CAPTCHA off |

## Tests

```bash
npm test
```

## Project layout

- `index.html`: the storefront (single page)
- `auth-config.js`: public Supabase settings
- `assets/`: JavaScript, vendor bundle, images, and video
- `supabase/`: migrations and Edge Functions
- `scripts/`: build helpers (`build-public.js`, `csp-hash.js`)
- `tests/`: unit and browser tests
- `docs/`: user guide, configuration, development, and setup notes
- `*_apps_script.js`: Google Apps Script files (install one LINE bot file per project)

## License

`package.json` sets the license to `UNLICENSED`. No open-source license is granted.
