# No-error protocol

How to know the code is right and safe **before** it reaches anyone.
Follow it after every change, whether you or Claude made it. It takes about 2 minutes, plus 5 if you changed HTML or JS.

> Golden rule: if any step fails, **stop**. Don't commit and don't deploy. Fix it, or ask Claude with the exact error text.

---

## 1. Every change: one command

```powershell
npm.cmd run check
```

This runs every test (39 today) and a security scan of the libraries.

**Good result** (all of these):

```
ℹ fail 0
found 0 vulnerabilities
```

**What a failure means:**

| You see | It means | Do this |
|---|---|---|
| `✖ ... placeholders` | A `{{NAME}}` in a page is misspelled | Fix the spelling; the names are in `vite.config.js` |
| `✖ every .html page ... is built` | You added a page but not to the build | Add it to `rollupOptions.input` in `vite.config.js` |
| `✖ ... vendor` / `domain` / `https` | A typo in `src/data/vendor-domains.json` | The message names the entry; fix that line |
| `✖ no source file turns strings into HTML` | Someone used `innerHTML` (dangerous with QR text) | Use `textContent` or the `el()` helper instead |
| `✖ ... network requests` | The checker now sends data somewhere | Remove it: images must never leave the device |
| `✖ no secret files are tracked` | A `.env` or `.dev.vars` file is in git | Run `git rm --cached <file>`. If it held a real key, **change that key** |
| `✖ ... survives encoding` | A code would scan as something different from what was typed | Ask Claude; don't ship it |
| `vite build failed` | The site doesn't build | Read the first error line; it names the file |
| `found N vulnerabilities` | A library has a known security hole | Run `npm.cmd audit` to see which; usually `npm.cmd audit fix` |

## 2. You changed HTML, CSS or JS: 5-minute look

```powershell
npm.cmd run dev
```

Open http://localhost:5173 and check:

1. **Make:** type `example.com/menu`, and a code appears. Download the PNG and SVG.
2. **Check:** drop that PNG onto *Check a code*. The board says **No vendor in the middle**.
3. **Danger test:** type `javascript:alert(1)` into the checker's box. You should see **Not a link**, with nothing to click and no popup.
4. **HTML test:** make a *Text* code containing `<b>hi</b>` and check it. It shows literally as `<b>hi</b>`, not in bold.
5. **Keyboard:** press Tab until the *Make / Check* tabs are focused, then press the arrow keys. The tabs switch and the address gets `#check`.
6. **Phone size:** in the browser press F12, then the phone icon, and choose a ~360px wide phone. Nothing scrolls sideways.
7. **Privacy:** in F12 open the **Network** tab, clear it, and check a QR image. **No new requests** should appear.

## 3. Before committing

```powershell
git status
```

- Every file listed should be one you meant to change.
- None of them should be `.env`, `.dev.vars` or anything with a password or key.
- Commit with a message saying **what** changed and **why**.

## 4. Before deploying

```powershell
npm.cmd run check
```
```powershell
npm.cmd run deploy
```

Then check the live site:

```powershell
curl.exe -sI https://qr-tool-site.qr-tool-spike.workers.dev/
```

The output must include `content-security-policy`, `x-content-type-options: nosniff` and `referrer-policy`. Then open the live site and repeat steps 1 and 2 of section 2.

## 5. Phone check: after any change to how codes are made

Scan a downloaded PNG with an **iPhone camera** and an **Android camera**. Both must open the right address. Tests prove the code decodes in software; only a phone proves it works in the real world.

## 6. Rules that keep it safe

1. **QR content is hostile until proven otherwise.** Show it with `textContent` only. Make links only from `http`/`https` addresses. Never open them automatically.
2. **Nothing leaves the device** on the free tools: no `fetch`, no analytics scripts, no third-party fonts.
3. **No secrets in git.** Real keys live in `.env` or `.dev.vars` (both ignored). `.env.example` has fake values only.
4. **Vendor claims need a source.** Every entry in `vendor-domains.json` links to the vendor's own page. Never call a company a scam.
5. **Small steps.** One change, then the check, then a commit. A big change with 10 problems is harder to fix than 10 small ones.

## 7. For the paid product (coming in roadmap phases C–G)

These rules are added when that code arrives:
- **Database queries:** always bound (`.bind(...)`), never glued strings.
- **Destinations:** typed by customers, so accept `http`/`https` only, cap the length, and reject our own redirect domains.
- **Webhooks:** check the payment provider's signature before trusting anything.
- **Custom hostnames:** serve one only after Cloudflare has validated it.
- **Abuse:** rate limits and a "report this code" link on every redirect error page.
