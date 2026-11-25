// The plain pages a scanner sees when a code does not redirect.
// They contain only fixed text: nothing from the request (host, path, query) is ever echoed back.

const TEXT = {
  missing: ["No QR code here", "This link doesn't belong to any QR code. Check that the whole code was scanned."],
  expired: ["This QR code has expired", "It was a free 14-day code. If it's yours, upgrade in QrOne to switch it back on. Everyone else: ask the business that printed it."],
  disabled: ["This QR code is switched off", "It was turned off after a report. If you think that's a mistake, contact QrOne."],
  unavailable: ["Back in a moment", "QR codes on this service are briefly unavailable. Please scan again in a few minutes."],
};

export function page(kind) {
  const [title, body] = TEXT[kind] ?? TEXT.missing;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${title} | QrOne</title>
<style>
body{margin:0;background:#f7f6f2;color:#1d1d1b;font:17px/1.55 system-ui,sans-serif}
header{background:#1d1d1b;border:8px solid #b98a5a;color:#f4f1ea;padding:28px 20px}
h1{margin:0;font:800 2rem/1.2 "Arial Narrow",system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;max-width:16em}
main{padding:24px 20px;max-width:36rem}
</style></head>
<body><header><h1>${title}</h1></header><main><p>${body}</p></main></body></html>`;
}
