// QrOne site Worker. Static pages are served straight from dist/ (the assets);
// this code only runs for /api/* (sign-in, account) and for paths that match no file.
//
//   POST /api/auth/start   { email }  -> emails a one-time sign-in link
//   POST /api/auth/verify  { token }  -> uses the link once, starts a session (cookie)
//   GET  /api/auth/google             -> off to Google's sign-in page
//   GET  /api/auth/google/callback    -> back from Google: starts a session, then /signin?signed=1
//   GET  /api/me                      -> who is signed in (or 401)
//   GET  /api/session                 -> { signedIn, checkKey, google } for the header and sign-in page, always 200
//   POST /api/auth/logout             -> ends the session
//   DELETE /api/account               { email } -> deletes the account and everything in it (email typed to confirm)
//   GET    /api/codes                 -> your codes, plan and limit
//   POST   /api/codes                 { destination, label } -> new code
//   PATCH  /api/codes/:id             { destination, label } -> edit
//   DELETE /api/codes/:id             -> delete (scans then get the 404 page)
//   GET    /api/codes/export?format=csv|netlify|htaccess|nginx|cloudflare -> download every redirect
//   POST   /api/billing/checkout      { plan } -> a Dodo checkout link for that upgrade
//   POST   /api/billing/webhook       Dodo's signed payment notifications (no session; checked by signature)
import {
  LINK_TTL, SESSION_TTL, LINKS_PER_WINDOW, normalizeEmail, isValidEmail, newToken, sha256Hex,
  sessionCookie, clearedCookie, readCookie, isSameOrigin,
} from "./auth.js";
import { canSend, sendSignInLink, showLinkOnPage } from "./mail.js";
import { humanCheckOn, isHuman } from "./human.js";
import { googleOn, authUrl, challengeOf, flowCookie, FLOW_COOKIE, emailFromCode } from "./google.js";
import { limitFor, planName, expiresAtFor, normalizeDestination, cleanLabel, cleanEndsAt, newSlug, FREE_DAYS } from "./codes.js";
import { FORMATS, build } from "./export.js";
import { upgradeKey, upgradeOptions, highestPlan, productsOf, verifyWebhook } from "./billing.js";

const now = () => Math.floor(Date.now() / 1000);

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extra,
    },
  });

