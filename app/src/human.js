// The "are you a person?" check on the sign-in form: Cloudflare Turnstile (free).
// Without it, a script could type in 100 made-up addresses and use up the day's email allowance.
//   TURNSTILE_SITE_KEY: public, shown to the browser (a var).  TURNSTILE_SECRET: a secret (wrangler secret put).
// Real email stays off until both exist (see mail.js), so the live site can never send unguarded.

export const humanCheckOn = (env) => Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET);

export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function isHuman(env, token, ip) {
  if (!humanCheckOn(env)) return true; // only local testing gets here: without the check no real email is sent
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const res = await fetch(SITEVERIFY_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, ...(ip ? { remoteip: ip } : {}) }),
    signal: AbortSignal.timeout(10_000), // a hung check becomes "something went wrong", not an endless spinner
  });
  if (!res.ok) return false;
  const data = await res.json().catch(() => null);
  return data?.success === true; // each answer works once, so 20 requests at once need 20 solved checks
}
