// Small, testable building blocks for sign-in. No database or network in here.

export const LINK_TTL = 15 * 60; // a sign-in link works for 15 minutes
export const SESSION_TTL = 30 * 24 * 60 * 60; // staying signed in lasts 30 days
export const LINKS_PER_WINDOW = 3; // at most 3 links per address per 15 minutes
export const COOKIE = "__Host-qrone_session"; // __Host- makes browsers insist on Secure, Path=/ and no Domain

export const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

export function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 32 random bytes as URL-safe text. Used for sign-in links and sessions.
export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// What the database stores instead of the token itself.
export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function sessionCookie(value, maxAge = SESSION_TTL) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export const clearedCookie = () => sessionCookie("", 0);

export function readCookie(header, name = COOKIE) {
  for (const part of String(header ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

// Changes (POST) must come from our own pages, not from another site.
export function isSameOrigin(request) {
  return request.headers.get("Origin") === new URL(request.url).origin;
}