async function readJson(request) {
  try {
    const text = await request.text();
    return text.length <= 2000 ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

// The same answer whether or not the address has an account, so nobody can probe who signed up.
const SENT = { ok: true, message: "If that address can receive email, a sign-in link is on its way." };

async function start(request, env) {
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  if (!isValidEmail(email)) return json({ ok: false, error: "Enter a valid email address." }, 400);
  if (!canSend(env)) return json({ ok: false, error: "Sign-in isn't available yet." }, 503);
  // Before anything is saved or sent.
  if (!(await isHuman(env, body?.check, request.headers.get("cf-connecting-ip")))) {
    return json({ ok: false, error: "Please complete the check above the button, then try again." }, 400);
  }

  const { n } = await env.DB
    .prepare("SELECT COUNT(*) AS n FROM login_tokens WHERE email = ?1 AND created_at > ?2")
    .bind(email, now() - LINK_TTL)
    .first();
  const local = showLinkOnPage(env, request.url);
  if (n >= LINKS_PER_WINDOW) {
    // Limit reached: the same answer, nothing sent. Local testing gets told why, so it doesn't look broken.
    return json(local ? { ...SENT, dev_note: `Local testing: that's ${LINKS_PER_WINDOW} links for this email in 15 minutes, so no new one was made. Use the last link, wait, or try another email.` } : SENT);
  }

  const token = newToken();
  await env.DB
    .prepare("INSERT INTO login_tokens (token_hash, email, expires_at) VALUES (?1, ?2, ?3)")
    .bind(await sha256Hex(token), email, now() + LINK_TTL)
    .run();
  // The link opens a page with a "Sign in" button, so email scanners that open links can't use it up.
  const link = `${new URL(request.url).origin}/signin?token=${token}`;
  await sendSignInLink(env, email, link);
  return json(local ? { ...SENT, dev_link: link } : SENT);
}

async function verify(request, env) {
  const token = (await readJson(request))?.token;
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return json({ ok: false, error: "This sign-in link isn't valid." }, 400);
  }
  // Check and use up the link in one statement, so the same link can never work twice.
  const used = await env.DB
    .prepare("UPDATE login_tokens SET used_at = ?2 WHERE token_hash = ?1 AND used_at IS NULL AND expires_at > ?2 RETURNING email")
    .bind(await sha256Hex(token), now())
    .first();
  if (!used) return json({ ok: false, error: "This link has expired or was already used. Ask for a new one." }, 400);
  return json({ ok: true }, 200, { "set-cookie": await startSession(env, used.email) });
}

// Signs in the account for this (already proven) email, creating it the first time. Returns the cookie.
async function startSession(env, email) {
  await env.DB.prepare("INSERT INTO accounts (email) VALUES (?1) ON CONFLICT(email) DO NOTHING").bind(email).run();
  const account = await env.DB.prepare("SELECT id FROM accounts WHERE email = ?1").bind(email).first();

  const session = newToken();
  await env.DB
    .prepare("INSERT INTO sessions (id_hash, account_id, expires_at) VALUES (?1, ?2, ?3)")
    .bind(await sha256Hex(session), account.id, now() + SESSION_TTL)
    .run();
  return sessionCookie(session);
}

// ---------- Continue with Google ----------

const redirect = (location, cookies = []) => {
  const headers = new Headers({ location, "cache-control": "no-store" });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
};
const GOOGLE_FAILED = "/signin?error=google";

async function googleStart(request, env) {
  if (!googleOn(env)) return redirect(GOOGLE_FAILED);
  const [state, nonce, verifier] = [newToken(), newToken(), newToken()];
  const url = authUrl(env, new URL(request.url).origin, { state, nonce, challenge: await challengeOf(verifier) });
  return redirect(url, [flowCookie(`${state}.${nonce}.${verifier}`)]);
}

async function googleCallback(request, env) {
  const url = new URL(request.url);
  const [state, nonce, verifier] = (readCookie(request.headers.get("Cookie"), FLOW_COOKIE) ?? "").split(".");
  const code = url.searchParams.get("code");
  const failed = () => redirect(GOOGLE_FAILED, [flowCookie("", 0)]);
  // The state must match the cookie set when this browser left for Google, so nobody can push their sign-in onto you.
  if (!googleOn(env) || !state || !nonce || !verifier || url.searchParams.get("state") !== state || !code) return failed();
  let email = null;
  try {
    email = await emailFromCode(env, url.origin, code, verifier, nonce, now());
  } catch (err) {
    console.error("google", err?.message); // Google slow or down: back to the sign-in page, not a JSON error
  }
  if (!email) return failed();
  return redirect("/signin?signed=1", [flowCookie("", 0), await startSession(env, email)]);
}

async function currentAccount(request, env) {
  const raw = readCookie(request.headers.get("Cookie"));
  if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
  return env.DB
    .prepare("SELECT a.id, a.email, a.plan FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.id_hash = ?1 AND s.expires_at > ?2")
    .bind(await sha256Hex(raw), now())
    .first();
}

// For the header on every page: always 200, so signed-out visitors never see an error in the console.
// Says only whether you are signed in; no email or plan.
async function session(request, env) {
  // checkKey: the public key the sign-in page needs to show the bot check (null while it's off).
  // google: whether to show "Continue with Google".
  return json({
    ok: true, signedIn: Boolean(await currentAccount(request, env)),
    checkKey: humanCheckOn(env) ? env.TURNSTILE_SITE_KEY : null, google: googleOn(env),
  });
}

async function me(request, env) {
  const account = await currentAccount(request, env);
  return account ? json({ ok: true, email: account.email, plan: account.plan }) : json({ ok: false }, 401);
}

async function logout(request, env) {
  const raw = readCookie(request.headers.get("Cookie"));
  if (raw) await env.DB.prepare("DELETE FROM sessions WHERE id_hash = ?1").bind(await sha256Hex(raw)).run();
  return json({ ok: true }, 200, { "set-cookie": clearedCookie() });
}

// Deletes everything we hold about the account in one transaction. Typing the email confirms it,
// so a stray click or a stale tab can't do it. Codes stop working at once (scans get the 404 page).
const deleteAccount = (request, env) => withAccount(request, env, async (account) => {
  if (normalizeEmail((await readJson(request))?.email) !== account.email) {
    return json({ ok: false, error: "Type your email address exactly as shown above to confirm." }, 400);
  }
  await env.DB.batch([
    env.DB.prepare("DELETE FROM codes WHERE account_id = ?1").bind(account.id),
    env.DB.prepare("DELETE FROM sessions WHERE account_id = ?1").bind(account.id),
    env.DB.prepare("DELETE FROM payments WHERE account_id = ?1").bind(account.id),
    env.DB.prepare("DELETE FROM login_tokens WHERE email = ?1").bind(account.email),
    env.DB.prepare("DELETE FROM accounts WHERE id = ?1").bind(account.id),
  ]);
  return json({ ok: true }, 200, { "set-cookie": clearedCookie() });
});

// ---------- Codes ----------

// Where codes live until custom domains exist, e.g. https://qrone-redirect.<account>.workers.dev
const redirectOrigin = (env) => new URL(env.REDIRECT_ORIGIN);

function shortUrl(env, hostname, slug) {
  const origin = redirectOrigin(env);
  return hostname === origin.hostname ? `${origin.origin}/${slug}` : `https://${hostname}/${slug}`;
}

// Destinations may not point back at our own short links or our own site (no loops, no hidden chains).
const ownHosts = (env, request) => [redirectOrigin(env).hostname, new URL(request.url).hostname];

const publicCode = (env, r) => ({
  id: r.id, slug: r.slug, url: shortUrl(env, r.hostname, r.slug), destination: r.destination,
  label: r.label, expires_at: r.expires_at, ends_at: r.ends_at, disabled: Boolean(r.disabled), created_at: r.created_at,
});

const SELECT_CODE = "SELECT id, slug, hostname, destination, label, expires_at, ends_at, disabled, created_at FROM codes";
const BAD_DESTINATION = "That doesn't look like a web address we can send people to. Try something like example.com/menu.";

async function withAccount(request, env, fn) {
  const account = await currentAccount(request, env);
  return account ? fn(account) : json({ ok: false, error: "Please sign in again." }, 401);
}

const listCodes = (request, env) => withAccount(request, env, async (account) => {
  const { results } = await env.DB
    .prepare(`${SELECT_CODE} WHERE account_id = ?1 ORDER BY created_at DESC, id DESC`)
    .bind(account.id)
    .all();
  return json({
    ok: true, now: now(), plan: account.plan, planName: planName(account.plan),
    limit: limitFor(account.plan), used: results.length, codes: results.map((r) => publicCode(env, r)),
    upgrades: upgradeOptions(account.plan).map((u) => ({ ...u, name: planName(u.plan), limit: limitFor(u.plan) })),
  });
});

const createCode = (request, env) => withAccount(request, env, async (account) => {
  const body = await readJson(request);
  const destination = normalizeDestination(body?.destination, ownHosts(env, request));
  if (!destination) return json({ ok: false, error: BAD_DESTINATION }, 400);
  const label = cleanLabel(body?.label);
  if (label === null) return json({ ok: false, error: "Keep the name under 80 characters." }, 400);

  const t = now();
  const expiresAt = expiresAtFor(account.plan, t);
  const ends = cleanEndsAt(body?.ends_at, t, expiresAt);
  if (ends.error) return json({ ok: false, error: ends.error }, 400);

  const limit = limitFor(account.plan);
  const hostname = redirectOrigin(env).hostname;
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = newSlug();
    try {
      // The plan limit is checked inside the same statement as the insert, so two quick clicks can't exceed it.
      const result = await env.DB
        .prepare(
          `INSERT INTO codes (account_id, hostname, slug, destination, label, expires_at, ends_at)
           SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?8 WHERE (SELECT COUNT(*) FROM codes WHERE account_id = ?1) < ?7`,
        )
        .bind(account.id, hostname, slug, destination, label, expiresAt, limit, ends.value)
        .run();
      if (result.meta.changes === 0) {
        return json({ ok: false, error: `Your ${planName(account.plan)} plan allows ${limit} codes. Delete one, or upgrade for more.` }, 403);
      }
      const row = await env.DB.prepare(`${SELECT_CODE} WHERE hostname = ?1 AND slug = ?2`).bind(hostname, slug).first();
      return json({ ok: true, code: publicCode(env, row) }, 201);
    } catch (err) {
      if (!String(err?.message).includes("UNIQUE")) throw err; // anything but a name clash is a real error
    }
  }
  throw new Error("could not find a free short-link name");
});

