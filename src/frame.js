// Print helpers shared by the Make tab and the dashboard. Everything runs in the browser; nothing is uploaded.
//  - quietZone: the blank border scanners need around a code
//  - framed PNG / SVG: the code with an optional label underneath
//  - a sticker sheet, printed (or saved as PDF) by the browser's own print dialog

// A QR code needs a blank border 4 modules wide. The smallest code (21 modules) needs the largest share
// of the image: 4 / (21 + 4 + 4). Using that share for every code leaves at least 4 modules on any size.
export const quietZone = (size) => Math.ceil((size * 4) / 29);

export const LABEL_MAX = 24;
export const cleanLabel = (s) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, LABEL_MAX);

const escapeXml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const colour = (c, fallback) => (/^#[0-9a-f]{6}$/i.test(c) ? c : fallback);
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

// The label sits below the code's blank border, never inside it, so it can't stop a scan.
export const labelHeight = (size) => Math.round(size * 0.16);

// Plain SVG text for the framed code. The label is escaped: it is user text going into markup.
export function framedSvgText(qrSvg, size, { label, fg, bg }) {
  const text = cleanLabel(label);
  // crispEdges stops hairline gaps between the squares when the code is printed small.
  const inner = qrSvg.replace(/^<\?xml[^>]*>\s*/, "").replace(/^<svg /, '<svg shape-rendering="crispEdges" ');
  if (!text) return inner;
  const h = size + labelHeight(size);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${h}" viewBox="0 0 ${size} ${h}">`
    + `<rect width="${size}" height="${h}" fill="${colour(bg, "#ffffff")}"/>`
    + inner
    + `<text x="${size / 2}" y="${size + labelHeight(size) * 0.42}" text-anchor="middle" dominant-baseline="middle" `
    // Long labels get a smaller font (about 0.6em per bold character) so they fit the width.
    + `font-family='${FONT}' font-weight="700" font-size="${Math.round(Math.min(labelHeight(size) * 0.48, (size * 0.86) / (text.length * 0.6)))}" `
    + `fill="${colour(fg, "#000000")}">${escapeXml(text)}</text></svg>`;
}

async function framedSvgBlob(qr, size, opts) {
  const raw = await (await qr.getRawData("svg")).text();
  return new Blob([framedSvgText(raw, size, opts)], { type: "image/svg+xml" });
}

async function framedPngBlob(qr, size, opts) {
  const png = await qr.getRawData("png");
  const text = cleanLabel(opts.label);
  if (!text) return png;
  const img = await createImageBitmap(png);
  const lh = labelHeight(img.width);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height + lh;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = colour(opts.bg, "#ffffff");
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  img.close();
  let px = Math.round(lh * 0.48);
  ctx.font = `700 ${px}px ${FONT}`;
  while (ctx.measureText(text).width > canvas.width * 0.86 && px > 8) ctx.font = `700 ${--px}px ${FONT}`;
  ctx.fillStyle = colour(opts.fg, "#000000");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, img.height + lh * 0.42);
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

// opts: { label, fg, bg }. size is the code's width in pixels.
export async function downloadFramed(qr, size, opts, name, extension) {
  const blob = extension === "svg" ? await framedSvgBlob(qr, size, opts) : await framedPngBlob(qr, size, opts);
  save(blob, `${name}.${extension}`);
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

// Fills a print-only sheet with copies of the code and opens the browser's print dialog.
// The SVG keeps the print sharp at any sticker size.
export async function printStickers(qr, size, opts, sizeKey) {
  const sizeIn = STICKER_SIZES[sizeKey] ?? 1.5;
  const text = cleanLabel(opts.label);
  const aspect = text ? (size + labelHeight(size)) / size : 1;
  const { count } = stickerLayout(sizeIn, aspect);
  const url = URL.createObjectURL(await framedSvgBlob(qr, size, opts));

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

  const done = () => { sheet.replaceChildren(); URL.revokeObjectURL(url); };
  window.addEventListener("afterprint", done, { once: true });
  window.print();
}
