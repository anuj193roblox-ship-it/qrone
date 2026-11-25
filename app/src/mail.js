// The only file that knows how email is sent. Switching providers later means editing this file only.
//   Real email: Cloudflare Email Service (the EMAIL binding plus a MAIL_FROM address on your own domain).
//   Local testing: DEV_LOG_LINKS=1 in .dev.vars prints the link to the terminal instead of sending it.
//   Neither set (the live site before the domain exists): sign-in reports it isn't available yet.

export const canSend = (env) => Boolean((env.EMAIL && env.MAIL_FROM) || env.DEV_LOG_LINKS === "1");

// Local testing only: the sign-in page may show the link itself, so you don't have to dig it out of the terminal.
// All three must hold: no real email set up, DEV_LOG_LINKS=1, and the page opened on this computer.
// Otherwise anyone could sign in as anyone, so the live site (real hostname) never qualifies.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
export const showLinkOnPage = (env, requestUrl) =>
  !(env.EMAIL && env.MAIL_FROM) && env.DEV_LOG_LINKS === "1" && LOCAL_HOSTS.has(new URL(requestUrl).hostname);

export async function sendSignInLink(env, to, link) {
  if (env.EMAIL && env.MAIL_FROM) {
    await env.EMAIL.send({
      from: env.MAIL_FROM,
      to,
      subject: "Your QrOne sign-in link",
      text: `Sign in to QrOne:\n${link}\n\nThe link works once and expires in 15 minutes.\nIf you didn't ask for it, you can ignore this email.`,
      html: `<p>Sign in to QrOne:</p><p><a href="${link}">Sign in</a></p><p>The link works once and expires in 15 minutes. If you didn't ask for it, you can ignore this email.</p>`,
    });
    return;
  }
  console.log(`[dev] sign-in link for ${to}: ${link}`);
}
