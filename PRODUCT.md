# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Small business owners: restaurants, shops, salons, event organisers. They are about to print a QR code on menus, flyers, cards or signs, or they already have. They are not technical. US-first, sold globally. Their job is to get a code that keeps working after it is printed.

## Product Purpose

QrOne makes QR codes that never stop working. Today it offers two free tools that run entirely in the browser:

- **Make:** a static QR generator. The address is stored in the code, so nothing can be switched off.
- **Check:** "Will my QR code die?" It decodes a QR image on the device and says whether the code points straight at a website or through a QR vendor's short link that could be deactivated.

Success for the free tools is that a first-time visitor makes a code within about 10 seconds. Making a code is the primary action and checking is secondary.

Built, switched on once the domain and payments exist: paid dynamic codes, paid once ($29 / $49 / $99 tiers), with a download of every redirect at any time. Only codes on a domain the customer controls can survive without QrOne (custom domains are planned); codes on QrOne's own short-link domain depend on QrOne. The free tier gets 10 codes that each redirect for 14 days.

Payment decisions (confirmed 2026-11-25):
- **Provider:** Dodo Payments, as merchant of record, paying out to an Indian bank account.
- **Plans:** one-time only. Starter $29 (10 codes), Plus $49 (25), Pro $99 (75). No subscriptions.
- **Upgrades:** pay the difference. Starter→Plus $20, Starter→Pro $70, Plus→Pro $50.
- **Refunds:** within 14 days. The account goes back to Free, and its codes then expire 14 days after the refund. Codes are never switched off at the moment of a refund.
- **Upgrading from Free** removes the expiry from every existing code, including ones that already expired.

## Positioning

Pay once, and you can always take your redirects with you. Competitors' free dynamic codes are often deactivated when a trial ends. QrOne's free tools are honest about which kind of code you have and never hold a printed code hostage.

## Operating Context

The visitor is usually about to print, or has just found out a printed code stopped working. They use a phone or a laptop. Images of codes are screenshots or phone photos of printed material.

## Capabilities and Constraints

- Static site: Vite and vanilla JS, no framework, no backend for the free tools. Hosted on Cloudflare Workers Static Assets.
- Images are decoded locally (jsQR). Nothing is uploaded, and the page must keep that true and say so.
- Decoded content is untrusted: it is shown as text only, and links are never opened automatically.
- The brand name lives only in `src/config.js`.
- The vendor list (`src/data/vendor-domains.json`) only flags domains with a linked source from the vendor's own page.

## Brand Commitments

- Name: QrOne.
- Tone: plain, factual, neutral about competitors. Never call a company a scam. State vendor behaviour only with a link to the vendor's own page.
- No fake social proof: no invented testimonials, user counts, ratings or logos.
- The redesign must not look like a generic AI/SaaS template, must not be text-heavy, and must not feel like the ad-heavy QR sites people already distrust.

## Evidence on Hand

- The vendor evidence links in `src/data/vendor-domains.json`.
- No customers, testimonials, usage numbers or press exist yet. Do not fabricate any.

## Product Principles

1. Action before explanation: the tool comes first and the reasons are one tap away.
2. Honest by construction: say only what the code itself proves, and link the source for every vendor claim.
3. Nothing leaves the device: privacy is a feature you can see, not a footnote.
4. Built for people who print: phone-friendly, large targets, no jargon.

## Accessibility & Inclusion

WCAG AA contrast, keyboard operable, large tap targets (at least 44px), and labels on every control.
