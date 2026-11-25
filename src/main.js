// Fonts are bundled and served from this site, so no visitor's browser contacts a font company.
import "@fontsource-variable/figtree";
import "./style.css";
import { setHeadline } from "./headline.js";

// Make | Check switch: one tool on screen at a time. Arrow keys move between tabs.
const tabs = [...document.querySelectorAll('[role="tab"]')];

function select(tab, { focus = false } = {}) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
  }
  if (focus) tab.focus();
  setHeadline(tab.dataset.line1, tab.dataset.line2);
  const hash = tab.id === "tab-check" ? "#check" : "";
  history.replaceState(null, "", location.pathname + location.search + hash);
}

tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => { if (tab.getAttribute("aria-selected") !== "true") select(tab); });
  tab.addEventListener("keydown", (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (step) select(tabs[(i + step + tabs.length) % tabs.length], { focus: true });
  });
});
if (tabs.length && location.hash === "#check") select(document.getElementById("tab-check"));

// Each tool is only loaded on the page that has it, so the other pages stay small.
if (document.getElementById("gen-form")) import("./generator.js").then((m) => m.initGenerator());
if (document.getElementById("panel-check")) import("./checker.js").then((m) => m.initChecker());
if (document.getElementById("signin-form")) import("./account.js").then((m) => m.initSignin());
if (document.getElementById("dashboard")) import("./account.js").then((m) => m.initDashboard());
