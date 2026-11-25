// QrOne site Worker. Static pages are served straight from dist/ (the assets);
// this code only runs for /api/* (sign-in, account) and for paths that match no file.
//
//   POST /api/auth/start   { email }  -> emails a one-time sign-in link
//   POST /api/auth/verify  { token }  -> uses the link once, starts a session (cookie)
//   GET  /api/me                      -> who is signed in (or 401)
//   POST /api/auth/logout             -> ends the session
import {
  LINK_TTL, SESSION_TTL, LINKS_PER_WINDOW, normalizeEmail, isValidEmail, newToken, sha256Hex,
  sessionCookie, clearedCookie, readCookie, isSameOrigin,
} from "./auth.js";
import { canSend, sendSignInLink } from "./mail.js";

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
    .prepare("SELECT a.email, a.plan FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.id_hash = ?1 AND s.expires_at > ?2")
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

const ROUTES = {
  "POST /api/auth/start": start,
  "POST /api/auth/verify": verify,
  "GET /api/me": me,
  "POST /api/auth/logout": logout,
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request); // a page or file, or the normal 404

    const handler = ROUTES[`${request.method} ${pathname}`];
    if (!handler) return json({ ok: false, error: "Not found" }, 404);
    if (request.method === "POST" && !isSameOrigin(request)) return json({ ok: false, error: "Forbidden" }, 403);
    try {
      return await handler(request, env);
    } catch (err) {
      console.error(pathname, err?.message); // the details go to the logs, never to the visitor
      return json({ ok: false, error: "Something went wrong. Please try again." }, 500);
    }
  },
};