const editCode = (request, env, id) => withAccount(request, env, async (account) => {
  const body = await readJson(request);
  const destination = normalizeDestination(body?.destination, ownHosts(env, request));
  if (!destination) return json({ ok: false, error: BAD_DESTINATION }, 400);
  const label = cleanLabel(body?.label);
  if (label === null) return json({ ok: false, error: "Keep the name under 80 characters." }, 400);
  // "AND account_id" means you can only ever see or change your own codes.
  const current = await env.DB.prepare("SELECT expires_at, ends_at FROM codes WHERE id = ?1 AND account_id = ?2").bind(id, account.id).first();
  if (!current) return json({ ok: false, error: "That code wasn't found." }, 404);
  // The end time only changes when the request mentions it; leaving it out keeps the one already set.
  let endsAt = current.ends_at;
  if (body && Object.hasOwn(body, "ends_at")) {
    const ends = cleanEndsAt(body.ends_at, now(), current.expires_at);
    if (ends.error) return json({ ok: false, error: ends.error }, 400);
    endsAt = ends.value;
  }
  const result = await env.DB
    .prepare("UPDATE codes SET destination = ?1, label = ?2, ends_at = ?5 WHERE id = ?3 AND account_id = ?4")
    .bind(destination, label, id, account.id, endsAt)
    .run();
  if (result.meta.changes === 0) return json({ ok: false, error: "That code wasn't found." }, 404);
  const row = await env.DB.prepare(`${SELECT_CODE} WHERE id = ?1`).bind(id).first();
  return json({ ok: true, code: publicCode(env, row) });
});

