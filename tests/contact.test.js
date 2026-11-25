import test from "node:test";
import assert from "node:assert/strict";
import { contactTokens } from "../src/contact.js";

test("with nothing set, the pages say plainly that contact comes with the domain (no placeholders)", () => {
  const t = contactTokens({ name: "QrOne" });
  for (const text of Object.values(t)) {
    assert.ok(!/\[|\{\{|yourdomain|FOUNDER_NAME|mailto/.test(text), text);
  }
  assert.match(t["{{SUPPORT_LINE}}"], /goes live together with our own domain/);
});

test("set values appear as real links, and abuse falls back to the support address", () => {
  const t = contactTokens({ name: "QrOne", founder: "Sam", supportEmail: "help@qrone.example" });
  assert.match(t["{{FOUNDER_LINE}}"], /run by Sam,/);
  assert.match(t["{{SUPPORT_LINE}}"], /href="mailto:help@qrone\.example"/);
  assert.match(t["{{ABUSE_LINE}}"], /href="mailto:help@qrone\.example"/);
  assert.match(contactTokens({ abuseEmail: "abuse@qrone.example" })["{{ABUSE_LINE}}"], /mailto:abuse@qrone\.example/);
});

test("a broken email or HTML in the name never reaches the page as markup", () => {
  const t = contactTokens({ founder: "<b>x</b>", supportEmail: `a"onmouseover="x@y.com` });
  assert.ok(!t["{{FOUNDER_LINE}}"].includes("<b>"));
  assert.ok(!t["{{SUPPORT_LINE}}"].includes("mailto"), "an invalid email is treated as not set");
});
