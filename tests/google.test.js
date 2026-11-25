import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { googleOn, authUrl, challengeOf, flowCookie, emailFromClaims, emailFromCode, GOOGLE_TOKEN } from "../app/src/google.js";

const env = { GOOGLE_CLIENT_ID: "client-123.apps.googleusercontent.com", GOOGLE_CLIENT_SECRET: "secret-xyz" };
const NOW = 1_800_000_000;
const good = { iss: "https://accounts.google.com", aud: env.GOOGLE_CLIENT_ID, nonce: "n1", exp: NOW + 60, email: "Person@Gmail.com", email_verified: true };
const b64url = (s) => Buffer.from(s).toString("base64url");
const jwt = (claims) => `${b64url('{"alg":"RS256"}')}.${b64url(JSON.stringify(claims))}.sig`;

test("Google sign-in is on only with both the client ID and the secret", () => {
  assert.equal(googleOn(env), true);
  assert.equal(googleOn({ GOOGLE_CLIENT_ID: "x" }), false);
  assert.equal(googleOn({ GOOGLE_CLIENT_SECRET: "x" }), false);
});

test("the PKCE challenge is base64url(SHA-256(verifier)), as Node's own crypto computes it", async () => {
  const verifier = "abc-DEF_123-a-random-looking-verifier-of-43ch";
  assert.equal(await challengeOf(verifier), createHash("sha256").update(verifier).digest("base64url"));
});

test("the trip to Google asks only for the email, and carries state, nonce and challenge", () => {
  const url = new URL(authUrl(env, "https://site.example", { state: "s1", nonce: "n1", challenge: "c1" }));
  assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
  const p = Object.fromEntries(url.searchParams);
  assert.equal(p.scope, "openid email");
  assert.equal(p.redirect_uri, "https://site.example/api/auth/google/callback");
  assert.deepEqual([p.state, p.nonce, p.code_challenge, p.code_challenge_method, p.response_type], ["s1", "n1", "c1", "S256", "code"]);
  assert.equal(p.client_secret, undefined, "the secret never goes to the browser");
});

test("the flow cookie is HttpOnly, Secure, short-lived, and can be cleared", () => {
  assert.match(flowCookie("a.b.c"), /^__Host-qrone_google=a\.b\.c; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=600$/);
  assert.match(flowCookie("", 0), /Max-Age=0$/);
});

test("a good answer from Google gives the verified email, lowercased", () => {
  assert.equal(emailFromClaims(good, env.GOOGLE_CLIENT_ID, "n1", NOW), "person@gmail.com");
  assert.equal(emailFromClaims({ ...good, iss: "accounts.google.com" }, env.GOOGLE_CLIENT_ID, "n1", NOW), "person@gmail.com");
});

test("anything off in Google's answer is refused", () => {
  const bad = {
    "another issuer": { iss: "https://evil.example" },
    "another app": { aud: "someone-else" },
    "another attempt": { nonce: "n2" },
    expired: { exp: NOW },
    "unverified email": { email_verified: false },
    "email_verified as text": { email_verified: "true" },
    "no email": { email: undefined },
    "not an email": { email: "nope" },
  };
  for (const [why, change] of Object.entries(bad)) {
    assert.equal(emailFromClaims({ ...good, ...change }, env.GOOGLE_CLIENT_ID, "n1", NOW), null, why);
  }
  assert.equal(emailFromClaims(good, env.GOOGLE_CLIENT_ID, "", NOW), null, "no nonce in the cookie");
  assert.equal(emailFromClaims(null, env.GOOGLE_CLIENT_ID, "n1", NOW), null);
});

test("the code is swapped at Google with the secret and verifier, and the email comes back", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    calls.push({ url, body: Object.fromEntries(new URLSearchParams(init.body)) });
    return new Response(JSON.stringify({ id_token: jwt(good) }));
  });
  assert.equal(await emailFromCode(env, "https://site.example", "code1", "ver1", "n1", NOW), "person@gmail.com");
  assert.equal(calls[0].url, GOOGLE_TOKEN);
  assert.deepEqual(calls[0].body, {
    code: "code1", code_verifier: "ver1", client_id: env.GOOGLE_CLIENT_ID, client_secret: "secret-xyz",
    redirect_uri: "https://site.example/api/auth/google/callback", grant_type: "authorization_code",
  });
});

test("Google refusing the code, or sending junk, means no sign-in", async (t) => {
  t.mock.method(console, "error", () => {});
  for (const reply of [
    () => new Response('{"error":"invalid_grant"}', { status: 400 }),
    () => new Response("not json"),
    () => new Response('{"id_token":"not-a-jwt"}'),
    () => new Response(JSON.stringify({ id_token: jwt({ ...good, nonce: "other" }) })),
  ]) {
    t.mock.method(globalThis, "fetch", async () => reply());
    assert.equal(await emailFromCode(env, "https://site.example", "c", "v", "n1", NOW), null);
    t.mock.restoreAll();
    t.mock.method(console, "error", () => {});
  }
});
