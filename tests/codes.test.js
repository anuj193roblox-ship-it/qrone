import test from "node:test";
import assert from "node:assert/strict";
import { limitFor, planName, expiresAtFor, normalizeDestination, cleanLabel, cleanEndsAt, newSlug, FREE_DAYS, MIN_END, MAX_END } from "../app/src/codes.js";
import { slugFrom } from "../worker/src/resolve.js";

test("end time: none is fine, and it must be 1 hour to 10 years away", () => {
  const now = 1_800_000_000;
  for (const empty of [null, undefined, ""]) assert.deepEqual(cleanEndsAt(empty, now), { value: null });
  assert.deepEqual(cleanEndsAt(now + MIN_END, now), { value: now + MIN_END });
  assert.deepEqual(cleanEndsAt(String(now + MAX_END), now), { value: now + MAX_END }, "a number sent as text is fine");
  assert.match(cleanEndsAt(now + MIN_END - 1, now).error, /at least an hour/);
  assert.match(cleanEndsAt(now - 60, now).error, /at least an hour/, "the past is refused");
  assert.match(cleanEndsAt(now + MAX_END + 1, now).error, /10 years/);
  for (const junk of ["soon", 1.5e9 + 0.5, {}, [now + 9999]]) assert.ok(cleanEndsAt(junk, now).error, String(junk));
});

test("end time: a free code can't run past its 14-day plan expiry", () => {
  const now = 1_800_000_000;
  const expires = expiresAtFor("free", now);
  assert.deepEqual(cleanEndsAt(expires, now, expires), { value: expires });
  assert.match(cleanEndsAt(expires + 1, now, expires).error, /Free codes stop after 14 days/);
  assert.deepEqual(cleanEndsAt(now + 400 * 86400, now, null), { value: now + 400 * 86400 }, "paid: no plan expiry");
});

test("plan limits match the pricing: 10 / 10 / 25 / 75", () => {
  assert.deepEqual(["free", "starter", "plus", "pro"].map(limitFor), [10, 10, 25, 75]);
  assert.equal(limitFor("unknown"), 0, "an unknown plan can create nothing");
  assert.equal(planName("plus"), "Plus");
});

test("free codes expire after 14 days; paid codes never do", () => {
  const now = 1_800_000_000;
  assert.equal(expiresAtFor("free", now), now + FREE_DAYS * 86400);
  for (const plan of ["starter", "plus", "pro"]) assert.equal(expiresAtFor(plan, now), null, plan);
});

test("destinations: scheme added when missing, unsafe ones refused", () => {
  assert.equal(normalizeDestination(" example.com/menu "), "https://example.com/menu");
  assert.equal(normalizeDestination("http://example.com"), "http://example.com");
  for (const bad of ["", "   ", "javascript:alert(1)", "JAVASCRIPT:alert(1)", "localhost", "data:text/html,x", "a b", null]) {
    assert.equal(normalizeDestination(bad), null, String(bad));
  }
  assert.equal(normalizeDestination("https://go.qrone.test/x", ["go.qrone.test"]), null, "no loops back to our own links");
});

test("names are tidied and capped at 80 characters", () => {
  assert.equal(cleanLabel("  Table   menu "), "Table menu");
  assert.equal(cleanLabel(undefined), "");
  assert.equal(cleanLabel("x".repeat(81)), null);
});

test("short-link names are 7 easy-to-read characters the redirect Worker accepts", () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const s = newSlug();
    assert.match(s, /^[a-km-zA-HJ-NP-Z2-9]{7}$/);
    assert.equal(slugFrom("/" + s), s);
    seen.add(s);
  }
  assert.ok(seen.size > 495, "names should practically never repeat");
});
