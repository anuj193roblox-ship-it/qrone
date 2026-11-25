// Plans, upgrade prices and Dodo webhook signature checks. Pure (WebCrypto only), so each rule has a test.

export const PRICE = { free: 0, starter: 2900, plus: 4900, pro: 10000 }; // US cents, paid once
const RANK = { free: 0, starter: 1, plus: 2, pro: 3 };

// Upgrades pay the difference: Starter -> Plus is $49 - $29 = $20. Downgrades and sideways moves aren't sold.
export const upgradeKey = (from, to) => (from in RANK && to in RANK && RANK[to] > RANK[from] ? `${from}-${to}` : null);
export const upgradePrice = (from, to) => (upgradeKey(from, to) ? PRICE[to] - PRICE[from] : null);
export const upgradeOptions = (current) =>
  Object.keys(RANK).filter((p) => upgradeKey(current, p)).map((plan) => ({ plan, price: upgradePrice(current, plan) }));
export const highestPlan = (plans) => plans.reduce((best, p) => (RANK[p] > RANK[best] ? p : best), "free");

// Product IDs come from wrangler.jsonc (an object) or .dev.vars locally (a JSON string).
export const productsOf = (env) => (typeof env.DODO_PRODUCTS === "string" ? JSON.parse(env.DODO_PRODUCTS) : env.DODO_PRODUCTS ?? {});

// Dodo signs webhooks the Standard Webhooks way: base64(HMAC-SHA256(secret, "id.timestamp.body")),
// sent as one or more space-separated "v1,<signature>" values.
export const WEBHOOK_TOLERANCE = 5 * 60; // reject anything older or newer than 5 minutes (replays)

export async function verifyWebhook(secret, headers, body, nowSeconds) {
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const signatures = headers.get("webhook-signature");
  if (!secret || !id || !ts || !signatures || !/^\d{1,12}$/.test(ts)) return false;
  if (Math.abs(nowSeconds - Number(ts)) > WEBHOOK_TOLERANCE) return false;
  let keyBytes;
  try {
    keyBytes = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  } catch {
    return false; // a malformed secret is a configuration error, never a pass
  }
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
  const expected = btoa(String.fromCharCode(...mac));
  return signatures.split(" ").some((s) => {
    const [version, sig] = s.split(",");
    return version === "v1" && typeof sig === "string" && sameText(sig, expected);
  });
}

// Compare without stopping at the first difference, so response timing can't leak the signature.
function sameText(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
