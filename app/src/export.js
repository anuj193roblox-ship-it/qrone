// Every file a customer can download, so their printed codes can live on without QrOne.
// Input: their codes ({ url, hostname, slug, destination, label, expires_at, disabled, created_at }).
// Output: the file's text. Pure functions, so each format has a fixed-output test.

export const FORMATS = {
  csv: { file: "qrone-codes.csv", type: "text/csv; charset=utf-8" },
  netlify: { file: "_redirects", type: "text/plain; charset=utf-8" },
  htaccess: { file: "qrone.htaccess", type: "text/plain; charset=utf-8" }, // browsers mangle files that start with a dot
  nginx: { file: "qrone-redirects.nginx.conf", type: "text/plain; charset=utf-8" },
  cloudflare: { file: "qrone-cloudflare-bulk-redirects.csv", type: "text/csv; charset=utf-8" },
};

// Normalised URL: spaces and quotes become %20 / %22, so a destination can never break a rule line.
const target = (destination) => new URL(destination).href;
const iso = (t) => (t == null ? "" : new Date(t * 1000).toISOString());
const quoteCsv = (s) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
// A cell starting with = + - @ is run as a formula by Excel and Sheets; a leading ' makes it plain text.
const csvCell = (v) => quoteCsv(/^[=+\-@\t\r]/.test(String(v ?? "")) ? `'${v}` : String(v ?? ""));

const ended = (code, now) => code.ends_at != null && code.ends_at <= now;

function status(code, now) {
  if (code.disabled) return "switched off";
  // Same rule as the redirect server: if both dates have passed, the earlier one wins.
  const expired = code.expires_at != null && code.expires_at <= now;
  if (ended(code, now) && (!expired || code.ends_at <= code.expires_at)) return "ended";
  if (expired) return "expired";
  return code.expires_at == null && code.ends_at == null ? "never expires" : "active";
}

// Rule files skip codes switched off after an abuse report, and codes whose owner-set end time has passed.
// Expired free codes are included on purpose: the customer may host them themselves.
// shortcut: web-server rules can't stop on a date, so a future end time isn't carried into them; the CSV keeps it.
const live = (codes, now) => codes.filter((c) => !c.disabled && !ended(c, now));

const header = (now) => [
  `# QrOne export, ${iso(now)}`,
  "# Each rule sends /<code> to that code's destination with a 302 (temporary) redirect.",
  "# The rules only take over your printed codes if those codes use a domain you control.",
];

export function toCsv(codes, now) {
  const rows = [["short_url", "name", "destination", "status", "expires_at", "ends_at", "created_at"]];
  for (const c of codes) rows.push([c.url, c.label, c.destination, status(c, now), iso(c.expires_at), iso(c.ends_at), iso(c.created_at)]);
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function toNetlify(codes, now) {
  return [...header(now), ...live(codes, now).map((c) => `/${c.slug}  ${target(c.destination)}  302`)].join("\n") + "\n";
}

export function toHtaccess(codes, now) {
  return [
    ...header(now),
    "# Rename this file to .htaccess and put it in your site's top folder (Apache, mod_alias).",
    ...live(codes, now).map((c) => `Redirect 302 /${c.slug} "${target(c.destination)}"`),
  ].join("\n") + "\n";
}

export function toNginx(codes, now) {
  return [
    ...header(now),
    "# Paste these lines inside your server { } block, then reload nginx.",
    // nginx reads $ as a variable even inside quotes; %24 is the same character in a URL.
    ...live(codes, now).map((c) => `location = /${c.slug} { return 302 "${target(c.destination).replace(/\$/g, "%24")}"; }`),
  ].join("\n") + "\n";
}

// Cloudflare Bulk Redirects: no header row and no comments allowed; source is hostname/path without a scheme.
export function toCloudflare(codes, now) {
  return live(codes, now).map((c) => `${quoteCsv(`${c.hostname}/${c.slug}`)},${quoteCsv(target(c.destination))},302`).join("\n") + "\n";
}

export const build = { csv: toCsv, netlify: toNetlify, htaccess: toHtaccess, nginx: toNginx, cloudflare: toCloudflare };
