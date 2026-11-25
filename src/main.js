import "./style.css";

// Every page loads this file. Each tool is only loaded on the page that has it,
// so the About, Privacy and FAQ pages stay small and fast.
if (document.getElementById("gen-form")) {
  import("./generator.js").then((m) => m.initGenerator());
}
if (document.getElementById("checker")) {
  import("./checker.js").then((m) => m.initChecker());
}
