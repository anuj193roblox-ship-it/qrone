import test from "node:test";
import assert from "node:assert/strict";
import { decide, slugFrom, isSafeDestination } from "../worker/src/resolve.js";

const NOW = 1_800_000_000;
const ok = { destination: "https://example.com/menu", expires_at: null, disabled: 0 };

test("a live code redirects with 302 to its destination", () => {
  assert.deepEqual(decide(ok, NOW), { status: 302, location: "https://example.com/menu" });
});

test("no matching code gives the 404 page", () => {
  assert.deepEqual(decide(null, NOW), { status: 404, page: "missing" });
});

test("a disabled code gives the disabled page, even if it has not expired", () => {
  assert.deepEqual(decide({ ...ok, disabled: 1 }, NOW), { status: 410, page: "disabled" });
});

test("free codes stop at their expiry time, not a second before", () => {
  assert.equal(decide({ ...ok, expires_at: NOW + 1 }, NOW).status, 302);
  assert.deepEqual(decide({ ...ok, expires_at: NOW }, NOW), { status: 410, page: "expired" });
  assert.equal(decide({ ...ok, expires_at: NOW - 86400 }, NOW).page, "expired");
});

test("an owner-set end time stops the code at that second, with the 'ended' page", () => {
  assert.equal(decide({ ...ok, ends_at: NOW + 1 }, NOW).status, 302);
  assert.deepEqual(decide({ ...ok, ends_at: NOW }, NOW), { status: 410, page: "ended" });
  assert.equal(decide({ ...ok, ends_at: null }, NOW + 50 * 365 * 86400).status, 302, "no end time: runs forever");
});

test("when both dates have passed, whichever came first decides the page", () => {
  assert.equal(decide({ ...ok, ends_at: NOW - 100, expires_at: NOW - 10 }, NOW).page, "ended", "owner ended it first");
  assert.equal(decide({ ...ok, ends_at: NOW - 10, expires_at: NOW - 100 }, NOW).page, "expired", "the free plan ran out first");
  assert.equal(decide({ ...ok, ends_at: NOW + 99, expires_at: NOW - 1 }, NOW).page, "expired", "a future end time doesn't hide an expiry");
  assert.equal(decide({ ...ok, disabled: 1, ends_at: NOW - 1 }, NOW).page, "disabled", "a switched-off code stays switched off");
});

test("paid codes (expires_at NULL) never expire", () => {
  assert.equal(decide({ ...ok, expires_at: null }, NOW + 50 * 365 * 86400).status, 302);
});

test("an unsafe destination that somehow got stored is never followed", () => {
  for (const destination of ["javascript:alert(1)", "data:text/html,hi", "ftp://x.com/f", ""]) {
    assert.equal(decide({ ...ok, destination }, NOW).status, 410, destination);
  }
});

test("slugs: plain names only", () => {
  assert.equal(slugFrom("/menu"), "menu");
  assert.equal(slugFrom("/Menu-2_b/"), "Menu-2_b");
  for (const p of ["/", "", "/favicon.ico", "/a/b", "/%2e%2e", "/a b", "/" + "x".repeat(65)]) {
    assert.equal(slugFrom(p), null, p);
  }
});

test("destinations: http/https, real host, no hidden login, sane length", () => {
  assert.ok(isSafeDestination("https://example.com/menu?table=4"));
  assert.ok(isSafeDestination("http://shop.example.co.uk"));
  for (const d of [
    "javascript:alert(1)", "JAVASCRIPT:alert(1)", "data:text/html,x", "vbscript:x", "file:///etc/passwd",
    "https://localhost/x", "https://user:pass@example.com", "not a url", "https://example.com/" + "a".repeat(2100),
    null, 42,
  ]) {
    assert.equal(isSafeDestination(d), false, String(d));
  }
});

test("destinations may not point back at our own redirect hosts", () => {
  const own = ["qrone-redirect.example.dev"];
  assert.equal(isSafeDestination("https://qrone-redirect.example.dev/other", own), false);
  assert.equal(isSafeDestination("https://x.qrone-redirect.example.dev/", own), false);
  assert.equal(isSafeDestination("https://example.com/", own), true);
});
