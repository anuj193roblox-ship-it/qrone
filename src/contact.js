// Contact sentences for the trust pages, filled in at build time from src/config.js.
// Empty values never show a placeholder: the page says plainly that the address comes with the domain.
const EMAIL = /^[^\s@<>"'&]+@[^\s@<>"'&]+\.[a-z]{2,}$/i;
const valid = (e) => EMAIL.test(String(e ?? "").trim());
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const mail = (e) => `<a href="mailto:${e.trim()}">${e.trim()}</a>`;

export function contactTokens({ name = "QrOne", founder = "", supportEmail = "", abuseEmail = "" } = {}) {
  const abuse = valid(abuseEmail) ? abuseEmail : valid(supportEmail) ? supportEmail : "";
  return {
    "{{FOUNDER_LINE}}": founder.trim()
      ? `${escapeHtml(name)} is built and run by ${escapeHtml(founder.trim())}, an independent founder, with no investors and no sales team.`
      : `${escapeHtml(name)} is built and run by one independent founder, with no investors and no sales team.`,
    "{{SUPPORT_LINE}}": valid(supportEmail)
      ? `Email ${mail(supportEmail)} and you'll hear back from the person who built it.`
      : "A support email address goes live together with our own domain, before any paid plan does.",
    "{{ABUSE_LINE}}": abuse
      ? `Email ${mail(abuse)} with the link inside the code, or a photo of it. We switch off abusive codes as soon as we confirm them.`
      : "Reporting opens together with our own domain, before anyone outside can make an editable code.",
  };
}
