// End to end without a browser: payload text -> QR pattern -> pixels -> jsQR -> classify.
// qrcode-generator is the encoder qr-code-styling uses inside (installed with it), with the same
// default byte handling. jsQR is the exact decoder the checker uses.
// It does not test colours, dot styles or logos; scan a printed code with a phone for that.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import qrcode from "qrcode-generator";
import jsQRModule from "jsqr";
import { buildData, qrText } from "../src/payload.js";
import { classify } from "../src/classify.js";

const jsQR = jsQRModule.default ?? jsQRModule;
const vendors = JSON.parse(readFileSync(new URL("../src/data/vendor-domains.json", import.meta.url), "utf8"));

// Draw the code as black/white RGBA pixels (4px per module, 4-module quiet zone) and read it back.
function encodeThenDecode(text) {
  const qr = qrcode(0, "M");
  qr.addData(qrText(text), "Byte");
  qr.make();
  const n = qr.getModuleCount(), px = 4, quiet = 4, size = (n + 2 * quiet) * px;
  const rgba = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!qr.isDark(r, c)) continue;
    for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
      const i = (((r + quiet) * px + y) * size + (c + quiet) * px + x) * 4;
      rgba[i] = rgba[i + 1] = rgba[i + 2] = 0;
    }
  }
  return jsQR(rgba, size, size)?.data ?? null;
}

const base = { url: "", text: "", ssid: "", wifiPass: "", wifiSec: "WPA", wifiHidden: false, mailTo: "", mailSubject: "", mailBody: "" };
const payload = (type, v) => buildData(type, { ...base, ...v }).data;

test("a generated link code decodes to the same address and is called static", () => {
  const data = payload("url", { url: "example.com/menu?table=4" });
  const read = encodeThenDecode(data);
  assert.equal(read, data);
  assert.equal(classify(read, vendors).kind, "static");
});

test("a vendor short link survives encoding and is still flagged", () => {
  assert.equal(classify(encodeThenDecode("https://qrco.de/abc123"), vendors).kind, "vendor");
});

test("Wi-Fi escaping survives encoding byte for byte", () => {
  const data = payload("wifi", { ssid: "My;Net", wifiPass: 'p:a"ss,\\' });
  assert.equal(encodeThenDecode(data), data);
});

test("an email code survives encoding", () => {
  const data = payload("email", { mailTo: "a@b.com", mailSubject: "Hi there", mailBody: "A&B" });
  assert.equal(encodeThenDecode(data), data);
});

test("non-English text survives encoding (Café, 日本, emoji)", () => {
  for (const text of ["Café", "日本語のメニュー", "Wi-Fi ☕"]) {
    assert.equal(encodeThenDecode(payload("text", { text })), text);
  }
});
