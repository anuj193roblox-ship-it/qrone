import test from "node:test";
import assert from "node:assert/strict";
import { humanCheckOn, isHuman, SITEVERIFY_URL } from "../app/src/human.js";

const on = { TURNSTILE_SITE_KEY: "0x4AAA", TURNSTILE_SECRET: "0x4secret" };
const answer = (status, body) => async () => new Response(JSON.stringify(body), { status });

test("the check is on only with both keys", () => {
  assert.equal(humanCheckOn(on), true);
  assert.equal(humanCheckOn({ TURNSTILE_SITE_KEY: "x" }), false);
  assert.equal(humanCheckOn({ TURNSTILE_SECRET: "x" }), false);
  assert.equal(humanCheckOn({}), false);
});

test("while the check is off (local testing), everyone passes and Cloudflare isn't asked", async (t) => {
  const f = t.mock.method(globalThis, "fetch", answer(200, { success: true }));
  assert.equal(await isHuman({}, undefined, null), true);
  assert.equal(f.mock.callCount(), 0);
});

test("a missing, wrong-type or oversized answer fails without asking Cloudflare", async (t) => {
  const f = t.mock.method(globalThis, "fetch", answer(200, { success: true }));
  for (const token of [undefined, null, "", 42, ["x"], "x".repeat(2049)]) {
    assert.equal(await isHuman(on, token, "1.2.3.4"), false, String(token).slice(0, 20));
  }
  assert.equal(f.mock.callCount(), 0);
});

test("a solved check is confirmed with Cloudflare using the secret, the answer and the visitor's address", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => { calls.push({ url, init }); return new Response('{"success":true}'); });
  assert.equal(await isHuman(on, "tok", "1.2.3.4"), true);
  assert.equal(calls[0].url, SITEVERIFY_URL);
  assert.deepEqual(JSON.parse(calls[0].init.body), { secret: "0x4secret", response: "tok", remoteip: "1.2.3.4" });
});

test("Cloudflare saying no, an error page or junk all count as not a person", async (t) => {
  for (const reply of [answer(200, { success: false }), answer(500, { success: true }), async () => new Response("not json")]) {
    t.mock.method(globalThis, "fetch", reply);
    assert.equal(await isHuman(on, "tok", null), false);
    t.mock.restoreAll();
  }
});
