// Decides what kind of QR content we are looking at.
// Pure function (text in, verdict out) so it is easy to test. It never touches the page.
// `vendors` is the list from data/vendor-domains.json.

// Common link shorteners we have NO vendor evidence for. Listing one here says
// "this is a redirect", not who runs it or what happens when an account ends.
const SHORTENERS = [
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd",
  "buff.ly", "rebrand.ly", "cutt.ly", "t.ly", "rb.gy", "shorturl.at",
];

// "qrco.de" matches qrco.de and a.qrco.de, but NOT evil-qrco.de or qrco.de.evil.com.
const hostMatches = (host, domain) => host === domain || host.endsWith("." + domain);

export function classify(text, vendors = []) {
  const content = String(text ?? "").trim();

  let url;
  try {
    url = new URL(content); // also handles case, userinfo tricks (https://qrco.de@evil.com)
  } catch {
    return { kind: "not-url", content };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { kind: "not-url", content };

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const base = { content, url: url.href, host };

  const known = vendors.find((v) => hostMatches(host, v.domain.toLowerCase()));
  // Only entries with real evidence (verified: true) get the "vendor-controlled" verdict.
  if (known?.verified === true) return { kind: "vendor", ...base, vendor: known };
  if (known || SHORTENERS.some((d) => hostMatches(host, d))) return { kind: "unknown-short", ...base };

  return { kind: "static", ...base };
}
