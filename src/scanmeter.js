// Scan meter: reads the preview back with a QR decoder under four tough conditions, all in the browser.
// It's a quick sanity check, not a promise: real cameras differ, so people should still test with a phone.

// Each test tries a few nearby sizes and passes if any reads, like a phone camera that sees many frames:
// the decoder can miss one exact size (pixel rounding) and read the next, so one size alone gives false alarms.
export const TESTS = [
  { id: "sharp", name: "Big and sharp", sizes: [600, 540, 480] },
  { id: "small", name: "Small print", sizes: [110, 100, 120] },
  { id: "blur", name: "Blurry photo", sizes: [400, 360], shrink: 4 }, // drawn 4× smaller, then stretched back
  { id: "faded", name: "Faded or dim", sizes: [400, 360], fade: 0.3 }, // 30% of the original contrast, a bit darker
];

export function verdict(passed, total = TESTS.length) {
  if (passed === total) return { text: "Scans easily", tone: "ok" };
  if (passed === total - 1) return { text: "Should scan", tone: "ok" };
  if (passed > 0) return { text: "Risky to scan", tone: "warn" };
  return { text: "Won't scan", tone: "bad" };
}

// One practical tip for the first thing likely to be causing failures.
export function tipFor(failed, { dots, logo, lowContrast }) {
  if (!failed.length) return "";
  if (lowContrast) return "Tip: use a darker code colour on a light background.";
  if (dots !== "square") return "Tip: the Square dot shape scans best.";
  if (logo) return "Tip: a smaller or simpler logo, or none, makes it easier to read.";
  if (failed.includes("sharp")) return "Tip: shorten the link or text. This much makes a very dense code.";
  if (failed.includes("small")) return "Tip: print it at least 2 cm (0.8 in) wide.";
  return "Tip: lower error correction makes the code less dense.";
}

// Squeezes every colour towards dim grey, like a faded print in poor light.
export function fade(rgba, amount) {
  for (let i = 0; i < rgba.length; i += 4) {
    for (let c = 0; c < 3; c++) rgba[i + c] = 100 + (rgba[i + c] - 128) * amount;
  }
  return rgba;
}

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d", { willReadFrequently: true })];
}

// Returns [{ id, name, ok }] for each test. "expected" is the text the code should contain.
export async function measure(imageUrl, expected, encoded) {
  const { default: jsQR } = await import("jsqr"); // loaded on first use only
  const img = new Image();
  img.src = imageUrl;
  await img.decode();
  const aspect = img.naturalHeight / img.naturalWidth; // framed codes are taller than wide
  const reads = (t, w) => {
    const h = Math.round(w * aspect);
    const [, ctx] = canvas(w, h);
    if (t.shrink) {
      const [small, sctx] = canvas(Math.round(w / t.shrink), Math.round(h / t.shrink));
      sctx.drawImage(img, 0, 0, small.width, small.height);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(small, 0, 0, w, h);
    } else {
      ctx.drawImage(img, 0, 0, w, h);
    }
    const data = ctx.getImageData(0, 0, w, h);
    if (t.fade) fade(data.data, t.fade);
    const found = jsQR(data.data, w, h, { inversionAttempts: "attemptBoth" });
    return Boolean(found) && (found.data === expected || found.data === encoded);
  };
  return TESTS.map((t) => ({ id: t.id, name: t.name, ok: t.sizes.some((w) => reads(t, w)) }));
}
