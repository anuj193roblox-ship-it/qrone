import test from "node:test";
import assert from "node:assert/strict";
import { page } from "../worker/src/pages.js";

test("status pages never echo anything but fixed text", () => {
  for (const kind of ["missing", "expired", "disabled", "unavailable", "<script>"]) {
    const html = page(kind, "https://site.example");
    assert.ok(!html.includes("<script"), kind);
  }
});

test("the expired page links the owner to sign-in on the configured site only", () => {
  assert.match(page("expired", "https://site.example/ignored?x=1"), /href="https:\/\/site\.example\/signin"/);
  assert.ok(!page("missing", "https://site.example").includes("href="), "only the expired page has the link");
  for (const bad of [undefined, "", "javascript:alert(1)", "http://evil.example", "not a url"]) {
    assert.ok(!page("expired", bad).includes("href="), String(bad));
  }
});
