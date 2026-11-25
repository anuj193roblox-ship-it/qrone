import test from "node:test";
import assert from "node:assert/strict";
import { siteHeader, NAV } from "../src/siteheader.js";

test("the header has all six links, the sign-in button and the menu toggle", () => {
  const html = siteHeader("/faq.html", "QrOne");
  for (const n of NAV) assert.ok(html.includes(`href="${n.href}"`), n.label);
  assert.deepEqual(NAV.map((n) => n.href), ["/", "/check", "/print-guide", "/why-codes-die", "/pricing", "/faq"]);
  assert.match(html, /class="header-cta" href="\/signin"/);
  assert.match(html, /aria-controls="site-nav"/);
});

test("exactly the current page is marked active, and pages outside the nav mark none", () => {
  for (const n of NAV) {
    const html = siteHeader(`/${n.page}`, "QrOne");
    assert.equal(html.match(/aria-current="page"/g)?.length, 1, n.page);
    assert.ok(html.includes(`<a href="${n.href}" aria-current="page">`), n.page);
  }
  for (const other of ["/privacy.html", "/terms.html", "/signin.html", "/dashboard.html", undefined]) {
    assert.ok(!siteHeader(other, "QrOne").includes("aria-current"), String(other));
  }
});
