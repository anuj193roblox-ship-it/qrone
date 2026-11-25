import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { PRICE, upgradeKey, upgradePrice, upgradeOptions, highestPlan, productsOf, verifyWebhook } from "../app/src/billing.js";

test("prices match the plans: $29 / $49 / $100, paid once", () => {
  assert.deepEqual(PRICE, { free: 0, starter: 2900, plus: 4900, pro: 10000 });
});

test("upgrades pay the difference; downgrades and sideways moves are not sold", () => {
  assert.equal(upgradePrice("free", "starter"), 2900);
  assert.equal(upgradePrice("starter", "plus"), 2000);
  assert.equal(upgradePrice("starter", "pro"), 7100);
  assert.equal(upgradePrice("plus", "pro"), 5100);
  for (const [from, to] of [["pro", "plus"], ["plus", "plus"], ["starter", "free"], ["free", "gold"], ["x", "pro"], [undefined, "pro"]]) {
    assert.equal(upgradeKey(from, to), null, `${from}->${to}`);
  }
  assert.deepEqual(upgradeOptions("starter"), [{ plan: "plus", price: 2000 }, { plan: "pro", price: 7100 }]);
  assert.deepEqual(upgradeOptions("pro"), []);
});

test("after a refund the account keeps its best remaining paid plan", () => {
  assert.equal(highestPlan([]), "free");
  assert.equal(highestPlan(["starter", "plus"]), "plus");
});

test("product IDs work from wrangler.jsonc (object) and .dev.vars (JSON text)", () => {
  assert.deepEqual(productsOf({ DODO_PRODUCTS: { "free-starter": "p1" } }), { "free-starter": "p1" });
  assert.deepEqual(productsOf({ DODO_PRODUCTS: '{"free-starter":"p1"}' }), { "free-starter": "p1" });
  assert.deepEqual(productsOf({}), {});
});

// An independent signer using Node's own crypto, so the test doesn't just check the code against itself.
const RAW_KEY = Buffer.from("qrone-test-signing-key-32-bytes!");
const SECRET = "whsec_" + RAW_KEY.toString("base64");
const NOW = 1_800_000_000;
const sign = (id, ts, body, key = RAW_KEY) => "v1," + createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
const headers = (o) => new Headers(o);
const BODY = '{"type":"payment.succeeded","data":{"payment_id":"pay_1"}}';

test("a correctly signed, fresh webhook passes", async () => {
  const h = headers({ "webhook-id": "msg_1", "webhook-timestamp": String(NOW), "webhook-signature": sign("msg_1", NOW, BODY) });
  assert.equal(await verifyWebhook(SECRET, h, BODY, NOW), true);
});

test("one valid signature among several passes (secret rotation)", async () => {
  const both = `v1,${"A".repeat(44)} ${sign("msg_1", NOW, BODY)}`;
  const h = headers({ "webhook-id": "msg_1", "webhook-timestamp": String(NOW), "webhook-signature": both });
  assert.equal(await verifyWebhook(SECRET, h, BODY, NOW), true);
});

test("forged, tampered, stale or incomplete webhooks are rejected", async () => {
  const good = { "webhook-id": "msg_1", "webhook-timestamp": String(NOW), "webhook-signature": sign("msg_1", NOW, BODY) };
  const cases = {
    "body changed": [SECRET, headers(good), BODY.replace("pay_1", "pay_2"), NOW],
    "different id": [SECRET, headers({ ...good, "webhook-id": "msg_2" }), BODY, NOW],
    "signed with another key": [SECRET, headers({ ...good, "webhook-signature": sign("msg_1", NOW, BODY, Buffer.from("x".repeat(32))) }), BODY, NOW],
    "6 minutes old (replay)": [SECRET, headers(good), BODY, NOW + 360],
    "from the future": [SECRET, headers(good), BODY, NOW - 360],
    "no signature": [SECRET, headers({ ...good, "webhook-signature": "" }), BODY, NOW],
    "wrong version": [SECRET, headers({ ...good, "webhook-signature": good["webhook-signature"].replace("v1,", "v2,") }), BODY, NOW],
    "no secret configured": [undefined, headers(good), BODY, NOW],
    "malformed secret": ["whsec_%%%not-base64%%%", headers(good), BODY, NOW],
    "timestamp not a number": [SECRET, headers({ ...good, "webhook-timestamp": "soon" }), BODY, NOW],
  };
  for (const [name, args] of Object.entries(cases)) assert.equal(await verifyWebhook(...args), false, name);
});
