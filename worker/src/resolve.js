// What a scan gets. Pure functions (no database, no network) so every rule is easy to test.

// A slug is the part of the address after the slash: letters, digits, - and _, up to 64.
const SLUG = /^[A-Za-z0-9_-]{1,64}$/;

export function slugFrom(pathname) {
  const s = pathname.replace(/^\/+|\/+$/g, "");
  return SLUG.test(s) ? s : null;
}

// Rule for every destination a customer saves (and checked again at scan time, just in case):
// http/https only, no hidden user:password@, a real hostname, a sane length,
// and never one of our own redirect hosts (that would make a loop or hide a chain of redirects).
export function isSafeDestination(value, ownHosts = []) {
  if (typeof value !== "string" || value.length > 2048) return false;
  let u;
  try {
    u = new URL(value);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".")) return false;
  return !ownHosts.some((h) => host === h || host.endsWith("." + h));
}

// row: { destination, expires_at, ends_at, disabled } from the database, or null when no code matches.
// expires_at is set by the plan (free codes); ends_at by the owner. Whichever passed first decides the page.
// Returns either { status: 302, location } or { status, page } for one of the plain status pages.
export function decide(row, nowSeconds, ownHosts = []) {
  if (!row) return { status: 404, page: "missing" };
  if (row.disabled) return { status: 410, page: "disabled" };
  const expired = row.expires_at != null && nowSeconds >= row.expires_at;
  const ended = row.ends_at != null && nowSeconds >= row.ends_at;
  if (ended && (!expired || row.ends_at <= row.expires_at)) return { status: 410, page: "ended" };
  if (expired) return { status: 410, page: "expired" };
  if (!isSafeDestination(row.destination, ownHosts)) return { status: 410, page: "disabled" };
  return { status: 302, location: row.destination };
}
