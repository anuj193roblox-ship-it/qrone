import test from "node:test";
import assert from "node:assert/strict";
import { quietZone, cleanLabel, framedSvgText, stickerLayout, labelHeight, LABEL_MAX } from "../src/frame.js";

test("the blank border is at least 4 modules wide for every QR size", () => {
  for (const size of [200, 512, 1000]) {
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

test("no label: the code's own SVG is returned (no XML line, crisp edges for print)", () => {
  assert.equal(framedSvgText('<?xml version="1.0"?>\n<svg a="1"></svg>', 512, { label: " " }), '<svg shape-rendering="crispEdges" a="1"></svg>');
});

test("label text is escaped, colours are checked, and the label sits below the code", () => {
  const svg = framedSvgText("<svg></svg>", 500, { label: `<script>&"'`, fg: "red;x", bg: "#112233" });
  assert.ok(!svg.includes("<script>"));
  assert.ok(svg.includes("&lt;script&gt;&amp;&quot;&#39;"));
  assert.ok(svg.includes('fill="#000000"'), "an invalid colour falls back to black");
  assert.ok(svg.includes('fill="#112233"'));
  assert.ok(svg.includes(`height="${500 + labelHeight(500)}"`));
});

test("sticker sheets fit both Letter and A4 (7.27in by 10in printable)", () => {
  for (const size of [1, 1.5, 2]) {
    for (const aspect of [1, 1.16]) {
      const { cols, rows, count } = stickerLayout(size, aspect);
      assert.ok(cols * size + (cols - 1) * 0.125 <= 7.27, `width ${size}`);
      assert.ok(rows * size * aspect + (rows - 1) * 0.125 <= 10, `height ${size}`);
      assert.equal(count, cols * rows);
    }
  }
  assert.equal(stickerLayout(1, 1).count, 54);
  assert.equal(stickerLayout(2, 1).count, 12);
});
