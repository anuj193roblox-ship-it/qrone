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

  // Back from Google: the server already signed you in (or didn't).
  if (params.get("signed") === "1") {
    location.replace(nextPage());
    return;
  }
  if (params.get("error") === "google") {
    history.replaceState(null, "", location.pathname);
    error("Google sign-in didn't finish. Try again, or use your email.");
  }

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

  // The "are you a person?" check (Cloudflare Turnstile), shown only when the server has it switched on.
  let checkId = null;
  api("/api/session").then(({ data }) => {
    $("signin-google").hidden = data.google !== true;
    if (typeof data.checkKey !== "string") return;
    const script = el("script", { src: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" });
    script.onload = () => {
      // The full-size check needs 300px; narrow phones get the compact one. (The empty box itself is hidden, so measure the field.)
      const size = $("signin-email").clientWidth < 300 ? "compact" : "flexible";
      checkId = window.turnstile.render($("signin-check"), { sitekey: data.checkKey, size });
    };
    script.onerror = () => error("The check that keeps robots out didn't load. Turn off content blockers for this site, or try another browser.");
    document.head.append(script);
  });

  $("signin-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = e.submitter ?? $("signin-form").querySelector("button");
    button.disabled = true;
    error("");
    $("signin-msg").textContent = "Sending…";
    const check = checkId === null ? undefined : window.turnstile.getResponse(checkId);
    const r = await api("/api/auth/start", { email: $("signin-email").value, check });
    if (checkId !== null) window.turnstile.reset(checkId); // each solved check works once
    button.disabled = false;
    $("signin-msg").textContent = "";
    if (r.ok) {
      $("signin-msg").textContent = r.data.message;
      setHeadline("Check your", "inbox.");
      // Local testing only (the server sends these just on this computer): show the link instead of an email.
      const link = r.data.dev_link;
      if (typeof link === "string" && link.startsWith(`${location.origin}/signin?token=`)) {
        $("signin-msg").replaceChildren("Local testing: no email is sent. ", el("a", { href: link }, "Open your sign-in link"), ".");
      } else if (r.data.dev_note) {
        $("signin-msg").textContent = r.data.dev_note;
      }
    } else {
      error(r.data.error ?? "That didn't work. Please try again.");
    }
  });
}

// ---------- Dashboard ----------

// "in 5 hours" under two days, "in 3 days" after that.
function inTime(seconds) {
  if (seconds < 2 * 86400) {
    const h = Math.max(1, Math.ceil(seconds / 3600));
    return h === 1 ? "in 1 hour" : `in ${h} hours`;
  }
  return `in ${Math.ceil(seconds / 86400)} days`;
}

// Two dates can stop a code: the plan's expiry (free codes) and the end time the owner chose.
// Like the redirect server, the earlier one is what the label talks about.
function stateText(code, now) {
  if (code.disabled) return { text: "Switched off", tone: "bad" };
  const exp = code.expires_at;
  const end = code.ends_at;
  if (exp == null && end == null) return { text: "Never expires", tone: "ok" };
  const byOwner = end != null && (exp == null || end <= exp);
  const at = byOwner ? end : exp;
  if (at <= now) return { text: byOwner ? "Ended" : "Expired", tone: "bad" };
  return { text: `${byOwner ? "Ends" : "Expires"} ${inTime(at - now)}`, tone: at - now <= 3 * 86400 ? "warn" : "" };
}

