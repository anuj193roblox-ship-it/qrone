// Header behaviour on every page: the phone menu, and "Sign in" becoming "Dashboard" once signed in.
export function initHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const toggle = header.querySelector(".menu-toggle");
  const nav = header.querySelector(".site-nav");

  const setOpen = (open) => {
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  toggle.addEventListener("click", () => setOpen(!header.classList.contains("menu-open")));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && header.classList.contains("menu-open")) {
      setOpen(false);
      toggle.focus();
    }
  });
  // Widening past the phone layout closes the menu, so it never reappears stuck open.
  matchMedia("(min-width: 900px)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });

  // The button keeps its width either way (min-width in CSS), so the swap causes no layout shift.
  fetch("/api/session", { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .then((s) => {
      if (!s?.signedIn) return;
      const link = header.querySelector("[data-session-link]");
      link.textContent = "Dashboard";
      link.href = "/dashboard";
    })
    .catch(() => { /* offline: "Sign in" still works */ });
}
