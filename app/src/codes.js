// Rules for creating and editing codes. Pure functions, so each rule has a test.
import { isSafeDestination } from "../../worker/src/resolve.js";

export const FREE_DAYS = 14;
export const PLANS = {
  free: { name: "Free", limit: 10 },
  starter: { name: "Starter", limit: 10 },
  plus: { name: "Plus", limit: 25 },
  pro: { name: "Pro", limit: 75 },
};
export const limitFor = (plan) => PLANS[plan]?.limit ?? 0;
export const planName = (plan) => PLANS[plan]?.name ?? plan;

// Free codes stop after 14 days; paid codes never expire (NULL in the database).
export const expiresAtFor = (plan, nowSeconds) => (plan === "free" ? nowSeconds + FREE_DAYS * 86400 : null);

// An end time the owner picks (Unix seconds), or none. Returns { value } (null = no end time) or { error }.
// At least an hour away and at most 10 years; a free code can't be set to run past its plan expiry.
export const MIN_END = 3600;
export const MAX_END = 10 * 365 * 86400;
export function cleanEndsAt(value, nowSeconds, planExpiresAt = null) {
  if (value === null || value === undefined || value === "") return { value: null };
  // Only a number, or a number sent as text: Number([123]) would otherwise sneak a list through as 123.
  const t = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(t)) return { error: "That end time isn't valid. Pick a date and time." };
  if (t < nowSeconds + MIN_END) return { error: "Pick an end time at least an hour from now." };
  if (t > nowSeconds + MAX_END) return { error: "Pick an end time within the next 10 years." };
  if (planExpiresAt != null && t > planExpiresAt) {
    return { error: "Free codes stop after 14 days, so the end time can't be later than that. Upgrade to set a later one." };
  }
  return { value: t };
}

// People type "example.com/menu"; we store "https://example.com/menu". Returns null if it isn't safe.
export function normalizeDestination(value, ownHosts = []) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const url = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
  return isSafeDestination(url, ownHosts) ? url : null;
}

// Optional name. Returns the cleaned name, or null when it's too long.
export function cleanLabel(value) {
  const s = String(value ?? "").trim().replace(/\s+/g, " ");
  return s.length <= 80 ? s : null;
}

// Short-link names: 7 characters, without look-alikes (0/O, 1/l/I), so they're easy to read aloud or type.
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newSlug(length = 7) {
  const values = crypto.getRandomValues(new Uint32Array(length));
  return [...values].map((v) => ALPHABET[v % ALPHABET.length]).join("");
}
