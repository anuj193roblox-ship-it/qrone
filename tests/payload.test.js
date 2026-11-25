import test from "node:test";
import assert from "node:assert/strict";
import { buildData } from "../src/payload.js";

const base = { url: "", text: "", ssid: "", wifiPass: "", wifiSec: "WPA", wifiHidden: false, mailTo: "", mailSubject: "", mailBody: "" };
const build = (type, v) => buildData(type, { ...base, ...v });

test("url: stored exactly as typed, scheme added when missing", () => {
  assert.deepEqual(build("url", { url: "https://example.com/menu" }), { data: "https://example.com/menu" });
  assert.deepEqual(build("url", { url: " example.com/menu " }), { data: "https://example.com/menu" });
});

test("url: empty is not an error, junk is", () => {
  assert.deepEqual(build("url", { url: "  " }), { empty: true });
  assert.ok(build("url", { url: "hello world" }).error);
  assert.ok(build("url", { url: "localhost" }).error);
});

test("wifi: special characters are escaped", () => {
  const r = build("wifi", { ssid: 'My;Net', wifiPass: 'p:a"ss,\\' });
  assert.equal(r.data, 'WIFI:T:WPA;S:My\\;Net;P:p\\:a\\"ss\\,\\\\;H:false;;');
});

test("wifi: open network has no password field, secured one needs it", () => {
  assert.equal(build("wifi", { ssid: "Cafe", wifiSec: "nopass" }).data, "WIFI:T:nopass;S:Cafe;H:false;;");
  assert.ok(build("wifi", { ssid: "Cafe" }).error);
});

test("email: mailto with encoded subject and body", () => {
  assert.equal(build("email", { mailTo: "a@b.com" }).data, "mailto:a@b.com");
  assert.equal(
    build("email", { mailTo: "a@b.com", mailSubject: "Hi there", mailBody: "A&B" }).data,
    "mailto:a@b.com?subject=Hi%20there&body=A%26B",
  );
  assert.ok(build("email", { mailTo: "nope" }).error);
});
