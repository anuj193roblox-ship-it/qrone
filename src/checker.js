// The /check page: "Will my QR code stop working?"
// Privacy rule: the image is decoded on this device. There is no fetch() or upload anywhere in this file.
// Security rule: decoded text can contain anything, so it is only ever shown with textContent
// (via el() below). Never use innerHTML here.
import { classify } from "./classify.js";
import vendors from "./data/vendor-domains.json";
import { buildData, qrText } from "./payload.js";
import { quietZone, frameLayout, framedSvgBlob, downloadFramed, printStickers, stickerLayout, STICKER_SIZES } from "./frame.js";

const $ = (id) => document.getElementById(id);
const MAX_SIDE = 1600; // very large photos are shrunk first; it is faster and often reads better
const SIZE = 1200; // replacement codes are drawn 1200px wide, like the home page

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

// Try the image at full size, then smaller. Photos of printed codes often read better shrunk.
// jsQR works on brightness and tries the inverted image too, so colour photos need no extra step.
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

// ---------- Rescue: a static replacement code, made right here ----------

// Sticker counts depend on the caption, which makes each sticker taller.
function stickerOptions(select, caption) {
  const aspect = caption ? frameLayout(SIZE, "pill", caption).h / SIZE : 1;
  const names = { "1": "1 inch (2.5 cm)", "1.5": "1.5 inches (3.8 cm)", "2": "2 inches (5 cm)" };
  for (const opt of select.options) opt.textContent = `${names[opt.value]}, ${stickerLayout(STICKER_SIZES[opt.value], aspect).count} per sheet`;
}

function rescueBlock() {
  const input = el("input", { id: "repl-url", type: "text", inputmode: "url", placeholder: "yourshop.com/menu", spellcheck: "false" });
  const error = el("p", { class: "msg-error", role: "alert" });
  const make = el("button", { type: "button", class: "btn btn-primary" }, "Make a permanent static replacement");
  const stickersBtn = el("button", { type: "button", class: "btn" }, "Print rescue stickers");
  const out = el("div", { class: "rescue-out", hidden: "" });

  let qr = null;
  const opts = () => ({ frame: "pill", label: caption.value, fg: "#000000", bg: "#ffffff" });

  // The sticker drawer: size and an optional caption under each sticker.
  const size = el("select", { id: "repl-size" },
    el("option", { value: "1" }), el("option", { value: "1.5", selected: "" }), el("option", { value: "2" }));
  const caption = el("input", { id: "repl-caption", type: "text", maxlength: "24", placeholder: "Scan for the menu" });
  const print = el("button", { type: "button", class: "btn" }, "Print or save as PDF");
  const drawer = el("div", { class: "sticker-drawer", hidden: "" },
    el("h4", {}, "Rescue sticker sheet"),
    el("p", { class: "hint" }, "Print on full-page sticker paper and stick one over each old code. Fits US Letter and A4; pick your paper in the print window."),
    el("label", { for: "repl-size" }, "Sticker size"), size,
    el("label", { for: "repl-caption" }, "Caption under each sticker (optional)"), caption,
    el("div", { class: "actions" }, print),
    el("p", { class: "hint" }, "Print one sheet on plain paper first and scan a sticker with your phone."));
  stickerOptions(size, "");

  async function build() {
    error.textContent = "";
    const result = buildData("url", { url: input.value });
    if (!result.data) {
      error.textContent = result.error ?? "Enter the address the code should open, like yourshop.com/menu.";
      return false;
    }
    input.value = result.data; // show exactly what goes into the code
    const { default: QRCodeStyling } = await import("qr-code-styling");
    qr ??= new QRCodeStyling({ width: SIZE, height: SIZE, type: "svg", margin: quietZone(SIZE), data: "x" });
    qr.update({ data: qrText(result.data) });
    const url = URL.createObjectURL(await framedSvgBlob(qr, SIZE, { frame: "none" }));
    const svg = el("button", { type: "button", class: "btn btn-primary" }, "Download SVG (best for print)");
    const png = el("button", { type: "button", class: "btn" }, "Download PNG");
    svg.addEventListener("click", () => downloadFramed(qr, SIZE, { frame: "none" }, "qrone-replacement", "svg"));
    png.addEventListener("click", () => downloadFramed(qr, SIZE, { frame: "none" }, "qrone-replacement", "png"));
    out.replaceChildren(
      el("div", { class: "paper paper-small" }, el("img", { src: url, alt: `Replacement QR code for ${result.data}`, width: "240", height: "240" })),
      el("div", { class: "rescue-side" },
        el("p", {}, el("span", { class: "pill pill-ok" }, "Static · never expires")),
        el("p", { class: "hint" }, "Scan it with your phone before you print."),
        el("div", { class: "actions" }, svg, png)));
    out.hidden = false;
    make.classList.remove("btn-primary"); // one blue button at a time: the download is the next step
    return true;
  }

  make.addEventListener("click", build);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); build(); } });
  stickersBtn.addEventListener("click", async () => {
    if (!(await build())) return;
    drawer.hidden = false;
    size.focus();
  });
  caption.addEventListener("input", () => stickerOptions(size, caption.value.trim()));
  print.addEventListener("click", () => printStickers(qr, SIZE, opts(), size.value));

  return el("div", { class: "rescue" },
    el("h4", {}, "Rescue your printed stock"),
    el("p", {}, "Make a static code that goes straight to your page, then print stickers to cover the old codes."),
    el("label", { for: "repl-url" }, "Where should this code actually go?"),
    input,
    el("p", { class: "hint" }, "Enter the final page address. We can't follow the vendor's redirect for you."),
    error,
    el("div", { class: "actions" }, make, stickersBtn),
    out,
    drawer);
}

