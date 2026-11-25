// Tool A: static QR generator. Everything runs in the browser.
import QRCodeStyling from "qr-code-styling";
import { buildData, qrText } from "./payload.js";
import { quietZone, cleanLabel, downloadFramed, printStickers } from "./frame.js";

const $ = (id) => document.getElementById(id);

// WCAG relative luminance, used to warn about colour pairs that are hard to scan.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function initGenerator() {
  let logo = ""; // data URL of the chosen logo, or "" for none

  const qr = new QRCodeStyling({
    width: 512,
    height: 512,
    type: "canvas",
    data: "https://example.com",
    margin: quietZone(512), // the blank border scanners need around the code
    // saveAsBlob: false stops the library loading the logo over XHR, which the site's security policy blocks.
    imageOptions: { saveAsBlob: false, hideBackgroundDots: true, imageSize: 0.3, margin: 4 },
  });
  qr.append($("gen-qr")); // its own box: the library empties it on every redraw
  const previewLabel = $("gen-preview-label"); // shown under the code, like the downloaded file
  let size = 512;
  const printOpts = () => ({ label: $("gen-label").value, fg: $("gen-fg").value, bg: $("gen-bg").value });

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

  const form = $("gen-form");

  function refresh() {
    const type = form.elements["gen-type"].value; // the checked Link / Text / Wi-Fi / Email radio
    document.querySelectorAll("[data-fields]").forEach((el) => { el.hidden = el.dataset.fields !== type; });

    const result = buildData(type, values());
    $("gen-msg").textContent = result.error ?? "";

    const ok = Boolean(result.data);
    $("gen-result").hidden = !ok;
    $("gen-placeholder").hidden = ok;

    const fg = $("gen-fg").value;
    const bg = $("gen-bg").value;
    const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
    const ratio = (hi + 0.05) / (lo + 0.05);
    $("gen-contrast").textContent = luminance(fg) > luminance(bg)
      ? "Light code on a dark background: some phone cameras can't read these. Test before printing."
      : ratio < 3 ? "Low contrast: this code may be hard to scan. Pick a darker code colour or a lighter background." : "";

    // A logo hides part of the code, so force the highest error correction so it still scans.
    $("gen-ec").disabled = Boolean(logo);
    $("gen-logo-clear").hidden = !logo;
    $("gen-logo-note").textContent = logo ? "Logo added. Using High error correction so the code still scans." : "";

    const label = cleanLabel($("gen-label").value);
    previewLabel.textContent = label;
    previewLabel.hidden = !label;
    previewLabel.style.color = fg;
    previewLabel.style.backgroundColor = bg;

    if (!ok) return;
    size = Math.min(1000, Math.max(200, Number($("gen-size").value) || 512));
    qr.update({
      data: qrText(result.data), // UTF-8, so accents and other scripts scan correctly
      width: size,
      height: size,
      margin: quietZone(size),
      image: logo,
      qrOptions: { errorCorrectionLevel: logo ? "H" : $("gen-ec").value },
      dotsOptions: { color: fg },
      backgroundOptions: { color: bg },
    });
  }

  form.addEventListener("input", refresh);
  form.addEventListener("change", refresh);
  form.addEventListener("submit", (e) => e.preventDefault());

  $("gen-logo").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { logo = String(reader.result); refresh(); };
    reader.readAsDataURL(file);
  });
  $("gen-logo-clear").addEventListener("click", () => { logo = ""; $("gen-logo").value = ""; refresh(); });

  $("gen-png").addEventListener("click", () => downloadFramed(qr, size, printOpts(), "qr-code", "png"));
  $("gen-svg").addEventListener("click", () => downloadFramed(qr, size, printOpts(), "qr-code", "svg"));
  $("gen-stickers").addEventListener("click", () => printStickers(qr, size, printOpts(), $("gen-sticker-size").value));

  // The checker can send a final destination here ("make a static replacement").
  function prefill(url) {
    $("tab-make")?.click(); // switch to the Make tab if we're on Check
    form.elements["gen-type"].value = "url";
    $("gen-url").value = url;
    refresh();
    $("gen-url").focus();
  }
  document.addEventListener("prefill-url", (e) => prefill(e.detail));

  const fromLink = new URLSearchParams(location.search).get("url");
  if (fromLink) prefill(fromLink);
  else refresh();
}
