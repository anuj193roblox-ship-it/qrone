// Fonts are bundled and served from this site, so no visitor's browser contacts a font company.
import "@fontsource-variable/figtree";
import "./style.css";

// The checker used to be a tab on the home page; old links and bookmarks to /#check still land on it.
if (location.pathname === "/" && location.hash === "#check") location.replace("/check");

// Each tool is only loaded on the page that has it, so the other pages stay small.
if (document.getElementById("gen-form")) import("./generator.js").then((m) => m.initGenerator());
if (document.getElementById("chk-file")) import("./checker.js").then((m) => m.initChecker());
if (document.getElementById("signin-form")) import("./account.js").then((m) => m.initSignin());
if (document.getElementById("dashboard")) import("./account.js").then((m) => m.initDashboard());
if (document.getElementById("tiers")) import("./pricing.js").then((m) => m.initPricing());
