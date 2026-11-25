// Sign-in page and dashboard. Talks only to our own /api/*; all text is set with textContent.
import { setBoard } from "./board.js";

const $ = (id) => document.getElementById(id);
const PLAN_NAMES = { free: "Free", starter: "Starter", plus: "Plus", pro: "Pro" };

async function api(path, body) {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });
  let data = {};
  try { data = await res.json(); } catch { /* not JSON: treat as a failure below */ }
  return { ok: res.ok && data.ok !== false, status: res.status, data };
}

export function initSignin() {
  const token = new URLSearchParams(location.search).get("token");
  const error = (text) => { $("signin-error").textContent = text; };

  if (token) {
    // Remove the token from the address bar and history straight away.
    history.replaceState(null, "", location.pathname);
    $("signin-form").hidden = true;
    $("signin-finish").hidden = false;
    setBoard("Finish signing in");
    $("signin-go").addEventListener("click", async () => {
      $("signin-go").disabled = true;
      error("");
      const r = await api("/api/auth/verify", { token });
      if (r.ok) location.assign("/dashboard.html");
      else {
        error(r.data.error ?? "That didn't work. Ask for a new link.");
        $("signin-finish").hidden = true;
        $("signin-form").hidden = false;
        setBoard("Sign in");
      }
    });
    return;
  }

  $("signin-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = e.submitter ?? $("signin-form").querySelector("button");
    button.disabled = true;
    error("");
    $("signin-msg").textContent = "Sending…";
    const r = await api("/api/auth/start", { email: $("signin-email").value });
    button.disabled = false;
    $("signin-msg").textContent = "";
    if (r.ok) {
      $("signin-msg").textContent = r.data.message;
      setBoard("Check your inbox");
    } else {
      error(r.data.error ?? "That didn't work. Please try again.");
    }
  });
}

export async function initDashboard() {
  const r = await api("/api/me");
  if (r.status === 401) return location.replace("/signin.html");
  if (!r.ok) {
    $("dash-status").textContent = "We couldn't load your account. Please refresh the page.";
    return;
  }
  $("dash-email").textContent = r.data.email;
  $("dash-plan").textContent = PLAN_NAMES[r.data.plan] ?? r.data.plan;
  $("dash-status").textContent = "";
  $("dashboard").hidden = false;
  $("dash-logout").addEventListener("click", async () => {
    await api("/api/auth/logout", {});
    location.assign("/signin.html");
  });
}