// ---------- Verdict ----------

function copyButton(text) {
  const button = el("button", { type: "button", class: "btn btn-quiet btn-small" }, "Copy text");
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied";
    } catch {
      button.textContent = "Select the text above to copy it";
    }
  });
  return button;
}

function render(result) {
  const out = $("chk-result");
  out.replaceChildren();

  const view = {
    static: { tone: "ok", pill: "Looks static", title: "This code points straight at its destination." },
    vendor: { tone: "bad", pill: "Vendor-controlled", title: `This code goes through ${result.vendor?.vendor}.` },
    "unknown-short": { tone: "warn", pill: "Unknown short link", title: "This code uses a short link we haven't verified yet." },
    "not-url": { tone: "neutral", pill: "Not a web link", title: "This code holds text or details, not a link, so nothing can expire." },
  }[result.kind];

  // For links, show the parsed URL: it escapes invisible direction-flipping characters
  // that could make "evil.com" display as something trustworthy.
  const shown = result.url ?? (result.content || "(empty)");
  const card = el("div", { class: `verdict verdict-${view.tone}` },
    el("span", { class: `pill pill-${view.tone}` }, view.pill),
    el("h3", {}, view.title),
    el("p", { class: "label" }, "The code says"),
    el("pre", { class: "decoded" }, shown),
    el("div", { class: "decoded-actions" },
      copyButton(shown),
      // The link is shown as text first and never opened automatically; this is an explicit, labelled choice.
      result.url ? el("a", { href: result.url, target: "_blank", rel: "noopener noreferrer" }, "Open it (leaves this site)") : null));

  if (result.kind === "static") {
    card.append(el("p", {}, `It points straight at ${result.host}. We don't recognise that as a QR-vendor short link, so no QR company appears to sit in the middle. We can't see what the page itself does once it opens.`));
  }

  if (result.kind === "vendor") {
    const v = result.vendor;
    card.append(
      el("p", {}, `${v.domain} is a short link run by ${v.vendor}. The vendor, not you, controls where it points.`),
      el("p", {}, v.behaviour),
      el("p", {}, el("a", { href: v.evidence_url, target: "_blank", rel: "noopener noreferrer" }, `Source: ${v.vendor}'s own page ↗`)),
      el("p", { class: "hint" }, "Already paying? Keep the plan active, and ask the vendor whether you can export your codes."),
      rescueBlock(),
    );
  }

  if (result.kind === "unknown-short") {
    card.append(
      el("p", {}, `${result.host} looks like a link shortener or redirect service. It isn't on our verified list, so we can't say who runs it or what happens when an account or trial ends. Whoever controls it can change it or turn it off.`),
      rescueBlock(),
    );
  }

  if (result.kind === "not-url") {
    card.append(el("p", {}, "It holds plain content, such as text, Wi-Fi details or a contact card. Nothing is redirected, so there is nothing a vendor could switch off."));
  }

  out.append(card);
  out.focus({ preventScroll: true });
  if (window.matchMedia("(max-width: 959px)").matches) {
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

  // A screenshot pasted anywhere on the page is checked straight away.
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

  // /check?q=... checks that link on load. The form also submits this way if pressed before this script runs.
  const q = new URLSearchParams(location.search).get("q");
  if (q) { $("chk-url").value = q; $("chk-url-form").requestSubmit(); }
}