// "Stop working" control, used when creating a code and when changing a code's end time.
// value(): undefined = invalid input, null = no end time, or Unix seconds.
function endsControl(prefix, current = null) {
  const mode = el("select", { id: `${prefix}-mode` },
    el("option", { value: "never" }, "Never (keeps working)"),
    el("option", { value: "after" }, "After a set time"),
    el("option", { value: "date" }, "On a date and time"));
  const amount = el("input", { id: `${prefix}-amount`, type: "number", min: "1", max: "3650", step: "1", value: "7", "aria-label": "How long" });
  const unit = el("select", { id: `${prefix}-unit`, "aria-label": "Hours or days" },
    el("option", { value: "3600" }, "hours"), el("option", { value: "86400", selected: "" }, "days"));
  const date = el("input", { id: `${prefix}-date`, type: "datetime-local", "aria-label": "End date and time" });
  const after = el("div", { class: "ends-after", hidden: "" }, amount, unit);
  const at = el("div", { class: "ends-date", hidden: "" }, date);
  if (current != null) {
    mode.value = "date";
    // datetime-local wants local time without a zone: shift by the time-zone offset before cutting the ISO text.
    const d = new Date(current * 1000);
    date.value = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  const sync = () => { after.hidden = mode.value !== "after"; at.hidden = mode.value !== "date"; };
  mode.addEventListener("change", sync);
  sync();
  const box = el("div", { class: "ends-control" },
    el("label", { for: `${prefix}-mode` }, "Stop working"),
    el("div", { class: "ends-row" }, mode, after, at));
  const value = () => {
    if (mode.value === "never") return null;
    if (mode.value === "after") {
      const n = Number(amount.value);
      return Number.isFinite(n) && n > 0 ? Math.floor(Date.now() / 1000) + Math.round(n * Number(unit.value)) : undefined;
    }
    const t = new Date(date.value).getTime(); // datetime-local is read in the visitor's own time zone
    return Number.isFinite(t) ? Math.floor(t / 1000) : undefined;
  };
  return { box, value };
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

  // Change or remove the end time, inline, in place of the action buttons.
  const startEnds = () => {
    const control = endsControl(`ends-${code.id}`, code.ends_at);
    const save = async (endsAt) => {
      if (endsAt === undefined) { error.textContent = "Pick a date and time, or a number of hours or days."; return; }
      const r = await api(`/api/codes/${code.id}`, { destination: code.destination, label: code.label, ends_at: endsAt }, "PATCH");
      if (r.ok) reload(endsAt == null ? "End time removed. The code keeps working." : "End time saved.");
      else error.textContent = r.data.error ?? "That didn't save. Please try again.";
    };
    const form = el("form", { class: "ends-form" }, control.box,
      el("div", { class: "actions" },
        el("button", { type: "submit", class: "btn" }, "Save end time"),
        el("button", { type: "button", class: "btn btn-quiet", onclick: () => form.replaceWith(actions) }, "Cancel")),
      el("p", { class: "hint" }, "You can change this any time, even after it ends: the printed code starts working again."));
    form.addEventListener("submit", (e) => { e.preventDefault(); error.textContent = ""; save(control.value()); });
    actions.replaceWith(form);
    form.querySelector("select").focus();
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

  const actions = el("div", { class: "code-actions" },
    el("button", { type: "button", class: "btn", onclick: () => showQr(code) }, "QR code and print"),
    // Opens the short link itself, so it tests the whole path a scan takes.
    el("a", { class: "btn", href: code.url, target: "_blank", rel: "noopener noreferrer" }, "Open link ↗"),
    el("button", { type: "button", class: "btn", onclick: startEdit }, "Change destination"),
    el("button", { type: "button", class: "btn", onclick: startEnds }, code.ends_at == null ? "Set end time" : "Change end time"),
    el("button", { type: "button", class: "btn btn-quiet", onclick: () => confirmDelete(code, reload) }, "Delete"));

  return el("li", { class: "code-row" },
    el("div", { class: "code-main" },
      el("p", { class: "code-name" }, code.label || "Untitled code"),
      el("p", { class: "code-link-row" },
        el("span", { class: "mono code-link" }, code.url.replace(/^https?:\/\//, "")), // shorter to read; Copy uses the full link
        el("button", { type: "button", class: "btn btn-quiet btn-small", onclick: copy }, "Copy"))),
    dest,
    el("span", { class: `code-state pill pill-${state.tone || "neutral"}` }, state.text),
    actions,
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

  // Optional end time on new codes: the control sits under the destination and name.
  const newEnds = endsControl("code-ends");
  $("code-ends-slot").replaceWith(newEnds.box);

  $("code-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("code-error").textContent = "";
    const endsAt = newEnds.value();
    if (endsAt === undefined) {
      $("code-error").textContent = "Pick a date and time, or a number of hours or days.";
      return;
    }
    $("code-create").disabled = true;
    const created = await api("/api/codes", { destination: $("code-dest").value, label: $("code-label").value, ends_at: endsAt });
    $("code-create").disabled = false;
    if (!created.ok) {
      $("code-error").textContent = created.data.error ?? "That didn't work. Please try again.";
      return;
    }
    $("code-dest").value = "";
    $("code-label").value = "";
    // Back to "Never", so the next code doesn't quietly get this one's end time.
    $("code-ends-mode").value = "never";
    $("code-ends-mode").dispatchEvent(new Event("change"));
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
