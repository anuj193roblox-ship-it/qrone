// Home page QR studio: a static code maker. Everything runs in the browser; nothing is sent anywhere.
import QRCodeStyling from "qr-code-styling";
import { buildData, qrText } from "./payload.js";
import { quietZone, colour, framedSvgBlob, downloadFramed, printStickers } from "./frame.js";
import { measure, verdict, tipFor } from "./scanmeter.js";

const $ = (id) => document.getElementById(id);

// The code is drawn 1200px wide: the PNG stays sharp printed up to 4 inches at 300 dpi, and the SVG at any size.
const SIZE = 1200;
const TEXT_WARN = 300; // longer text makes a dense code that cheap cameras struggle with

// Shown until something is typed, so the preview is never an empty box. Downloads stay off meanwhile.
const EXAMPLES = {
  url: "https://yourshop.com/menu",
  wifi: "WIFI:T:WPA;S:Your Cafe;P:password;H:false;;",
  text: "Thanks for visiting!",
  email: "mailto:hello@yourshop.com",
};

// WCAG relative luminance and contrast ratio.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

export function initGenerator() {
  const form = $("gen-form");
  let logo = ""; // data URL of the chosen logo, or "" for none
  let ready = false; // true once real content is typed

  const qr = new QRCodeStyling({
    width: SIZE,
    height: SIZE,
    type: "svg",
    data: EXAMPLES.url,
    margin: quietZone(SIZE), // the blank border scanners need around the code
    // saveAsBlob: false stops the library loading the logo over XHR, which the site's security policy blocks.
    imageOptions: { saveAsBlob: false, hideBackgroundDots: true, imageSize: 0.3, margin: 8 },
  });

  const fg = () => colour($("gen-fg").value, "#000000");
  const bg = () => colour($("gen-bg").value, "#ffffff");
  const opts = () => ({ frame: form.elements["gen-frame"].value, label: $("gen-label").value, fg: fg(), bg: bg() });

  const values = () => ({
    url: $("gen-url").value,
    text: $("gen-text").value,
    ssid: $("gen-ssid").value,
    wifiSec: $("gen-wifi-sec").value,
    wifiPass: $("gen-wifi-pass").value,
    wifiHidden: $("gen-wifi-hidden").checked,
    mailTo: $("gen-mail-to").value,
    mailSubject: $("gen-mail-subject").value,
    mailBody: $("gen-mail-body").value,
  });

  // The preview is the same framed SVG the download makes, shown as an image (never inserted as markup).
  let previewUrl = null;
  let drawing = 0;
  let timer = 0;
  let current = { text: EXAMPLES.url, dots: "square", logo: false, lowContrast: false }; // what the meter checks against
  async function drawPreview() {
    const n = ++drawing;
    const blob = await framedSvgBlob(qr, SIZE, opts());
    if (n !== drawing) return; // a newer change is already on its way
    const url = URL.createObjectURL(blob);
    $("gen-img").src = url;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = url;
    runMeter(url, n);
  }

  // Scan meter: once the preview settles, read it back under tough conditions.
  let meterTimer = 0;
  function runMeter(url, n) {
    $("gen-scan-badge").textContent = "Checking…";
    $("gen-scan-badge").className = "pill pill-neutral";
    clearTimeout(meterTimer);
    meterTimer = setTimeout(async () => {
      let results;
      try {
        results = await measure(url, current.text, qrText(current.text));
      } catch {
        return; // a newer preview replaced this image while it loaded
      }
      if (n !== drawing) return;
      const passed = results.filter((r) => r.ok).length;
      const v = verdict(passed);
      $("gen-scan-badge").textContent = `${v.text} · ${passed}/${results.length}`;
      $("gen-scan-badge").className = `pill pill-${v.tone}`;
      $("gen-scan-tests").replaceChildren(...results.map((r) => {
        const li = document.createElement("li");
        li.className = r.ok ? "pass" : "fail";
        li.textContent = `${r.ok ? "✓" : "✗"} ${r.name}`;
        return li;
      }));
      $("gen-scan-tip").textContent = tipFor(results.filter((r) => !r.ok).map((r) => r.id), current);
    }, 250);
  }

  function refresh() {
    const type = form.elements["gen-type"].value;
    document.querySelectorAll("[data-fields]").forEach((el) => { el.hidden = el.dataset.fields !== type; });

    const n = $("gen-text").value.length;
    $("gen-text-count").textContent = n ? `${n} characters${n > TEXT_WARN ? ". Long text makes a dense code that's hard to scan; keep it under 300 if you can." : ""}` : "";
    $("gen-text-count").className = n > TEXT_WARN ? "msg-warn" : "hint";

    const result = buildData(type, values());
    ready = Boolean(result.data);
    $("gen-msg").textContent = result.error ?? "";
    $("gen-example").hidden = ready;
    $("gen-svg").disabled = $("gen-png").disabled = $("gen-stickers").disabled = !ready;
    $("gen-note").textContent = ready
      ? "Scan the preview with your phone camera before you print."
      : "This is an example. Type your own details to make your code.";

    // Colour checks: light-on-dark codes and low contrast both fail on some phones.
    const ratio = contrast(fg(), bg());
    const inverted = luminance(fg()) > luminance(bg());
    const low = ratio < 4.5;
    $("gen-contrast").textContent = inverted
      ? "Light code on a dark background: some phone cameras can't read these. Test before printing."
      : low ? `Low contrast (${ratio.toFixed(1)}:1). Phones may struggle to scan this on paper.` : "";
    const risky = inverted || low;
    $("gen-contrast-badge").textContent = risky ? "Low contrast" : "Print-safe contrast";
    $("gen-contrast-badge").className = `pill ${risky ? "pill-warn" : "pill-ok"}`;

    $("gen-label-box").hidden = form.elements["gen-frame"].value === "none";

    // A logo hides part of the code, so force the highest error correction so it still scans.
    $("gen-ec").disabled = Boolean(logo);
    $("gen-logo-clear").hidden = !logo;
    $("gen-logo-note").textContent = logo ? "Error correction set to High so your logo doesn't block scanning." : "";

    const text = result.data ?? EXAMPLES[type];
    const dots = $("gen-dots").value;
    const corners = $("gen-corners").value;
    current = { text, dots, logo: Boolean(logo), lowContrast: risky };
    qr.update({
      data: qrText(text), // UTF-8, so accents and other scripts scan correctly
      image: logo,
      qrOptions: { errorCorrectionLevel: logo ? "H" : $("gen-ec").value },
      dotsOptions: { color: fg(), type: dots },
      cornersSquareOptions: { color: fg(), type: corners },
      cornersDotOptions: { color: fg(), type: corners === "dot" ? "dot" : "square" },
      backgroundOptions: { color: bg() },
    });
    clearTimeout(timer);
    timer = setTimeout(drawPreview, 60); // typing fast redraws once, not on every key
  }

  form.addEventListener("input", refresh);
  form.addEventListener("change", refresh);
  form.addEventListener("submit", (e) => e.preventDefault());

  // "yourshop.com/menu" becomes "https://yourshop.com/menu" when you leave the field, so you see what is encoded.
  $("gen-url").addEventListener("blur", (e) => {
    const v = e.target.value.trim();
    if (v && !/^[a-z][a-z0-9+.-]*:/i.test(v)) { e.target.value = `https://${v}`; refresh(); }
  });

  // Colour picker and hex box stay in step; presets set both.
  for (const key of ["fg", "bg"]) {
    const picker = $(`gen-${key}`);
    const hex = $(`gen-${key}-hex`);
    picker.addEventListener("input", () => { hex.value = picker.value; });
    hex.addEventListener("input", () => {
      const v = hex.value.trim().startsWith("#") ? hex.value.trim() : `#${hex.value.trim()}`;
      if (/^#[0-9a-f]{6}$/i.test(v)) picker.value = v.toLowerCase();
    });
  }
  form.querySelectorAll("[data-colour]").forEach((b) => b.addEventListener("click", () => {
    $("gen-fg").value = $("gen-fg-hex").value = b.dataset.colour;
    refresh();
  }));
  form.querySelectorAll("[data-label]").forEach((b) => b.addEventListener("click", () => {
    $("gen-label").value = b.dataset.label;
    refresh();
  }));

  $("gen-logo").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { logo = String(reader.result); refresh(); };
    reader.readAsDataURL(file);
  });
  $("gen-logo-clear").addEventListener("click", () => { logo = ""; $("gen-logo").value = ""; refresh(); });

  $("gen-svg").addEventListener("click", () => ready && downloadFramed(qr, SIZE, opts(), "qrone-code", "svg"));
  $("gen-png").addEventListener("click", () => ready && downloadFramed(qr, SIZE, opts(), "qrone-code", "png"));
  $("gen-stickers").addEventListener("click", () => ready && printStickers(qr, SIZE, opts(), $("gen-sticker-size").value));

  // The checker's "make a static replacement" sends people here with ?url=.
  const fromLink = new URLSearchParams(location.search).get("url");
  if (fromLink) {
    form.elements["gen-type"].value = "url";
    $("gen-url").value = fromLink;
  }
  refresh();
  if (fromLink) $("gen-url").focus();
}
