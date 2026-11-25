// Guards for the two promises the site makes: decoded QR text is never treated as HTML,
// and the checker never sends anything over the network.
// No DOM needed: half of this reads the source files as text, half checks classify().
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { classify } from "../src/classify.js";

const srcDir = new URL("../src/", import.meta.url);
// shortcut: strips comments with a regex, so a comment like "never use innerHTML" is not flagged.
// It can over-strip text after "//" inside strings; that only hides code, never invents a match.
const code = (file) => readFileSync(new URL(file, srcDir), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const jsFiles = readdirSync(srcDir).filter((f) => f.endsWith(".js"));

test("no source file turns strings into HTML", () => {
  for (const f of jsFiles) {
    assert.doesNotMatch(code(f), /\.(innerHTML|outerHTML)\b|insertAdjacentHTML|document\.write|\beval\s*\(|new Function\s*\(/, f);
  }
});

test("the checker makes no network requests (images stay on the device)", () => {
  assert.doesNotMatch(code("checker.js"), /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/);
});

test("dangerous QR content never becomes a clickable link", () => {
  // The checker only builds an <a href> from result.url, so it must not exist for these.
  for (const text of [
    "javascript:alert(1)",
    "JavaScript:alert(document.cookie)",
    "  javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "<img src=x onerror=alert(1)>",
  ]) {
    const r = classify(text, []);
    assert.equal(r.kind, "not-url", text);
    assert.equal(r.url, undefined, text);
  }
});

test("any link the checker does show is http or https", () => {
  for (const text of ["https://example.com", "http://bit.ly/x", "HTTPS://QRCO.DE/a", "https://ex.com/<script>"]) {
    assert.match(classify(text, []).url, /^https?:\/\//, text);
  }
});

test("no secret files are tracked by git (.env, .dev.vars)", async () => {
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync("git", ["ls-files"], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  if (r.status !== 0) return; // not a git checkout (for example a downloaded zip): nothing to check
  const leaked = r.stdout.split("\n").filter((f) => /(^|\/)\.env(\.|$)(?!example$)|(^|\/)\.dev\.vars/.test(f) && !f.endsWith(".env.example"));
  assert.deepEqual(leaked, [], "remove these from git: git rm --cached <file>");
});

test("hostile text is kept exactly as decoded, so the page can show it as plain text", () => {
  const text = "<b>hi</b><script>alert(1)</script>";
  assert.equal(classify(text, []).content, text);
});
