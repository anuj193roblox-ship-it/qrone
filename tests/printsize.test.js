import test from "node:test";
import assert from "node:assert/strict";
import { printSize, round, toInches, DISTANCE } from "../src/printsize.js";

test("close up, the floors apply: never under 2 cm, recommend 2.5 cm", () => {
  const s = printSize(15);
  assert.equal(s.minimum, 2);
  assert.equal(s.recommended, 2.5);
});

test("further away, a tenth (minimum) and an eighth (recommended) of the distance", () => {
  const s = printSize(250);
  assert.equal(s.minimum, 25);
  assert.equal(s.recommended, 31.25);
  assert.ok(Math.abs(s.border - 31.25 * 0.15) < 1e-9);
});

test("distances are kept inside the slider's range, and junk becomes the minimum", () => {
  assert.equal(printSize(9999).distance, DISTANCE.max);
  assert.equal(printSize(-3).distance, DISTANCE.min);
  assert.equal(printSize("abc").distance, DISTANCE.min);
});

test("rounding and inches read naturally", () => {
  assert.equal(round(2.54), 2.5);
  assert.equal(round(31.25), 31);
  assert.equal(round(toInches(2.54)), 1);
});
