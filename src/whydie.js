// "Why QR codes die": the vendor table comes from the same list the checker uses, so the two never drift.
// Only verified entries (with a source on the vendor's own site) are shown. Text goes in with textContent.
import vendors from "./data/vendor-domains.json";

function cell(tag, text, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function initWhyDie() {
  const rows = vendors
    .filter((v) => v.verified)
    .sort((a, b) => a.vendor.localeCompare(b.vendor) || a.domain.localeCompare(b.domain))
    .map((v) => {
      const tr = document.createElement("tr");
      const domain = cell("th", v.domain, "mono");
      domain.scope = "row";
      const link = document.createElement("a");
      link.href = v.evidence_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Source ↗";
      link.setAttribute("aria-label", `${v.vendor}'s own page about this (opens in a new tab)`);
      const source = cell("td");
      source.append(link);
      tr.append(domain, cell("td", v.vendor), cell("td", v.on_end), source);
      return tr;
    });
  document.getElementById("vendor-rows").replaceChildren(...rows);
}
