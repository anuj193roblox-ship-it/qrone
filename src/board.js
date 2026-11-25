// The letterboard at the top of the page is the status display.
// setBoard() re-sets its words; each letter drops into the felt, unless the visitor prefers reduced motion.
// Screen readers get the plain sentence; the per-letter spans are hidden from them.

export function setBoard(text, tone = "") {
  const board = document.getElementById("board");
  if (!board) return;
  board.dataset.tone = tone;

  const spoken = document.createElement("span");
  spoken.className = "sr-only";
  spoken.textContent = text;

  const shown = document.createElement("span");
  shown.setAttribute("aria-hidden", "true");
  let i = 0;
  text.split(" ").forEach((word, wi) => {
    if (wi) shown.append(" ");
    const w = document.createElement("span");
    w.className = "w";
    for (const ch of word) {
      const l = document.createElement("span");
      l.className = "l";
      l.textContent = ch;
      l.style.setProperty("--i", String(i++));
      w.append(l);
    }
    shown.append(w);
  });

  board.replaceChildren(spoken, shown);
}
