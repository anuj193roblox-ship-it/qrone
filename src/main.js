// Fonts are bundled and served from this site, so no visitor's browser contacts a font company.
import "@fontsource/big-shoulders-display/800";
import "@fontsource-variable/figtree";
import "./style.css";
import { setBoard } from "./board.js";

// Make | Check switch: one tool on screen at a time. Arrow keys move between tabs.
const tabs = [...document.querySelectorAll('[role="tab"]')];

function select(tab, { focus = false, animate = true } = {}) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
  }
  if (focus) tab.focus();
  if (animate) setBoard(tab.dataset.board, tab.dataset.tone ?? "");
  const hash = tab.id === "tab-check" ? "#check" : "";
  history.replaceState(null, "", location.pathname + location.search + hash);
}

if (tabs.length) {
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => { if (tab.getAttribute("aria-selected") !== "true") select(tab); });
    tab.addEventListener("keydown", (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (step) select(tabs[(i + step + tabs.length) % tabs.length], { focus: true });
    });
  });
  if (location.hash === "#check") select(document.getElementById("tab-check"), { animate: false });
  document.getElementById("board").textContent = document.querySelector('[role="tab"][aria-selected="true"]').dataset.board;
}

// Each tool is only loaded on the page that has it, so the other pages stay small.
if (document.getElementById("gen-form")) import("./generator.js").then((m) => m.initGenerator());
if (document.getElementById("panel-check")) import("./checker.js").then((m) => m.initChecker());
if (document.getElementById("signin-form")) import("./account.js").then((m) => m.initSignin());
if (document.getElementById("dashboard")) import("./account.js").then((m) => m.initDashboard());
