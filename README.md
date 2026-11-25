# QrOne

Dynamic QR codes that keep working. Pay once, and download every redirect any time. Codes on a domain you own can keep working even without this service.

> Status: early development. Free tools are live. The paid product is built and tested, and switches on once the domain and payments are set up.

## Why

Many "free QR code" sites make *dynamic* codes: the printed code points at the vendor's short link, and when the trial ends the vendor can switch the redirect off. QrOne is built around one promise: you can always export your redirects and host them yourself.

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

Free tools (static QR generator and "will my QR code die?" checker) are built. They run entirely in the browser.

```
npm install
npm run dev      # local site at http://localhost:5173
npm test         # unit tests for the classifier and QR payload logic
npm run build    # production build into dist/
```

The product name lives in one file, `src/config.js`. Vendor domains for the checker live in `src/data/vendor-domains.json`, each with a link to the vendor's own page. Copy `.env.example` to `.env` for local secrets. Never commit `.env`.

## Licence

[AGPL-3.0](LICENSE)
