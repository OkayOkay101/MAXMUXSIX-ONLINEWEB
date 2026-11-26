# MAXMUXSIX Online Store

Demo storefront for MAXMUXSIX, a charcoal-grilled sticky rice (ข้าวหลามเตาถ่าน) shop in Nong Mon, Chon Buri. The site is a sample: it does not sell or deliver anything, and it does not accept payments.

[ภาษาไทย](README_TH.md) · [Configuration](docs/configuration.md) · [Development](docs/development.md)

![MAXMUXSIX storefront](store_front.jpg)

## Requirements

- Node.js 22 or later, for tests and builds (see [docs/development.md](docs/development.md))
- Google Chrome, only for the browser test

## Setup

```bash
npm ci --ignore-scripts
python -m http.server 8000
```

Then open `http://localhost:8000/`. Do not open `index.html` from `file://`, because the membership email links need HTTP(S).

## Usage

- **Browse the menu:** search and filter the sticky rice products on the front page.
- **Add to cart:** choose items and review the cart before checkout.
- **Find a flavour:** use the quiz to get a recommendation.
- **Membership:** sign up, confirm email, and sign in. Requires Supabase setup.

## Configuration

Public settings live in `auth-config.js`, and the full list is in [docs/configuration.md](docs/configuration.md). Never put a `service_role` or `sb_secret` key in any file in this repo.

| Setting | File | Default |
|---|---|---|
| Supabase project URL | `auth-config.js` | Set to the project URL |
| Publishable key | `auth-config.js` | Set to the publishable key |
| Redirect URL | `auth-config.js` | `https://maxmuxsix-demo.vercel.app/` |
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
- `docs/`: setup guides and notes
- `*_apps_script.js`: Google Apps Script files (install one LINE bot file per project)

## License

`package.json` sets the license to `UNLICENSED`. No open-source license is granted.
