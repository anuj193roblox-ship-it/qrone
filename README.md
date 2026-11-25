# APPNAME

Dynamic QR codes that keep working. Pay once, export every redirect any time, and your codes survive even if this service disappears.

> Status: early development. The name `APPNAME` is a placeholder.

## Why

Many "free QR code" sites make *dynamic* codes: the printed code points at the vendor's short link, and when the trial ends the vendor can switch the redirect off. APPNAME is built around one promise: you can always export your redirects and host them yourself.

## Plans (planned)

| Plan | Price | Dynamic codes |
|---|---|---|
| Free | $0 | 10, each redirects for 14 days |
| Starter | $29 once | 10, no expiry |
| Plus | $49 once | 25, no expiry |
| Pro | $100 once | 75, no expiry |

## Planned architecture

- Cloudflare Pages: static site, free tools, dashboard UI (Vite + vanilla JS)
- One Cloudflare Worker: redirects (HTTP 302), API, payment webhook
- Cloudflare D1: accounts, codes, domains, payments
- Cloudflare for SaaS: customer custom domains

## Development

Nothing to run yet. Copy `.env.example` to `.env` for local secrets. Never commit `.env`.

## Licence

[AGPL-3.0](LICENSE)
