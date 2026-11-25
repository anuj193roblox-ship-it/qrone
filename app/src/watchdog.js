// Link watchdog: every 15 minutes (cron in wrangler.jsonc) we check a few codes' destinations.
// Healthy codes are checked about once a day; a code that just failed is checked again 15 minutes later.
// After 3 failures in a row a code is "failing", and the redirect Worker sends scans to its backup link, if set.
// We only ever visit the destination itself: nothing about anyone who scans is involved.
import { isSafeDestination } from "../../worker/src/resolve.js";

export const FAILS_TO_SWITCH = 3;
const MAX_HOPS = 3;
const TIMEOUT_MS = 8000;
const RECHECK_AFTER = 15 * 60; // a code that failed (or is failing) is checked again this soon
const CHECK_EVERY = 24 * 3600; // a healthy code
// shortcut: the free plan allows 50 outside requests per run and a check uses up to 4 (3 redirects),
// so 10 codes per run = ~960 checks a day. On Workers Paid (10,000 per run), raise this to a few hundred.
export const BATCH = 10;
const USER_AGENT = "QrOneLinkCheck/1.0 (checks that a QR code's destination still loads)";

// Only clear signs that a page is gone count against it. Sites that block robots (401, 403, 429)
// or answer oddly are "unknown": a wrong switch to the backup would be worse than a late one.
export function classify(status) {
  if (status >= 200 && status < 400) return "ok";
  if (status === 404 || status === 410 || status >= 500) return "fail";
  return "unknown";
}

// Visits the destination like a browser would, following up to 3 redirects ourselves,
// so every hop gets the same safety check as a saved destination.
export async function checkUrl(url, ownHosts) {
  let current = url;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    if (!isSafeDestination(current, ownHosts)) return "fail";
    let res;
    try {
      res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": USER_AGENT } });
    } catch {
      return "fail"; // no such site, connection refused, or no answer in 8 seconds
    }
    await res.body?.cancel(); // we only need the status, not the page
    const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!location) return classify(res.status);
    try {
      current = new URL(location, current).href;
    } catch {
      return "fail";
    }
  }
  return "unknown"; // a long chain of redirects isn't proof the page is gone
}

// The new check state for one code, from its old state and this check's result.
export function nextState(row, result, now) {
  const failing = row.check_status === "failing";
  if (result === "ok") return { check_status: "ok", check_fails: 0, failing_since: null };
  if (result === "unknown") {
    // No new evidence: a failing code stays failing until a check really succeeds.
    return failing ? { check_status: "failing", check_fails: row.check_fails, failing_since: row.failing_since }
      : { check_status: "unknown", check_fails: 0, failing_since: null };
  }
  const fails = row.check_fails + 1;
  if (fails >= FAILS_TO_SWITCH) return { check_status: "failing", check_fails: fails, failing_since: row.failing_since ?? now };
  return { check_status: row.check_status, check_fails: fails, failing_since: row.failing_since };
}

// Codes that are due, most overdue first, so codes stuck failing can't crowd out the daily checks.
// Expired, ended and switched-off codes aren't checked: no scan would reach their destination anyway.
// shortcut: this reads every code once per run (fine for tens of thousands); add a stored due time and index beyond that.
const DUE = `
  SELECT id, destination, check_status, check_fails, failing_since FROM (
    SELECT *, COALESCE(checked_at, 0) + CASE WHEN check_fails > 0 OR check_status = 'failing' THEN ${RECHECK_AFTER} ELSE ${CHECK_EVERY} END AS due
    FROM codes
    WHERE disabled = 0 AND (expires_at IS NULL OR expires_at > ?1) AND (ends_at IS NULL OR ends_at > ?1)
  ) WHERE due <= ?1 ORDER BY due LIMIT ?2`;

export async function runChecks(env, now = Math.floor(Date.now() / 1000), batch = BATCH) {
  const { results } = await env.DB.prepare(DUE).bind(now, batch).all();
  if (!results.length) return 0;
  const ownHosts = [new URL(env.REDIRECT_ORIGIN).hostname];
  const outcomes = await Promise.all(results.map((r) => checkUrl(r.destination, ownHosts)));
  // "AND destination = ?" drops a result if the owner changed the destination while we were checking.
  await env.DB.batch(results.map((r, i) => {
    const s = nextState(r, outcomes[i], now);
    return env.DB
      .prepare("UPDATE codes SET check_status = ?1, check_fails = ?2, failing_since = ?3, checked_at = ?4 WHERE id = ?5 AND destination = ?6")
      .bind(s.check_status, s.check_fails, s.failing_since, now, r.id, r.destination);
  }));
  return results.length;
}
