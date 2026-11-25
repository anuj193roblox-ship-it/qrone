// Data check for src/data/vendor-domains.json.
// A typo here never crashes anything: the checker just silently stops recognising a vendor,
// or shows a broken "Source" link. These tests catch that.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classify } from "../src/classify.js";

const vendors = JSON.parse(readFileSync(new URL("../src/data/vendor-domains.json", import.meta.url), "utf8"));
const isHttps = (s) => typeof s === "string" && s.startsWith("https://") && URL.canParse(s);

test("the vendor list is a non-empty array", () => {
  assert.ok(Array.isArray(vendors));
  assert.ok(vendors.length > 0);
});

test("every entry has the required fields with the right types", () => {
  for (const v of vendors) {
    const where = JSON.stringify(v.domain);
    assert.equal(typeof v.vendor, "string", where);
    assert.ok(v.vendor.trim(), `${where}: vendor is empty`);
    assert.equal(typeof v.behaviour, "string", where);
    assert.ok(v.behaviour.trim(), `${where}: behaviour is empty`);
    assert.equal(typeof v.verified, "boolean", `${where}: verified must be true or false, not a string`);
    assert.ok(isHttps(v.evidence_url), `${where}: evidence_url must be a full https:// address`);
    if ("domain_url" in v) assert.ok(isHttps(v.domain_url), `${where}: domain_url must be a full https:// address`);
  }
});

test("every domain is a bare lowercase hostname (no https://, slash, space or trailing dot)", () => {
  for (const v of vendors) {
    assert.match(v.domain, /^[a-z0-9-]+(\.[a-z0-9-]+)+$/, JSON.stringify(v.domain));
  }
});

test("no domain is listed twice", () => {
  const domains = vendors.map((v) => v.domain);
  assert.equal(new Set(domains).size, domains.length);
});

test("every verified entry has a short 'when the plan ends' line for the directory page", () => {
  for (const v of vendors.filter((x) => x.verified)) {
    assert.equal(typeof v.on_end, "string", v.domain);
    assert.ok(v.on_end.trim().length > 10, `${v.domain}: on_end is too short`);
  }
});

test("an unverified entry is never named as a vendor, only as an unknown short link", () => {
  for (const v of vendors.filter((x) => !x.verified)) {
    assert.equal(classify(`https://${v.domain}/abc`, vendors).kind, "unknown-short", v.domain);
  }
});

test("every verified entry is actually recognised by the checker", () => {
  for (const v of vendors.filter((x) => x.verified)) {
    assert.equal(classify(`https://${v.domain}/abc`, vendors).kind, "vendor", v.domain);
  }
});
