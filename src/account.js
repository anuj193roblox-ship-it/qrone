// Sign-in page and dashboard. Talks only to our own /api/*; all text is set with textContent (via el()).
import { setHeadline } from "./headline.js";
import { BRAND } from "./config.js";
import { quietZone, framedSvgBlob, downloadFramed, printStickers } from "./frame.js";

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

// Where to go after the email link: back to pricing if you came from a plan button. Only these two
// fixed pages are ever used, so a crafted link can never send someone elsewhere.
const AFTER_SIGNIN = "qrone-after-signin";
function nextPage() {
  try {
    const next = localStorage.getItem(AFTER_SIGNIN) === "/pricing" ? "/pricing" : "/dashboard.html";
    localStorage.removeItem(AFTER_SIGNIN);
    return next;
  } catch {
    return "/dashboard.html"; // storage blocked: the dashboard is always a fine place to land
  }
}

export function initSignin() {
  const params = new URLSearchParams(location.search);
  const token = params.get("token");
  if (["starter", "plus", "pro"].includes(params.get("plan"))) {
    try { localStorage.setItem(AFTER_SIGNIN, "/pricing"); } catch { /* fine: you land on the dashboard instead */ }
  }
  const error = (text) => { $("signin-error").textContent = text; };

  if (token) {
    // Remove the token from the address bar and history straight away.
    history.replaceState(null, "", location.pathname);
    $("signin-form").hidden = true;
    $("signin-finish").hidden = false;
    setHeadline("Finish", "signing in");
    $("signin-go").addEventListener("click", async () => {
      $("signin-go").disabled = true;
      error("");
      const r = await api("/api/auth/verify", { token });
      if (r.ok) location.assign(nextPage());
      else {
        error(r.data.error ?? "That didn't work. Ask for a new link.");
        $("signin-finish").hidden = true;
        $("signin-form").hidden = false;
        setHeadline("Sign in to", `${BRAND.name}.`);
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
      setHeadline("Check your", "inbox.");
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

const SIZE = 1200; // codes are drawn 1200px wide, like the home page
let currentPlan = "free";
const FREE_WARN = "Free codes stop working 14 days after you make them. Test them with your phone, but don't print them. Upgrade first: paid codes never expire.";

// Make | Domains | Account tabs. Arrow keys move between them; #account opens the account tab directly.
function initTabs() {
  const tabs = [...document.querySelectorAll('.dash-tabs [role="tab"]')];
  const select = (tab, focus = false) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = !on;
    }
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (step) select(tabs[(i + step + tabs.length) % tabs.length], true);
    });
  });
  if (location.hash === "#account") select($("tab-account"));
  return select;
}

// The QR dialog shows the same framed SVG the download makes, on white paper.
let qr = null;
let qrCode = null;
let previewUrl = null;
const qrOpts = () => ({ frame: document.querySelector('input[name="qr-frame"]:checked').value, label: $("qr-label").value, fg: "#000000", bg: "#ffffff" });

async function drawQr() {
  $("qr-label-box").hidden = qrOpts().frame === "none";
  const blob = await framedSvgBlob(qr, SIZE, qrOpts());
  const url = URL.createObjectURL(blob);
  $("qr-img").src = url;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = url;
}

async function showQr(code) {
  const { default: QRCodeStyling } = await import("qr-code-styling");
  if (!qr) {
    qr = new QRCodeStyling({ width: SIZE, height: SIZE, type: "svg", margin: quietZone(SIZE), data: code.url, qrOptions: { errorCorrectionLevel: "M" } });
    const name = () => `qrone-${qrCode.slug}`;
    document.querySelectorAll('input[name="qr-frame"]').forEach((r) => r.addEventListener("change", drawQr));
    $("qr-label").addEventListener("input", drawQr);
    $("qr-png").addEventListener("click", () => downloadFramed(qr, SIZE, qrOpts(), name(), "png"));
    $("qr-svg").addEventListener("click", () => downloadFramed(qr, SIZE, qrOpts(), name(), "svg"));
    $("qr-stickers").addEventListener("click", () => printStickers(qr, SIZE, qrOpts(), $("qr-sticker-size").value));
    $("qr-close").addEventListener("click", () => $("qr-dialog").close());
  }
  qrCode = code;
  qr.update({ data: code.url }); // the short link is plain ASCII, so no extra encoding is needed
  $("qr-title").textContent = code.label || "Your code";
  $("qr-url").textContent = code.url;
  $("qr-img").alt = `QR code for ${code.url}`;
  $("qr-stickers-box").hidden = currentPlan === "free"; // free codes expire, so no sticker sheets for them
  $("qr-free-warn").textContent = currentPlan === "free" ? FREE_WARN : "";
  await drawQr();
  $("qr-dialog").showModal();
}

