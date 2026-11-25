// The plain pages a scanner sees when a code does not redirect.
// They contain only fixed text: nothing from the request (host, path, query) is ever echoed back.
// The only configured value is the site's own address (SITE_ORIGIN), used for the owner's sign-in link.
// Colours match the site's calm dark look (DESIGN.md); the site's font isn't on this host, so system fonts.

const TEXT = {
  missing: ["No QR code here", "This link doesn't belong to any QR code. Check that the whole code was scanned."],
  expired: ["This QR code has expired", "It was a free 14-day code. Ask the business that printed it for a new one."],
  ended: ["This QR code has ended", "The business that made it set it to stop working on a chosen date. Ask them for a current link."],
  disabled: ["This QR code is switched off", "It was turned off after a report about where it led."],
  unavailable: ["Back in a moment", "QR codes on this service are briefly unavailable. Please scan again in a few minutes."],
};

// A fixed next step on our own site, per page. The path is ours; nothing comes from the request.
const OWNER = {
  expired: ["Is this your code?", "Sign in to QrOne and upgrade to switch it back on", "/signin"],
  disabled: ["Think this is a mistake?", "Contact us through our terms page", "/terms#report"],
};

const safeOrigin = (origin) => {
  try {
    const u = new URL(origin);
    return u.protocol === "https:" || u.hostname === "localhost" ? u.origin : null;
  } catch {
    return null;
  }
};

export function page(kind, siteOrigin) {
  const [title, body] = TEXT[kind] ?? TEXT.missing;
  const site = safeOrigin(siteOrigin);
  const owner = OWNER[kind] && site
    ? `<p class="owner">${OWNER[kind][0]} <a href="${site}${OWNER[kind][2]}">${OWNER[kind][1]}</a>.</p>`
    : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><meta name="theme-color" content="#0b0c0f"><title>${title} | QrOne</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0c0f;color:#f4f5f7;font:17px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{box-sizing:border-box;width:min(100% - 32px,34rem);background:#14161b;border:1px solid #262a33;border-radius:20px;padding:32px 28px}
.brand{margin:0 0 20px;font-weight:800;color:#a6acb8;font-size:15px}
h1{margin:0;font-size:1.75rem;line-height:1.15;font-weight:800;letter-spacing:-.02em}
p{margin:12px 0 0;color:#a6acb8}
.owner{margin-top:20px;padding-top:16px;border-top:1px solid #262a33;font-size:15px}
a{color:#6b95ff;text-underline-offset:3px}
a:focus-visible{outline:2px solid #6b95ff;outline-offset:2px;border-radius:4px}
</style></head>
<body><main><p class="brand">QrOne</p><h1>${title}</h1><p>${body}</p>${owner}</main></body></html>`;
}
