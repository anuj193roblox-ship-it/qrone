// QrOne site Worker. Static pages are served straight from dist/ (the assets);
// this code only runs for /api/* (sign-in, account) and for paths that match no file.
//
//   POST /api/auth/start   { email }  -> emails a one-time sign-in link
//   POST /api/auth/verify  { token }  -> uses the link once, starts a session (cookie)
//   GET  /api/me                      -> who is signed in (or 401)
//   POST /api/auth/logout             -> ends the session
//   GET    /api/codes                 -> your codes, plan and limit
//   POST   /api/codes                 { destination, label } -> new code
//   PATCH  /api/codes/:id             { destination, label } -> edit
//   DELETE /api/codes/:id             -> delete (scans then get the 404 page)
import {
  LINK_TTL, SESSION_TTL, LINKS_PER_WINDOW, normalizeEmail, isValidEmail, newToken, sha256Hex,
  sessionCookie, clearedCookie, readCookie, isSameOrigin,
} from "./auth.js";
import { canSend, sendSignInLink } from "./mail.js";
import { limitFor, planName, expiresAtFor, normalizeDestination, cleanLabel, newSlug } from "./codes.js";

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
  const email = normalizeEmail((await readJson(request))?.email);
  if (!isValidEmail(email)) return json({ ok: false, error: "Enter a valid email address." }, 400);
  if (!canSend(env)) return json({ ok: false, error: "Sign-in isn't available yet." }, 503);

  const { n } = await env.DB
    .prepare("SELECT COUNT(*) AS n FROM login_tokens WHERE email = ?1 AND created_at > ?2")
    .bind(email, now() - LINK_TTL)
    .first();
  if (n >= LINKS_PER_WINDOW) return json(SENT); // limit reached: same answer, nothing sent

  const token = newToken();
  await env.DB
    .prepare("INSERT INTO login_tokens (token_hash, email, expires_at) VALUES (?1, ?2, ?3)")
    .bind(await sha256Hex(token), email, now() + LINK_TTL)
    .run();
  // The link opens a page with a "Sign in" button, so email scanners that open links can't use it up.
  await sendSignInLink(env, email, `${new URL(request.url).origin}/signin?token=${token}`);
  return json(SENT);
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

  await env.DB.prepare("INSERT INTO accounts (email) VALUES (?1) ON CONFLICT(email) DO NOTHING").bind(used.email).run();
  const account = await env.DB.prepare("SELECT id FROM accounts WHERE email = ?1").bind(used.email).first();

  const session = newToken();
  await env.DB
    .prepare("INSERT INTO sessions (id_hash, account_id, expires_at) VALUES (?1, ?2, ?3)")
    .bind(await sha256Hex(session), account.id, now() + SESSION_TTL)
    .run();
  return json({ ok: true }, 200, { "set-cookie": sessionCookie(session) });
}

async function currentAccount(request, env) {
  const raw = readCookie(request.headers.get("Cookie"));
  if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
  return env.DB
    .prepare("SELECT a.id, a.email, a.plan FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.id_hash = ?1 AND s.expires_at > ?2")
    .bind(await sha256Hex(raw), now())
    .first();
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
  label: r.label, expires_at: r.expires_at, disabled: Boolean(r.disabled), created_at: r.created_at,
});

const SELECT_CODE = "SELECT id, slug, hostname, destination, label, expires_at, disabled, created_at FROM codes";
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
  });
});

const createCode = (request, env) => withAccount(request, env, async (account) => {
  const body = await readJson(request);
  const destination = normalizeDestination(body?.destination, ownHosts(env, request));
  if (!destination) return json({ ok: false, error: BAD_DESTINATION }, 400);
  const label = cleanLabel(body?.label);
  if (label === null) return json({ ok: false, error: "Keep the name under 80 characters." }, 400);

  const limit = limitFor(account.plan);
  const hostname = redirectOrigin(env).hostname;
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = newSlug();
    try {
      // The plan limit is checked inside the same statement as the insert, so two quick clicks can't exceed it.
      const result = await env.DB
        .prepare(
          `INSERT INTO codes (account_id, hostname, slug, destination, label, expires_at)
           SELECT ?1, ?2, ?3, ?4, ?5, ?6 WHERE (SELECT COUNT(*) FROM codes WHERE account_id = ?1) < ?7`,
        )
        .bind(account.id, hostname, slug, destination, label, expiresAtFor(account.plan, now()), limit)
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
  // "AND account_id" means you can only ever change your own codes.
  const result = await env.DB
    .prepare("UPDATE codes SET destination = ?1, label = ?2 WHERE id = ?3 AND account_id = ?4")
    .bind(destination, label, id, account.id)
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

// ---------- Routing ----------

const ROUTES = {
  "POST /api/auth/start": start,
  "POST /api/auth/verify": verify,
  "GET /api/me": me,
  "POST /api/auth/logout": logout,
  "GET /api/codes": listCodes,
  "POST /api/codes": createCode,
};

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
    if (request.method !== "GET" && !isSameOrigin(request)) return json({ ok: false, error: "Forbidden" }, 403);
    try {
      return await handler(request, env);
    } catch (err) {
      console.error(pathname, err?.message); // the details go to the logs, never to the visitor
      return json({ ok: false, error: "Something went wrong. Please try again." }, 500);
    }
  },
};