// Deleting asks first, in a dialog that says what happens to printed copies.
function confirmDelete(code, reload) {
  const dialog = $("delete-dialog");
  $("del-name").textContent = code.label ? `${code.label} (${code.url})` : code.url;
  $("del-error").textContent = "";
  const confirmBtn = $("del-confirm").cloneNode(true); // drop any listener from a previous code
  $("del-confirm").replaceWith(confirmBtn);
  confirmBtn.addEventListener("click", async () => {
    confirmBtn.disabled = true;
    const r = await api(`/api/codes/${code.id}`, undefined, "DELETE");
    confirmBtn.disabled = false;
    if (!r.ok) {
      $("del-error").textContent = r.data.error ?? "That didn't delete. Please try again.";
      return;
    }
    dialog.close();
    reload("Code deleted.");
  });
  dialog.showModal();
  $("del-cancel").focus(); // the safe choice has focus
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

  const copy = async (e) => {
    try {
      await navigator.clipboard.writeText(code.url);
      e.target.textContent = "Copied";
      setTimeout(() => { e.target.textContent = "Copy"; }, 1500);
    } catch {
      error.textContent = `Copy this link: ${code.url}`;
    }
  };

  return el("li", { class: "code-row" },
    el("div", { class: "code-main" },
      el("p", { class: "code-name" }, code.label || "Untitled code"),
      el("p", { class: "code-link-row" },
        el("span", { class: "mono code-link" }, code.url.replace(/^https?:\/\//, "")), // shorter to read; Copy uses the full link
        el("button", { type: "button", class: "btn btn-quiet btn-small", onclick: copy }, "Copy"))),
    dest,
    el("span", { class: `code-state pill pill-${state.tone || "neutral"}` }, state.text),
    el("div", { class: "code-actions" },
      el("button", { type: "button", class: "btn", onclick: () => showQr(code) }, "QR code and print"),
      // Opens the short link itself, so it tests the whole path a scan takes.
      el("a", { class: "btn", href: code.url, target: "_blank", rel: "noopener noreferrer" }, "Open link ↗"),
      el("button", { type: "button", class: "btn", onclick: startEdit }, "Change destination"),
      el("button", { type: "button", class: "btn btn-quiet", onclick: () => confirmDelete(code, reload) }, "Delete")),
    error);
}

export async function initDashboard() {
  const r = await api("/api/me");
  if (r.status === 401) return location.replace("/signin.html");
  if (!r.ok) {
    $("dash-status").textContent = "We couldn't load your account. Please refresh the page.";
    return;
  }
  const selectTab = initTabs();
  $("dash-email").textContent = r.data.email;
  $("delete-email-shown").textContent = r.data.email;
  $("dashboard").hidden = false;
  $("delete-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("delete-error").textContent = "";
    $("delete-go").disabled = true;
    const gone = await api("/api/account", { email: $("delete-email").value }, "DELETE");
    if (gone.ok) return location.replace("/");
    $("delete-go").disabled = false;
    $("delete-error").textContent = gone.data.error ?? "That didn't work. Please try again.";
  });
  $("dash-logout").addEventListener("click", async () => {
    await api("/api/auth/logout", {});
    location.assign("/signin.html");
  });
  $("del-cancel").addEventListener("click", () => $("delete-dialog").close());
  $("dash-upgrade").addEventListener("click", () => {
    selectTab($("tab-account"));
    $("plan-panel").focus();
    $("plan-panel").scrollIntoView({ block: "start" });
  });

  async function reload(message = "") {
    const list = await api("/api/codes");
    if (list.status === 401) return location.replace("/signin.html");
    if (!list.ok) {
      $("dash-status").textContent = "We couldn't load your codes. Please refresh the page.";
      return;
    }
    const { codes, used, limit, planName, plan, now, upgrades } = list.data;
    currentPlan = plan;
    const paid = plan !== "free";
    $("dash-plan").textContent = `${planName} plan`;
    $("dash-plan").className = `pill ${paid ? "pill-ok" : "pill-neutral"}`;
    $("dash-usage").textContent = `${used} of ${limit} codes`;
    $("free-banner").hidden = paid;
    $("dash-upgrade").hidden = upgrades.length === 0;
    $("plan-panel").hidden = upgrades.length === 0;
    $("plan-options").replaceChildren(...upgrades.map((u) =>
      el("button", { type: "button", class: "btn", onclick: (e) => upgrade(u.plan, e.currentTarget) },
        `${u.name}: ${u.limit} codes, pay $${(u.price / 100).toFixed(u.price % 100 ? 2 : 0)}`)));
    $("code-note").textContent = paid ? "Your codes never expire." : "";
    $("code-create").disabled = used >= limit;
    $("code-error").textContent = used >= limit ? `You've used all ${limit} codes on the ${planName} plan. Delete one to make another.` : "";
    $("code-empty").hidden = codes.length > 0;
    $("code-list").hidden = codes.length === 0;
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
