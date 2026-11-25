// Print guide calculator: distance in, minimum and safer code width out. All maths lives in printsize.js.
import { printSize, round, toInches, CM_PER_INCH, DISTANCE } from "./printsize.js";
import { BRAND } from "./config.js";

const $ = (id) => document.getElementById(id);
const fmt = (cm, unit) => (unit === "in" ? `${round(toInches(cm))} in` : `${round(cm)} cm`);
const other = (unit) => (unit === "in" ? "cm" : "in");

export function initPrintGuide() {
  const range = $("calc-range");
  const num = $("calc-num");
  let unit = "cm";
  let distanceCm = 30;

  // The slider and number box speak the chosen unit; everything underneath is centimetres.
  function setInputs() {
    const f = unit === "in" ? 1 / CM_PER_INCH : 1;
    for (const input of [range, num]) {
      input.min = String(Math.round(DISTANCE.min * f));
      input.max = String(Math.round(DISTANCE.max * f));
    }
    range.step = unit === "in" ? "1" : "5";
    range.value = num.value = String(Math.round(distanceCm * f));
  }

  function show() {
    const s = printSize(distanceCm);
    distanceCm = s.distance;
    $("calc-distance").textContent = `Scanning from ${fmt(s.distance, unit)} (${fmt(s.distance, other(unit))}).`;
    $("calc-min").textContent = fmt(s.minimum, unit);
    $("calc-min-alt").textContent = fmt(s.minimum, other(unit));
    $("calc-rec").textContent = fmt(s.recommended, unit);
    $("calc-rec-alt").textContent = fmt(s.recommended, other(unit));
    $("calc-border").textContent = `Plus a white border of at least ${fmt(s.border, unit)} on every side. Codes made on ${BRAND.name} already include it.`;
  }

  const fromInput = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return;
    distanceCm = unit === "in" ? n * CM_PER_INCH : n;
    show();
  };
  range.addEventListener("input", () => { num.value = range.value; fromInput(range.value); });
  num.addEventListener("input", () => { range.value = num.value; fromInput(num.value); });
  num.addEventListener("change", setInputs); // tidy an out-of-range number once you leave the box

  document.querySelectorAll('input[name="calc-unit"]').forEach((r) => r.addEventListener("change", () => {
    unit = r.value;
    setInputs();
    show();
  }));
  document.querySelectorAll("[data-cm]").forEach((b) => b.addEventListener("click", () => {
    distanceCm = Number(b.dataset.cm);
    setInputs();
    show();
  }));

  setInputs();
  show();
}
