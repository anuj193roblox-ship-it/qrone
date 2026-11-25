import test from "node:test";
import assert from "node:assert/strict";
import { showLinkOnPage, canSend, sendSignInLink, RESEND_URL } from "../app/src/mail.js";

const dev = { DEV_LOG_LINKS: "1" };
const live = { RESEND_API_KEY: "re_test_123", MAIL_FROM: "QrOne <signin@qrone.example>" };

test("the sign-in link shows on the page only for local testing on this computer", () => {
  for (const url of ["http://localhost:8791/api/auth/start", "http://127.0.0.1:8791/x", "http://[::1]:8791/x"]) {
    assert.equal(showLinkOnPage(dev, url), true, url);
  }
});

test("never on a real hostname, never without the switch, never once real email is set up", () => {
  assert.equal(showLinkOnPage(dev, "https://qr-tool-site.qr-tool-spike.workers.dev/api/auth/start"), false);
  assert.equal(showLinkOnPage(dev, "https://localhost.evil.example/x"), false);
  assert.equal(showLinkOnPage({}, "http://localhost:8791/x"), false);
  assert.equal(showLinkOnPage({ DEV_LOG_LINKS: "true" }, "http://localhost:8791/x"), false);
  assert.equal(showLinkOnPage({ ...dev, ...live }, "http://localhost:8791/x"), false);
});

test("sign-in is available with Resend fully set up or in local testing, not with half a setup", () => {
  assert.equal(canSend(live), true);
  assert.equal(canSend(dev), true);
  assert.equal(canSend({}), false);
  assert.equal(canSend({ RESEND_API_KEY: "re_x" }), false, "a key without a From address");
  assert.equal(canSend({ MAIL_FROM: "a@b.co" }), false, "a From address without a key");
});

test("with Resend set up, the link is sent through Resend's API with the secret key", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => { calls.push({ url, init }); return new Response("{}", { status: 200 }); });
  await sendSignInLink(live, "person@example.com", "https://site.example/signin?token=abc");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, RESEND_URL);
  assert.equal(calls[0].init.headers.authorization, "Bearer re_test_123");
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body.to, ["person@example.com"]);
  assert.equal(body.from, live.MAIL_FROM);
  assert.ok(body.text.includes("https://site.example/signin?token=abc") && body.html.includes('href="https://site.example/signin?token=abc"'));
});

test("if Resend refuses the email, sign-in fails loudly instead of pretending it was sent", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("{}", { status: 403 }));
  await assert.rejects(sendSignInLink(live, "person@example.com", "https://site.example/signin?token=abc"), /Resend refused the email: 403/);
});
