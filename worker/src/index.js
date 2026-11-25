// QrOne redirect Worker: every scan of a dynamic code lands here.
// 1. Read the hostname and slug from the URL (never trust the raw Host header).
// 2. Look the code up in D1 with a bound query (never glue strings into SQL).
// 3. Redirect with 302 (not 301, so browsers never cache a destination that may be edited),
//    or show a plain status page.
import { decide, slugFrom } from "./resolve.js";
import { page } from "./pages.js";

const SAFE = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
};

const html = (kind, status, env) =>
  new Response(page(kind, env?.SITE_ORIGIN), {
    status,
    headers: {
      ...SAFE,
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    },
  });

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { ...SAFE, allow: "GET, HEAD" } });
    }

    const url = new URL(request.url);
    const hostname = url.hostname.toLowerCase();
    const slug = slugFrom(url.pathname);

    let row = null;
    if (slug) {
      try {
        row = await env.DB
          .prepare("SELECT destination, expires_at, ends_at, disabled, check_status, backup_destination FROM codes WHERE hostname = ?1 AND slug = ?2")
          .bind(hostname, slug)
          .first();
      } catch (err) {
        // For example the free plan's daily database limit. Never show the error itself to scanners.
        console.error("lookup failed", err?.message);
        return html("unavailable", 503, env);
      }
    }

    const ownHosts = [hostname];
    const result = decide(row, Math.floor(Date.now() / 1000), ownHosts);
    if (result.location) {
      return new Response(null, {
        status: 302,
        headers: { ...SAFE, location: result.location, "cache-control": "private, max-age=0" },
      });
    }
    return html(result.page, result.status, env);
  },
};
