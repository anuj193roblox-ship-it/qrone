// Tool B: "Will my QR code die?" checker.
// Privacy rule: the image is decoded on this device. There is no fetch() or upload anywhere in this file.
// Security rule: decoded text can contain anything, so it is only ever shown with textContent
// (via el() below). Never use innerHTML here.
import { classify } from "./classify.js";
import vendors from "./data/vendor-domains.json";

const $ = (id) => document.getElementById(id);
const MAX_SIDE = 1600; // very large photos are shrunk first; it is faster and often reads better

// Tiny helper to build elements safely. Strings become text nodes, never HTML.
function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  node.append(...kids.filter((k) => k !== null && k !== undefined));
  return node;
}

// Try the image at full size, then smaller. Photos of printed codes sometimes read better shrunk.
async function decodeImage(file) {
  // Loaded only when someone actually checks an image, so the page itself stays light.
  const { default: jsQR } = await import("jsqr");
  const bitmap = await createImageBitmap(file);
  try {
    const fit = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    for (const scale of [1, 0.5, 0.25]) {
      const w = Math.max(1, Math.round(bitmap.width * fit * scale));
      const h = Math.max(1, Math.round(bitmap.height * fit * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(bitmap, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      const code = jsQR(data, w, h, { inversionAttempts: "attemptBoth" });
      if (code) return code.data;
    }
    return null;
  } finally {
    bitmap.close();
  }
}

const ADVICE = {
  paid: "Already paying? Keep the subscription active, and ask the vendor whether your codes can be exported.",
  notPrinted: "Haven't printed yet? Make a static code instead, on the Make a code tab. It can't be switched off.",
  printed: "Already printed? Plan a sticker or a reprint, and make a static replacement code first.",
};

function replacementForm() {
  const input = el("input", { id: "repl-url", type: "text", inputmode: "url", placeholder: "example.com/menu", spellcheck: "false" });
  const form = el("form", { class: "inline-form" },
    el("label", { for: "repl-url" }, "New code's destination"),
    el("p", { class: "hint repl-hint" }, "Enter the final page address. We can't follow the vendor's redirect for you."),
    el("div", { class: "pair pair-tight" }, input, el("button", { type: "submit", class: "btn" }, "Make a static code")));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value.trim()) document.dispatchEvent(new CustomEvent("prefill-url", { detail: input.value.trim() }));
  });
  return form;
}

function render(result) {
  const out = $("chk-result");
  out.replaceChildren();

  const view = {
    static: { tone: "ok", pill: "Looks static", title: "No vendor in the middle" },
    vendor: { tone: "bad", pill: "Vendor-controlled", title: "This code can be switched off" },
    "unknown-short": { tone: "warn", pill: "Unknown short link", title: "It could be switched off" },
    "not-url": { tone: "ok", pill: "Not a web link", title: "Nothing to switch off" },
  }[result.kind];

  const card = el("div", { class: `verdict verdict-${view.tone}` },
    el("span", { class: `pill pill-${view.tone}` }, view.pill),
    el("h3", {}, view.title),
    el("p", { class: "label" }, "The code says"),
    // For links, show the parsed URL: it escapes invisible direction-flipping characters
    // that could make "evil.com" display as something trustworthy.
    el("pre", { class: "decoded" }, result.url ?? (result.content || "(empty)")));

  if (result.kind === "static") {
    card.append(el("p", {}, `This code points straight at ${result.host}. We don't recognise it as a QR-vendor short link, so no QR company appears to sit in the middle. We can't see what the page itself does once it opens.`));
  }

  if (result.kind === "vendor") {
    const v = result.vendor;
    card.append(
      el("p", {}, `This code goes through ${v.domain}, a short link run by ${v.vendor}. The vendor, not you, controls where it points.`),
      el("p", {}, v.behaviour),
      el("p", {}, el("a", { href: v.evidence_url, target: "_blank", rel: "noopener noreferrer" }, `Source: the vendor's own page (opens in a new tab)`)),
      el("h4", {}, "What you can do"),
      el("ul", {}, el("li", {}, ADVICE.paid), el("li", {}, ADVICE.notPrinted), el("li", {}, ADVICE.printed)),
      replacementForm(),
    );
  }

  if (result.kind === "unknown-short") {
    card.append(
      el("p", {}, `This code goes through ${result.host}, which looks like a link shortener or redirect service. It isn't on our list, so we can't say who runs it or what happens if an account or trial ends. Whoever controls that link can change it or turn it off.`),
      el("h4", {}, "What you can do"),
      el("ul", {},
        el("li", {}, "If you made this code, check the account behind it and what its plan says about when codes stop working."),
        el("li", {}, ADVICE.notPrinted), el("li", {}, ADVICE.printed)),
      replacementForm(),
    );
  }

  if (result.kind === "not-url") {
    card.append(el("p", {}, "This code holds plain content, such as text, Wi-Fi details or a contact card. Nothing is redirected, so there is nothing a vendor could switch off."));
  }

  // The link is shown as text first. We never open it automatically.
  if (result.url) {
    card.append(el("p", { class: "hint" }, "Open it only if you trust it: ",
      el("a", { href: result.url, target: "_blank", rel: "noopener noreferrer" }, "open this link (leaves this site)")));
  }

  out.append(card);
  out.focus({ preventScroll: true });
  if (window.matchMedia("(max-width: 719px)").matches) {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    out.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }
}

async function handleFile(file) {
  const status = $("chk-status");
  if (!file || !file.type.startsWith("image/")) {
    status.textContent = "That doesn't look like an image. Try a PNG, JPG or screenshot.";
    return;
  }
  status.textContent = "Reading the image on your device…";
  $("chk-result").replaceChildren();
  try {
    const text = await decodeImage(file);
    if (text === null) {
      status.textContent = "We couldn't find a QR code in that image. Try a closer, flatter, well-lit photo with the whole code in view, or a screenshot.";
      return;
    }
    status.textContent = "";
    render(classify(text, vendors));
  } catch {
    status.textContent = "We couldn't open that image. Try a PNG or JPG.";
  }
}

export function initChecker() {
  const drop = $("chk-drop");
  $("chk-file").addEventListener("change", (e) => { handleFile(e.target.files[0]); e.target.value = ""; });

  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));
  drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("chk-file").click(); } });

  document.addEventListener("paste", (e) => {
    const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
    if (item) handleFile(item.getAsFile());
  });

  $("chk-url-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const typed = $("chk-url").value.trim();
    if (!typed) return;
    // A person typing "qrco.de/abc" means a web address; a camera would have read the full https:// form.
    const text = /^[a-z][a-z0-9+.-]*:/i.test(typed) ? typed : "https://" + typed;
    $("chk-status").textContent = "";
    render(classify(text, vendors));
  });
}
