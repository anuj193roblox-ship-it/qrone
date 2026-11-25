import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classify } from "../src/classify.js";

const vendors = JSON.parse(readFileSync(new URL("../src/data/vendor-domains.json", import.meta.url), "utf8"));
const kind = (text, list = vendors) => classify(text, list).kind;

test("vendor domain is flagged and carries its evidence", () => {
  const r = classify("https://qrco.de/abc123", vendors);
  assert.equal(r.kind, "vendor");
  assert.equal(r.vendor.vendor, "QR Code Generator PRO");
  assert.match(r.vendor.evidence_url, /^https:\/\//);
});

test("vendor matching ignores case, scheme and trailing path", () => {
  assert.equal(kind("HTTPS://QRCO.DE/AbC"), "vendor");
  assert.equal(kind("http://qrco.de/abc?x=1#y"), "vendor");
  assert.equal(kind("https://qrco.de"), "vendor");
  assert.equal(kind("https://qrco.de./abc"), "vendor"); // trailing dot in hostname
  assert.equal(kind("  https://qrco.de/abc \n"), "vendor"); // stray whitespace
});

test("subdomains of a vendor domain match", () => {
  assert.equal(kind("https://l.ead.me/xyz"), "vendor");
  assert.equal(kind("https://go.qrco.de/xyz"), "vendor");
});

test("look-alike domains do NOT match", () => {
  assert.equal(kind("https://evil-qrco.de/abc"), "static");
  assert.equal(kind("https://qrco.de.evil.com/abc"), "static");
  assert.equal(kind("https://qrco.de@example.com/abc"), "static"); // real host is example.com
});

test("a normal website is static", () => {
  assert.equal(kind("https://example.com"), "static");
  assert.equal(kind("https://example.com/menu?table=4"), "static");
});

test("known shorteners without vendor evidence are 'unknown-short'", () => {
  assert.equal(kind("https://bit.ly/3abcde"), "unknown-short");
  assert.equal(kind("https://www.tinyurl.com/x"), "unknown-short");
});

test("a vendor entry not yet verified is never called vendor-controlled", () => {
  const list = [{ domain: "qr.example", vendor: "Example", evidence_url: "https://e.x", behaviour: "x", verified: false }];
  assert.equal(kind("https://qr.example/a", list), "unknown-short");
});

test("non-web content is 'not-url'", () => {
  for (const text of [
    "",
    "hello world",
    "example.com", // no scheme: a phone treats it as text
    "mailto:a@b.com",
    "tel:+15551234567",
    "WIFI:T:WPA;S:Cafe;P:secret;;",
    "BEGIN:VCARD\nVERSION:3.0\nEND:VCARD",
    "javascript:alert(1)",
    "ftp://example.com/file",
  ]) {
    assert.equal(kind(text), "not-url", JSON.stringify(text));
  }
});

test("missing input does not throw", () => {
  assert.equal(kind(undefined), "not-url");
  assert.equal(kind(null), "not-url");
});
