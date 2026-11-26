// The one site header, inserted into every page at build time (vite.config.js) in place of <!--site-header-->.
// Pure: page path in, HTML out, so the active tab and the links are tested.
export const NAV = [
  { href: "/", label: "Make", page: "index.html" },
  { href: "/check", label: "Check", page: "check.html" },
  { href: "/print-guide", label: "Print guide", page: "print-guide.html" },
  { href: "/why-codes-die", label: "Why codes die", page: "why-codes-die.html" },
  { href: "/faq", label: "FAQ", page: "faq.html" },
];

const MENU_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`;

// pagePath: the HTML file being built, e.g. "/check.html" or "check.html".
export function siteHeader(pagePath, name) {
  const file = String(pagePath ?? "").split("/").pop();
  const links = NAV.map((n) => `<a href="${n.href}"${n.page === file ? ' aria-current="page"' : ""}>${n.label}</a>`).join("");
  return `<header class="site-header">
    <div class="site-header-in">
      <a class="brand" href="/"><img class="brand-mark" src="/logo.svg" alt="" width="26" height="26">${name}</a>
      <nav id="site-nav" class="site-nav" aria-label="Main">${links}</nav>
      <div class="header-actions">
        <a class="header-cta" href="/signin" data-session-link>Sign in</a>
        <button type="button" class="menu-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu">${MENU_ICON}</button>
      </div>
    </div>
  </header>`;
}
