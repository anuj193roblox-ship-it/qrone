// The page headline: one white line and an optional blue second line. Text only, never HTML.
export function setHeadline(first, second = "") {
  const h = document.getElementById("headline");
  if (!h) return;
  const line = (text, cls) => {
    const span = document.createElement("span");
    span.className = cls;
    span.textContent = text;
    return span;
  };
  h.replaceChildren(line(first, "line"), ...(second ? [" ", line(second, "line accent")] : []));
}
