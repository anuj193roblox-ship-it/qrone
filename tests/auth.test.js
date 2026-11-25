import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEmail, isValidEmail, newToken, sha256Hex, sessionCookie, clearedCookie, readCookie, isSameOrigin, COOKIE,
} from "../app/src/auth.js";

test("emails are trimmed and lower-cased so one person has one account", () => {
  assert.equal(normalizeEmail("  Anuj@Example.COM "), "anuj@example.com");
  assert.equal(normalizeEmail(undefined), "");
});

test("email check accepts normal addresses and rejects junk", () => {
  assert.ok(isValidEmail("a@b.co"));
  for (const e of ["", "a", "a@b", "a b@c.com", "@b.com", "a@" + "x".repeat(260) + ".com"]) {
    assert.equal(isValidEmail(e), false, e);
  }
});

test("tokens are long, URL-safe and never repeat", () => {
  const a = newToken();
  const b = newToken();
  assert.match(a, /^[A-Za-z0-9_-]{43}$/); // 32 random bytes
  assert.notEqual(a, b);
});

test("sha256Hex matches the standard test vector", async () => {
  assert.equal(await sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("the session cookie is locked down", () => {
  const c = sessionCookie("xyz");
  assert.ok(c.startsWith(`${COOKIE}=xyz;`));
  for (const flag of ["Path=/", "HttpOnly", "Secure", "SameSite=Lax", "Max-Age=2592000"]) assert.ok(c.includes(flag), flag);
  assert.ok(!/Domain=/i.test(c), "__Host- cookies must not set Domain");
  assert.ok(clearedCookie().includes("Max-Age=0"));
});

test("readCookie finds our cookie among others", () => {
  assert.equal(readCookie(`a=1; ${COOKIE}=tok-en_1; b=2`), "tok-en_1");
  assert.equal(readCookie("a=1"), null);
  assert.equal(readCookie(null), null);
});

test("only requests from our own origin may change things", () => {
  const req = (origin) => new Request("https://qrone.example/api/x", { method: "POST", headers: origin ? { Origin: origin } : {} });
  assert.equal(isSameOrigin(req("https://qrone.example")), true);
  assert.equal(isSameOrigin(req("https://evil.example")), false);
  assert.equal(isSameOrigin(req(null)), false);
});