const deleteCode = (request, env, id) => withAccount(request, env, async (account) => {
  const result = await env.DB.prepare("DELETE FROM codes WHERE id = ?1 AND account_id = ?2").bind(id, account.id).run();
  if (result.meta.changes === 0) return json({ ok: false, error: "That code wasn't found." }, 404);
  return json({ ok: true });
});

// Export works on every plan, including expired free codes: the customer's redirects are theirs to keep.
const exportCodes = (request, env) => withAccount(request, env, async (account) => {
  const format = new URL(request.url).searchParams.get("format");
  if (!Object.hasOwn(FORMATS, format)) return json({ ok: false, error: "Unknown export format." }, 400);
  const { results } = await env.DB
    .prepare(`${SELECT_CODE} WHERE account_id = ?1 ORDER BY created_at, id`)
    .bind(account.id)
    .all();
  const codes = results.map((r) => ({ ...publicCode(env, r), hostname: r.hostname }));
  return new Response(build[format](codes, now()), {
    headers: {
      "content-type": FORMATS[format].type,
      "content-disposition": `attachment; filename="${FORMATS[format].file}"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
});

// ---------- Payments (Dodo) ----------

const dodo = (env, path, init = {}) =>
  fetch(`${env.DODO_API_BASE}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${env.DODO_API_KEY}`, "content-type": "application/json", ...init.headers },
  });

const checkout = (request, env) => withAccount(request, env, async (account) => {
  const to = (await readJson(request))?.plan;
  const key = upgradeKey(account.plan, to);
  if (!key) return json({ ok: false, error: "That isn't an upgrade from your current plan." }, 400);
  const productId = productsOf(env)[key];
  if (!productId || !env.DODO_API_KEY) return json({ ok: false, error: "Payments aren't switched on yet." }, 503);

  const res = await dodo(env, "/checkouts", {
    method: "POST",
    body: JSON.stringify({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: account.email },
      return_url: `${new URL(request.url).origin}/dashboard?paid=1`,
      metadata: { account_id: String(account.id), from_plan: account.plan, to_plan: to },
    }),
  });
  if (!res.ok) {
    console.error("checkout failed", res.status);
    return json({ ok: false, error: "Checkout couldn't start. Please try again." }, 502);
  }
  const { checkout_url } = await res.json();
  return json({ ok: true, checkout_url });
});

// We never trust what a notification says it contains: we look the payment up in Dodo's API ourselves.
async function fetchPayment(env, paymentId) {
  if (typeof paymentId !== "string" || !/^[A-Za-z0-9_]{1,64}$/.test(paymentId)) throw new Error("unexpected payment id");
  const res = await dodo(env, `/payments/${paymentId}`);
  if (!res.ok) throw new Error(`payment lookup failed: ${res.status}`); // a 500 makes Dodo retry later
  return res.json();
}

async function applyPayment(env, paymentId) {
  const p = await fetchPayment(env, paymentId);
  if (p.status !== "succeeded") return;
  const { account_id: accountId, from_plan: from, to_plan: to } = p.metadata ?? {};
  const expectedProduct = productsOf(env)[upgradeKey(from, to)];
  if (!expectedProduct || !(p.product_cart ?? []).some((item) => item.product_id === expectedProduct)) {
    console.error("payment does not match a QrOne upgrade", paymentId);
    return;
  }
  const account = await env.DB.prepare("SELECT id, plan FROM accounts WHERE id = ?1").bind(Number(accountId)).first();
  if (!account) return console.error("payment for an unknown account", paymentId);
  const existing = await env.DB.prepare("SELECT status FROM payments WHERE payment_id = ?1").bind(paymentId).first();
  if (existing?.status === "refunded") return; // a late retry must never undo a refund

  // One transaction, and every statement is safe to repeat, so Dodo's retries can't double-apply anything.
  await env.DB.batch([
    env.DB.prepare(
      "INSERT OR IGNORE INTO payments (payment_id, account_id, from_plan, to_plan, amount, currency, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'paid')",
    ).bind(paymentId, account.id, from, to, Number(p.total_amount) || 0, String(p.currency ?? "")),
    env.DB.prepare("UPDATE accounts SET plan = ?1 WHERE id = ?2").bind(highestPlan([account.plan, to]), account.id),
    env.DB.prepare("UPDATE codes SET expires_at = NULL WHERE account_id = ?1").bind(account.id), // paid codes never expire
  ]);
}

async function applyRefund(env, paymentId) {
  const row = await env.DB.prepare("SELECT account_id, status FROM payments WHERE payment_id = ?1").bind(paymentId).first();
  if (!row || row.status === "refunded") return;
  const p = await fetchPayment(env, paymentId);
  // shortcut: any refund (even partial) counts as a full refund; fine while refunds are issued by hand in Dodo.
  if (!(p.refunds ?? []).length) return;

  const { results } = await env.DB
    .prepare("SELECT to_plan FROM payments WHERE account_id = ?1 AND status = 'paid' AND payment_id != ?2")
    .bind(row.account_id, paymentId)
    .all();
  const plan = highestPlan(results.map((r) => r.to_plan)); // usually "free"
  const t = now();
  const statements = [
    env.DB.prepare("UPDATE payments SET status = 'refunded', refunded_at = ?2 WHERE payment_id = ?1").bind(paymentId, t),
    env.DB.prepare("UPDATE accounts SET plan = ?1 WHERE id = ?2").bind(plan, row.account_id),
  ];
  // Back on Free: codes keep working for 14 more days (never switched off at the moment of a refund).
  if (plan === "free") {
    const until = t + FREE_DAYS * 86400;
    statements.push(env.DB
      .prepare("UPDATE codes SET expires_at = ?1 WHERE account_id = ?2 AND (expires_at IS NULL OR expires_at > ?1)")
      .bind(until, row.account_id));
  }
  await env.DB.batch(statements);
}

async function webhook(request, env) {
  const body = await request.text(); // the raw text: the signature covers it byte for byte
  if (!(await verifyWebhook(env.DODO_WEBHOOK_SECRET, request.headers, body, now()))) return json({ ok: false }, 401);
  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return json({ ok: false }, 400);
  }
  const paymentId = event?.data?.payment_id;
  if (event?.type === "payment.succeeded" && paymentId) await applyPayment(env, paymentId);
  if (event?.type === "refund.succeeded" && paymentId) await applyRefund(env, paymentId);
  return json({ ok: true }); // other event types are acknowledged and ignored
}

// ---------- Routing ----------

const ROUTES = {
  "POST /api/auth/start": start,
  "POST /api/auth/verify": verify,
  "GET /api/auth/google": googleStart,
  "GET /api/auth/google/callback": googleCallback,
  "GET /api/me": me,
  "GET /api/session": session,
  "POST /api/auth/logout": logout,
  "DELETE /api/account": deleteAccount,
  "GET /api/codes": listCodes,
  "POST /api/codes": createCode,
  "GET /api/codes/export": exportCodes,
  "POST /api/billing/checkout": checkout,
  "POST /api/billing/webhook": webhook,
};
const SIGNED_NOT_SAME_ORIGIN = new Set(["/api/billing/webhook"]); // Dodo's servers call this; the signature is the check

function route(method, pathname) {
  const fixed = ROUTES[`${method} ${pathname}`];
  if (fixed) return (request, env) => fixed(request, env);
  const m = pathname.match(/^\/api\/codes\/(\d{1,15})$/);
  if (m && method === "PATCH") return (request, env) => editCode(request, env, Number(m[1]));
  if (m && method === "DELETE") return (request, env) => deleteCode(request, env, Number(m[1]));
  return null;
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request); // a page or file, or the normal 404

    const handler = route(request.method, pathname);
    if (!handler) return json({ ok: false, error: "Not found" }, 404);
    // Anything that changes data must come from our own pages.
    if (request.method !== "GET" && !SIGNED_NOT_SAME_ORIGIN.has(pathname) && !isSameOrigin(request)) {
      return json({ ok: false, error: "Forbidden" }, 403);
    }
    try {
      return await handler(request, env);
    } catch (err) {
      console.error(pathname, err?.message); // the details go to the logs, never to the visitor
      return json({ ok: false, error: "Something went wrong. Please try again." }, 500);
    }
  },
};
