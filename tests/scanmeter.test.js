import test from "node:test";
import assert from "node:assert/strict";
import { verdict, tipFor, fade, TESTS } from "../src/scanmeter.js";

test("the verdict follows how many of the four tests passed", () => {
  assert.equal(TESTS.length, 4);
  assert.deepEqual([4, 3, 2, 1, 0].map((n) => verdict(n).text), ["Scans easily", "Should scan", "Risky to scan", "Risky to scan", "Won't scan"]);
  assert.deepEqual([4, 3, 2, 0].map((n) => verdict(n).tone), ["ok", "ok", "warn", "bad"]);
});

test("the tip names the most likely cause first", () => {
  const base = { dots: "square", logo: false, lowContrast: false };
  assert.equal(tipFor([], { ...base, dots: "dots" }), "", "nothing failed: no tip");
  assert.match(tipFor(["small"], { ...base, lowContrast: true, dots: "dots" }), /darker/);
  assert.match(tipFor(["blur"], { ...base, dots: "dots", logo: true }), /Square/);
  assert.match(tipFor(["blur"], { ...base, logo: true }), /logo/);
  assert.match(tipFor(["sharp", "small"], base), /shorten/, "fails even big and sharp: too much content");
  assert.match(tipFor(["small"], base), /2 cm/);
  assert.match(tipFor(["faded"], base), /error correction/);
});

test("fading pulls colours towards dim grey and leaves transparency alone", () => {
  const px = fade(new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 128]), 0.3);
  assert.deepEqual([...px], [62, 62, 62, 255, 138, 138, 138, 128]);
});
