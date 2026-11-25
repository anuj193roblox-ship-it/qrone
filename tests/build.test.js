// Builds the site into a temporary folder (dist/ is not touched) and checks every page.
// Catches: a {{NAME}} left in the HTML, a missing <title> or description, and a new page
// that was never added to vite.config.js (it would silently be missing from the live site).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { BRAND } from "../src/config.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = join(root, "node_modules", "vite", "bin", "vite.js");
const pages = readdirSync(root).filter((f) => f.endsWith(".html"));
let out;

before(() => {
  out = mkdtempSync(join(tmpdir(), "qr-build-"));
  const r = spawnSync(process.execPath, [vite, "build", "--outDir", out, "--emptyOutDir", "--logLevel", "error"], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 0, `vite build failed:\n${r.stderr}${r.stdout}`);
});
after(() => rmSync(out, { recursive: true, force: true }));

const built = (page) => readFileSync(join(out, page), "utf8");

test("every .html page in the project root is built", () => {
  const got = readdirSync(out).filter((f) => f.endsWith(".html")).sort();
  assert.deepEqual(got, [...pages].sort(), "add the missing page to rollupOptions.input in vite.config.js");
});

for (const page of pages) {
  test(`${page}: no {{placeholders}} survive the build`, () => {
    const html = built(page);
    assert.ok(!html.includes("{{"), `found: ${html.match(/.{0,40}\{\{.{0,40}/)?.[0]}`);
    assert.ok(html.includes(BRAND.name), "brand name missing");
  });

  test(`${page}: has the shared site header`, () => {
    const html = built(page);
    assert.ok(html.includes('class="site-header"'), "the header marker was not filled in");
    assert.ok(!html.includes("<!--site-header-->"));
  });

  test(`${page}: has a non-empty <title> and meta description`, () => {
    const html = built(page);
    assert.match(html, /<title>[^<]*\S[^<]*<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]*\S[^"]*">/);
  });
}

test("pricing page shows the same prices and limits the server charges and enforces", async () => {
  const { PRICE, upgradePrice } = await import("../app/src/billing.js");
  const { PLANS } = await import("../app/src/codes.js");
  const html = built("pricing.html");
  for (const p of ["starter", "plus", "pro"]) {
    assert.ok(html.includes(`>$${PRICE[p] / 100} <span>once`), `${p} price`);
    assert.ok(html.includes(`>${PLANS[p].limit} editable codes<`), `${p} limit`);
    assert.ok(html.includes(`: $${PRICE[p] / 100} once</a>`), `${p} button price`);
  }
  assert.ok(html.includes(`Pay $${upgradePrice("starter", "plus") / 100}, not $${PRICE.plus / 100}.`), "upgrade price");
});
