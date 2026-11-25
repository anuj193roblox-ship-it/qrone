// Sign-in page and dashboard. Talks only to our own /api/*; all text is set with textContent (via el()).
import { setBoard } from "./board.js";

const $ = (id) => document.getElementById(id);

// Safe element builder: strings become text nodes, never HTML.
function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  node.append(...kids.filter((k) => k !== null && k !== undefined && k !== false));
  return node;
}

async function api(path, body, method = body === undefined ? "GET" : "POST") {
  const res = await fetch(path, {
    method,
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

// ---------- Dashboard ----------

function stateText(code, now) {
  if (code.disabled) return { text: "Switched off", tone: "bad" };
  if (code.expires_at == null) return { text: "Never expires", tone: "ok" };
  const days = Math.ceil((code.expires_at - now) / 86400);
  if (days <= 0) return { text: "Expired", tone: "bad" };
  return { text: days === 1 ? "Expires tomorrow" : `Expires in ${days} days`, tone: days <= 3 ? "warn" : "" };
}

let qr = null; // one QR renderer, reused for every code

async function showQr(code) {
  const { default: QRCodeStyling } = await import("qr-code-styling");
  if (!qr) {
    qr = new QRCodeStyling({ width: 512, height: 512, type: "canvas", margin: 16, data: code.url, qrOptions: { errorCorrectionLevel: "M" } });
    qr.append($("qr-box"));
    $("qr-png").addEventListener("click", () => qr.download({ name: `qrone-${$("qr-box").dataset.slug}`, extension: "png" }));
    $("qr-svg").addEventListener("click", () => qr.download({ name: `qrone-${$("qr-box").dataset.slug}`, extension: "svg" }));
    $("qr-close").addEventListener("click", () => { $("qr-panel").hidden = true; });
  }
  qr.update({ data: code.url }); // the short link is plain ASCII, so no extra encoding is needed
  $("qr-box").dataset.slug = code.slug;
  $("qr-title").textContent = code.label || "Your code";
  $("qr-url").textContent = code.url;
  $("qr-panel").hidden = false;
  $("qr-panel").scrollIntoView({ block: "nearest" });
}

function renderRow(code, now, reload) {
  const state = stateText(code, now);
  const dest = el("p", { class: "code-dest" }, el("span", { class: "sr-only" }, "Goes to "), code.destination);
  const error = el("p", { class: "msg-error", role: "alert" });

  const startEdit = () => {
    const input = el("input", { type: "text", value: code.destination, "aria-label": "New destination", spellcheck: "false" });
    const form = el("form", { class: "pair pair-tight code-edit" }, input,
      el("button", { type: "submit", class: "btn" }, "Save"),
      el("button", { type: "button", class: "btn btn-quiet", onclick: () => form.replaceWith(dest) }, "Cancel"));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const r = await api(`/api/codes/${code.id}`, { destination: input.value, label: code.label }, "PATCH");
      if (r.ok) reload(`Saved. Scans now go to ${r.data.code.destination}`);
      else error.textContent = r.data.error ?? "That didn't save. Please try again.";
    });
    dest.replaceWith(form);
    input.focus();
  };

  const remove = async () => {
    if (!confirm(`Delete "${code.label || code.url}"? Anyone who scans it will see "No QR code here". This can't be undone.`)) return;
    const r = await api(`/api/codes/${code.id}`, undefined, "DELETE");
    if (r.ok) reload("Code deleted.");
    else error.textContent = r.data.error ?? "That didn't delete. Please try again.";
  };

  const copy = async (e) => {
    try {
      await navigator.clipboard.writeText(code.url);
      e.target.textContent = "Copied";
      setTimeout(() => { e.target.textContent = "Copy link"; }, 1500);
    } catch {
      error.textContent = `Copy this link: ${code.url}`;
    }
  };

  return el("li", { class: "code-row" },
    el("div", { class: "code-main" },
      el("p", { class: "code-name" }, code.label || "Untitled code"),
      el("p", { class: "mono code-link" }, code.url.replace(/^https?:\/\//, ""))), // shorter to read; Copy uses the full link
    dest,
    el("p", { class: `code-state${state.tone ? ` tone-${state.tone}` : ""}` }, state.text),
    el("div", { class: "code-actions" },
      el("button", { type: "button", class: "btn", onclick: () => showQr(code) }, "QR code"),
      el("button", { type: "button", class: "btn", onclick: copy }, "Copy link"),
      el("button", { type: "button", class: "btn", onclick: startEdit }, "Change destination"),
      el("button", { type: "button", class: "btn btn-quiet", onclick: remove }, "Delete")),
    error);
}

export async function initDashboard() {
  const r = await api("/api/me");
  if (r.status === 401) return location.replace("/signin.html");
  if (!r.ok) {
    $("dash-status").textContent = "We couldn't load your account. Please refresh the page.";
    return;
  }
  $("dash-email").textContent = r.data.email;
  $("dashboard").hidden = false;
  $("dash-logout").addEventListener("click", async () => {
    await api("/api/auth/logout", {});
    location.assign("/signin.html");
  });

  async function reload(message = "") {
    const list = await api("/api/codes");
    if (list.status === 401) return location.replace("/signin.html");
    if (!list.ok) {
      $("dash-status").textContent = "We couldn't load your codes. Please refresh the page.";
      return;
    }
    const { codes, used, limit, planName, plan, now, upgrades } = list.data;
    $("plan-panel").hidden = upgrades.length === 0;
    $("plan-options").replaceChildren(...upgrades.map((u) =>
      el("button", { type: "button", class: "btn", onclick: (e) => upgrade(u.plan, e.currentTarget) },
        `${u.name}: ${u.limit} codes, $${(u.price / 100).toFixed(u.price % 100 ? 2 : 0)}`)));
    $("dash-usage").textContent = `${used} of ${limit} codes · ${planName} plan`;
    $("code-note").textContent = plan === "free" ? "Free codes work for 14 days. Paid plans never expire." : "Your codes never expire.";
    $("code-create").disabled = used >= limit;
    if (used >= limit) $("code-error").textContent = `You've used all ${limit} codes on the ${planName} plan. Delete one to make another.`;
    $("code-empty").hidden = codes.length > 0;
    $("code-list").replaceChildren(...codes.map((c) => renderRow(c, now, reload)));
    $("dash-status").textContent = message;
  }

  async function upgrade(plan, button) {
    $("plan-error").textContent = "";
    button.disabled = true;
    const r = await api("/api/billing/checkout", { plan });
    if (r.ok && /^https:\/\//.test(r.data.checkout_url ?? "")) return location.assign(r.data.checkout_url);
    button.disabled = false;
    $("plan-error").textContent = r.data.error ?? "Checkout couldn't start. Please try again.";
  }

  $("code-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("code-error").textContent = "";
    $("code-create").disabled = true;
    const created = await api("/api/codes", { destination: $("code-dest").value, label: $("code-label").value });
    $("code-create").disabled = false;
    if (!created.ok) {
      $("code-error").textContent = created.data.error ?? "That didn't work. Please try again.";
      return;
    }
    $("code-dest").value = "";
    $("code-label").value = "";
    setBoard("Code ready");
    await reload(`Created ${created.data.code.url}`);
    showQr(created.data.code);
  });

  // Back from Dodo's checkout: the plan changes when Dodo's notification arrives, usually within seconds.
  if (new URLSearchParams(location.search).has("paid")) {
    history.replaceState(null, "", location.pathname);
    const before = (await api("/api/codes")).data.plan;
    for (let i = 0; i < 5; i++) {
      await reload("Payment received. Updating your plan…");
      const after = (await api("/api/codes")).data.plan;
      if (after !== before) return reload("Thank you. Your plan is upgraded and your codes no longer expire.");
      await new Promise((r) => setTimeout(r, 3000));
    }
    return reload("Payment received. Your plan will update shortly; refresh this page in a minute.");
  }
  await reload();
}
