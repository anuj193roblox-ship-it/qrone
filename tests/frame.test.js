import test from "node:test";
import assert from "node:assert/strict";
import { quietZone, cleanLabel, framedSvgText, frameLayout, stickerLayout, FRAMES, LABEL_MAX } from "../src/frame.js";

test("the blank border is at least 4 modules wide for every QR size", () => {
  for (const size of [200, 512, 1000, 1200]) {
    for (let modules = 21; modules <= 177; modules += 4) {
      const m = quietZone(size);
      const modulePx = (size - 2 * m) / modules;
      assert.ok(m >= 4 * modulePx - 1e-9, `size ${size}, ${modules} modules: border ${m}px < ${4 * modulePx}px`);
    }
  }
});

test("labels are tidied and capped", () => {
  assert.equal(cleanLabel("  Scan   for\nmenu "), "Scan for menu");
  assert.equal(cleanLabel(undefined), "");
  assert.equal(cleanLabel("x".repeat(60)).length, LABEL_MAX);
});

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test("no frame or label ever covers the code, and everything fits on the canvas", () => {
  const s = 1200;
  for (const frame of FRAMES) {
    for (const label of ["", "Scan for the menu", "x".repeat(40)]) {
      const L = frameLayout(s, frame, label);
      const code = { x: L.qrX, y: L.qrY, w: s, h: s };
      assert.ok(L.qrX >= 0 && L.qrY >= 0 && L.qrX + s <= L.w && L.qrY + s <= L.h, `${frame}: code inside canvas`);
      for (const r of L.shapes) {
        assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= L.w && r.y + r.h <= L.h, `${frame}: shape inside canvas`);
        // The banner may run under the code (it is drawn first and covered); the others must stay clear.
        if (frame !== "banner") assert.ok(!overlaps(r, code) || r.stroke, `${frame}: shape covers the code`);
        if (r.stroke) assert.ok(r.x + r.w / 2 > 0 && L.qrX >= r.x + r.sw, `${frame}: box stroke stays outside the code`);
      }
      if (L.text) {
        const insideCode = L.text.y > L.qrY && L.text.y < L.qrY + s;
        assert.ok(!insideCode, `${frame}: label text sits on the code`);
        assert.ok(L.text.size > 0 && L.text.size * 0.6 * L.text.str.length <= L.w, `${frame}: label fits the width`);
      }
    }
  }
});

test("a pill or banner without a label falls back to the plain code", () => {
  for (const frame of ["none", "pill", "banner"]) assert.deepEqual(frameLayout(500, frame, " ").shapes, []);
  assert.equal(frameLayout(500, "box", "").shapes.length, 1, "a box still draws its border");
});

test("plain code: the SVG is returned as is, minus the XML line, with crisp edges", () => {
  assert.equal(framedSvgText('<?xml version="1.0"?>\n<svg a="1"></svg>', 512, "none", "", {}), '<svg shape-rendering="crispEdges" a="1"></svg>');
});

test("label text is escaped and colours are checked", () => {
  const svg = framedSvgText("<svg></svg>", 500, "pill", `<script>&"'`, { fg: "red;x", bg: "#112233" });
  assert.ok(!svg.includes("<script>"));
  assert.ok(svg.includes("&lt;script&gt;&amp;&quot;&#39;"));
  assert.ok(svg.includes('fill="#000000"'), "an invalid colour falls back to black");
  assert.ok(svg.includes('fill="#112233"'));
  assert.ok(svg.includes('<svg x="0" y="0" shape-rendering="crispEdges"'), "the code is placed inside the frame");
});

test("sticker sheets fit both Letter and A4 (7.27in by 10in printable)", () => {
  for (const size of [1, 1.5, 2]) {
    for (const aspect of [1, 1.17, 1.25]) {
      const { cols, rows, count } = stickerLayout(size, aspect);
      assert.ok(cols * size + (cols - 1) * 0.125 <= 7.27, `width ${size}`);
      assert.ok(rows * size * aspect + (rows - 1) * 0.125 <= 10, `height ${size}`);
      assert.equal(count, cols * rows);
    }
  }
  assert.equal(stickerLayout(1, 1).count, 54);
  assert.equal(stickerLayout(2, 1).count, 12);
});
