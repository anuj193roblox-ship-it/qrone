// Print helpers shared by the home page and the dashboard. Everything runs in the browser; nothing is uploaded.
//  - quietZone: the blank border scanners need around a code
//  - frames: none, a pill under the code, a banner above it, or a box around it, each with a short label
//  - framed SVG (vector, best for print) and PNG downloads, and a sticker sheet printed by the browser

// A QR code needs a blank border 4 modules wide. The smallest code (21 modules) needs the largest share
// of the image: 4 / (21 + 4 + 4). Using that share for every code leaves at least 4 modules on any size.
export const quietZone = (size) => Math.ceil((size * 4) / 29);

export const LABEL_MAX = 24;
export const cleanLabel = (s) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, LABEL_MAX);
export const FRAMES = ["none", "pill", "banner", "box"];

const escapeXml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const colour = (c, fallback) => (/^#[0-9a-f]{6}$/i.test(c) ? c : fallback);
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

// Bold text is about 0.6em per character, so long labels get a smaller font to fit the width.
const fit = (max, width, text) => Math.round(Math.min(max, width / (Math.max(text.length, 1) * 0.6)));

// Where everything goes, for a code image `s` pixels wide (its blank border included).
// Shapes never cover the code: frames sit outside it, so they can't stop a scan.
export function frameLayout(s, frame, label, { fg = "#000000", bg = "#ffffff" } = {}) {
  const text = cleanLabel(label);
  const ink = colour(fg, "#000000");
  const paper = colour(bg, "#ffffff");
  if (frame === "pill" && text) {
    const h = Math.round(s * 0.12);
    const w = Math.round(s * 0.76);
    const pill = { x: Math.round((s - w) / 2), y: s, w, h, r: h / 2, fill: ink };
    return {
      w: s, h: s + h + Math.round(s * 0.05), qrX: 0, qrY: 0, background: paper, shapes: [pill],
      text: { str: text, x: s / 2, y: s + h / 2, size: fit(h * 0.5, w * 0.86, text), fill: paper },
    };
  }
  if (frame === "banner" && text) {
    const h = Math.round(s * 0.15);
    const r = Math.round(s * 0.04);
    // The banner's rounded bottom corners are hidden under the code, which is drawn after it.
    return {
      w: s, h: s + h, qrX: 0, qrY: h, background: paper,
      shapes: [{ x: 0, y: 0, w: s, h: h + r * 2, r, fill: ink }],
      text: { str: text, x: s / 2, y: h / 2, size: fit(h * 0.5, s * 0.86, text), fill: paper },
    };
  }
  if (frame === "box") {
    const sw = Math.round(s * 0.025);
    const o = sw * 2;
    const lh = text ? Math.round(s * 0.14) : 0;
    const w = s + o * 2;
    const h = s + o * 2 + lh;
    return {
      w, h, qrX: o, qrY: o, background: paper,
      shapes: [{ x: sw / 2, y: sw / 2, w: w - sw, h: h - sw, r: Math.round(s * 0.05), stroke: ink, sw }],
      text: text ? { str: text, x: w / 2, y: o + s + lh * 0.42, size: fit(lh * 0.5, s * 0.86, text), fill: ink } : null,
    };
  }
  return { w: s, h: s, qrX: 0, qrY: 0, background: paper, shapes: [], text: null };
}

// The framed code as SVG text. The label is escaped: it is user text going into markup.
export function framedSvgText(qrSvg, s, frame, label, colours) {
  const L = frameLayout(s, frame, label, colours);
  // crispEdges stops hairline gaps between the squares when the code is printed small.
  const inner = qrSvg.replace(/^<\?xml[^>]*>\s*/, "")
    .replace(/^<svg\b/, `<svg x="${L.qrX}" y="${L.qrY}" shape-rendering="crispEdges"`);
  if (!L.shapes.length && !L.text) return inner.replace(/^<svg x="0" y="0" /, "<svg ");
  const shapes = L.shapes.map((r) =>
    `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${r.r}" `
    + (r.stroke ? `fill="${L.background}" stroke="${r.stroke}" stroke-width="${r.sw}"/>` : `fill="${r.fill}"/>`)).join("");
  const text = L.text
    ? `<text x="${L.text.x}" y="${L.text.y}" text-anchor="middle" dominant-baseline="central" font-family='${FONT}' `
      + `font-weight="700" font-size="${L.text.size}" fill="${L.text.fill}">${escapeXml(L.text.str)}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L.w}" height="${L.h}" viewBox="0 0 ${L.w} ${L.h}">`
    + `<rect width="${L.w}" height="${L.h}" fill="${L.background}"/>${shapes}${inner}${text}</svg>`;
}

// opts: { frame, label, fg, bg }. s is the code's width in pixels.
export async function framedSvgBlob(qr, s, opts) {
  const raw = await (await qr.getRawData("svg")).text();
  return new Blob([framedSvgText(raw, s, opts.frame, opts.label, opts)], { type: "image/svg+xml" });
}

// Drawn with the canvas API rather than by rasterising the SVG, which some browsers refuse to export.
export async function framedPngBlob(qr, s, opts) {
  const L = frameLayout(s, opts.frame, opts.label, opts);
  const img = await createImageBitmap(await qr.getRawData("png"));
  const canvas = document.createElement("canvas");
  canvas.width = L.w;
  canvas.height = L.h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = L.background;
  ctx.fillRect(0, 0, L.w, L.h);
  for (const r of L.shapes) {
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, r.r);
    if (r.stroke) { ctx.lineWidth = r.sw; ctx.strokeStyle = r.stroke; ctx.stroke(); }
    else { ctx.fillStyle = r.fill; ctx.fill(); }
  }
  ctx.drawImage(img, L.qrX, L.qrY, s, s);
  img.close();
  if (L.text) {
    ctx.fillStyle = L.text.fill;
    ctx.font = `700 ${L.text.size}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(L.text.str, L.text.x, L.text.y);
  }
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function save(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadFramed(qr, s, opts, name, extension) {
  save(extension === "svg" ? await framedSvgBlob(qr, s, opts) : await framedPngBlob(qr, s, opts), `${name}.${extension}`);
}

// ---------- Sticker sheet ----------

// Sizes in inches. The sheet must fit both US Letter and A4 with 0.5in margins: 7.27in by 10in printable.
export const STICKER_SIZES = { "1": 1, "1.5": 1.5, "2": 2 };
const GAP = 0.125;
const AREA = { w: 7.27, h: 10 };

export function stickerLayout(sizeIn, aspect) {
  const cols = Math.max(1, Math.floor((AREA.w + GAP) / (sizeIn + GAP)));
  const rows = Math.max(1, Math.floor((AREA.h + GAP) / (sizeIn * aspect + GAP)));
  return { cols, rows, count: cols * rows };
}

// Fills a print-only sheet with copies of the framed code and opens the browser's print dialog.
// The SVG keeps the print sharp at any sticker size.
export async function printStickers(qr, s, opts, sizeKey) {
  const sizeIn = STICKER_SIZES[sizeKey] ?? 1.5;
  const L = frameLayout(s, opts.frame, opts.label, opts);
  const { count } = stickerLayout(sizeIn, L.h / L.w);
  const url = URL.createObjectURL(await framedSvgBlob(qr, s, opts));

  let sheet = document.getElementById("print-sheet");
  if (!sheet) {
    sheet = document.createElement("div");
    sheet.id = "print-sheet";
    sheet.setAttribute("aria-hidden", "true");
    document.body.append(sheet);
  }
  sheet.className = `sheet-${String(sizeKey).replace(".", "")}`;
  const imgs = Array.from({ length: count }, () => {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    return img;
  });
  sheet.replaceChildren(...imgs);
  await Promise.all(imgs.map((img) => img.decode().catch(() => {})));

  window.addEventListener("afterprint", () => { sheet.replaceChildren(); URL.revokeObjectURL(url); }, { once: true });
  window.print();
}
