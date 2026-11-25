# QrOne roadmap: small steps

Each step is small enough to finish in one sitting, and each has a **Done when** line you can check.
Do the steps in order. Run the [no-error protocol](NO-ERROR-PROTOCOL.md) after every step that changes code.

Who does it: **You** = Anuj (accounts, money, phone, decisions). **Claude** = code. **Both** = Claude builds, you check.

---

## Phase A: finish the free tools (A1–A5 ✅ done; A6–A8 are yours)

| # | Step | Who | Done when |
|---|------|-----|-----------|
| A1 | Apply the design review fixes | Claude | The reviewer's verdict is "ship" |
| A2 | Write `DESIGN.md` (colours, fonts, rules of the letterboard look) | Claude | The file exists and lists every colour and font used |
| A3 | Add security headers (`public/_headers`) | Claude | `curl -I` on the live site shows the headers |
| A4 | Add the extra tests from the test review | Claude | `npm test` passes with the new tests |
| A5 | Deploy (`npm run deploy`) | Claude | The live site shows the letterboard design |
| A6 | Phone test: scan PNG and SVG with iPhone and Android | You | Both phones open the address |
| A7 | Phone test: checker on 10 real photos of printed codes | You | At least 8 of 10 decode. If fewer, Claude switches to ZXing |
| A8 | Click every vendor evidence link in `src/data/vendor-domains.json` | You | Each link opens a page that says what the entry claims |

## Phase B: accounts and long waits (start now, they take days)

| # | Step | Who | Done when |
|---|------|-----|-----------|
| B1 | Search trademarks for "QrOne" (USPTO, and India's IP office) | You | No live mark for QR or link software |
| B2 | Buy the domain on Cloudflare Registrar | You | The domain shows in your Cloudflare dashboard |
| B3 | Apply to Paddle or Dodo Payments | You | The identity check is submitted |
| B4 | Pick an email service for sign-in links (Claude compares free tiers first) | Both | An account exists and the domain is verified |

## Phase C: the redirect engine (core of the paid product) ✅ done 2026-11-25

Live at `https://qrone-redirect.qr-tool-spike.workers.dev` with an empty database in Eastern North America. Code: `worker/`. Rules: `worker/src/resolve.js`, tested in `tests/redirect.test.js`.

| # | Step | Who | Done when |
|---|------|-----|-----------|
| C1 | Create the D1 database (`wrangler d1 create`) | Claude | `wrangler d1 list` shows it |
| C2 | Write the table definitions (`accounts`, `codes`) as a migration | Claude | The migration runs locally without errors |
| C3 | Redirect Worker: look up host + slug, return 302 | Claude | A local test returns 302 to the stored address |
| C4 | Unknown code returns a plain 404 page | Claude | A test covers it |
| C5 | Free codes stop after 14 days (`expires_at`) | Claude | A test with a past date shows the "expired" page |
| C6 | Disable flag for abuse reports | Claude | A disabled code shows a "disabled" page, with a test |
| C7 | Only `http`/`https` destinations allowed (no `javascript:`) | Claude | A test rejects bad destinations |
| C8 | Deploy the Worker to `workers.dev` and test live | Both | `curl` shows the 302 |

## Phase D: accounts and dashboard

D1–D2 are built and tested end to end locally (the link is printed to the terminal). Live sign-in answers "not available yet" until real email is switched on:
1. Buy the domain (B2).
2. Onboard it in Cloudflare → Email Service → Email Sending.
3. Add the `send_email` binding and `MAIL_FROM` in `wrangler.jsonc`.
4. **Update `privacy.html`**, because sign-in collects an email address.

| # | Step | Who | Done when |
|---|------|-----|-----------|
| D1 | Sign-in page: enter email, get a link ✅ built | Claude | The link arrives in your inbox (needs the domain) |
| D2 | Session after clicking the link (secure cookie) ✅ built | Claude | Refreshing the page keeps you signed in |
| D3 | Dashboard: list your codes ✅ | Claude | Shows codes from D1 |
| D4 | Create a code (respecting plan limits: 10 / 25 / 75) ✅ | Claude | The 11th free code is refused with a clear message |
| D5 | Edit a destination ✅ (takes effect on the very next scan) | Claude | A scan goes to the new address within a minute |
| D6 | Delete a code ✅ | Claude | A scan returns the 404 page |
| D7 | Download the QR for a code ✅ (phone scan still to do) | Both | The PNG scans to the right slug |

## Phase E: export (the "works even if we disappear" promise)

| # | Step | Who | Done when |
|---|------|-----|-----------|
| E1 | Export CSV | Claude | A test compares output to a known file |
| E2 | Export Netlify `_redirects` | Claude | Same |
| E3 | Export `.htaccess` | Claude | Same |
| E4 | Export nginx rules | Claude | Same |
| E5 | Export Cloudflare redirect rules | Claude | Same |
| E6 | Real test: host an export on Netlify's free tier and scan a code | Both | The code still works without QrOne |

## Phase F: payments (test mode first)

| # | Step | Who | Done when |
|---|------|-----|-----------|
| F1 | Create the 3 one-time products ($29 / $49 / $100) in the provider's test mode | You | Product IDs are copied into `.env` (never committed) |
| F2 | Checkout button per plan | Claude | A test-mode purchase completes |
| F3 | Webhook: verify the signature, then set the plan | Claude | A forged webhook is rejected, with a test |
| F4 | Expired free codes come back to life on upgrade | Claude | A test covers it |
| F5 | Refund handling (downgrade or keep, your decision) | Both | Written down in `PRODUCT.md`, with a test |

## Phase G: custom domains

| # | Step | Who | Done when |
|---|------|-----|-----------|
| G1 | Enable Cloudflare for SaaS on your domain | You | The dashboard shows it enabled |
| G2 | Fallback origin + `*/*` Worker route | Claude | The test hostname reaches the Worker |
| G3 | "Add your domain" screen with CNAME instructions | Claude | A test subdomain you own goes active |
| G4 | Show status (pending / active / error) | Claude | Each state is visible in the dashboard |

## Phase H: launch

| # | Step | Who | Done when |
|---|------|-----|-----------|
| H1 | "If we shut down" policy page (90 days notice, export reminder) | Claude | Linked in the footer |
| H2 | Refund policy and terms (have them checked; Claude drafts only) | You | Published |
| H3 | Report-abuse link on the expired/disabled pages | Claude | A report reaches you |
| H4 | Move to the $5 Workers plan | You | The dashboard shows Workers Paid |
| H5 | Switch payments from test mode to live | You | One real $29 purchase works, then you refund it |
| H6 | Public launch: make the repo public (optional), post in communities | You | Done |
