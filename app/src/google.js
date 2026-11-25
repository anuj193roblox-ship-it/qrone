// "Continue with Google": Google's standard sign-in (OpenID Connect, code flow with PKCE).
// Needs no email sending and no domain of our own. We ask only for "openid email": no name, photo or contacts.
//   GOOGLE_CLIENT_ID: public (a var).  GOOGLE_CLIENT_SECRET: a secret (wrangler secret put).
import { normalizeEmail, isValidEmail } from "./auth.js";

export const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
export const FLOW_COOKIE = "__Host-qrone_google";
const FLOW_TTL = 10 * 60; // the trip to Google and back must finish within 10 minutes

export const googleOn = (env) => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
const redirectUri = (origin) => `${origin}/api/auth/google/callback`;

const base64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const challengeOf = async (verifier) =>
  base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));

export function authUrl(env, origin, { state, nonce, challenge }) {
  const url = new URL(GOOGLE_AUTH);
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri(origin), response_type: "code", scope: "openid email",
    state, nonce, code_challenge: challenge, code_challenge_method: "S256", prompt: "select_account",
  });
  return url.href;
}

// Holds "state.nonce.verifier" (three random tokens) between leaving for Google and coming back.
// SameSite=Lax still sends it on Google's redirect back, which is a normal top-level visit.
export const flowCookie = (value, maxAge = FLOW_TTL) =>
  `${FLOW_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

// What Google says about the person, checked: our app, this sign-in attempt, not expired, email verified.
export function emailFromClaims(c, clientId, nonce, nowSec) {
  if (!c || typeof c !== "object") return null;
  if (c.iss !== "https://accounts.google.com" && c.iss !== "accounts.google.com") return null;
  if (c.aud !== clientId || !nonce || c.nonce !== nonce || !(c.exp > nowSec) || c.email_verified !== true) return null;
  const email = normalizeEmail(c.email);
  return isValidEmail(email) ? email : null;
}

function payloadOf(jwt) {
  try {
    const part = String(jwt).split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(part), (ch) => ch.charCodeAt(0))));
  } catch {
    return null;
  }
}

// Swaps the one-time code for the ID token, and returns the verified email or null.
// The token comes straight from Google over HTTPS in answer to our secret, so its signature needn't be
// checked again (Google's OpenID Connect guide says the same); the claims still are.
export async function emailFromCode(env, origin, code, verifier, nonce, nowSec) {
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, code_verifier: verifier, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(origin), grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    console.error("google token", res.status);
    return null;
  }
  const idToken = (await res.json().catch(() => null))?.id_token;
  return emailFromClaims(payloadOf(idToken), env.GOOGLE_CLIENT_ID, nonce, nowSec);
}
