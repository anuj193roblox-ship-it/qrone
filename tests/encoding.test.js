// Catches text corrupted by a wrong file encoding (UTF-8 read as Windows-1252), e.g. a middle dot gaining a stray "A-hat".
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const files = [
  ...readdirSync(root).filter((f) => f.endsWith(".html") || f.endsWith(".md")),
  ...["src", "app/src", "worker/src", "tests"].flatMap((d) => readdirSync(join(root, d)).filter((f) => /\.(js|css|json)$/.test(f)).map((f) => `${d}/${f}`)),
];

test("no source file contains mojibake (broken accents, dots or dashes)", () => {
  // Built from character codes so this test file can't trip over its own pattern.
  const c = (...codes) => String.fromCharCode(...codes);
  const broken = new RegExp(`[${c(0xc3, 0xc2)}][${c(0x80)}-${c(0xbf)}]|${c(0xe2, 0x20ac)}`);
  for (const f of files) assert.doesNotMatch(readFileSync(join(root, f), "utf8"), broken, f);
});
