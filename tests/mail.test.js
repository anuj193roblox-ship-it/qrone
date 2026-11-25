import test from "node:test";
import assert from "node:assert/strict";
import { showLinkOnPage } from "../app/src/mail.js";

const dev = { DEV_LOG_LINKS: "1" };

test("the sign-in link shows on the page only for local testing on this computer", () => {
  for (const url of ["http://localhost:8791/api/auth/start", "http://127.0.0.1:8791/x", "http://[::1]:8791/x"]) {
    assert.equal(showLinkOnPage(dev, url), true, url);
  }
});

test("never on a real hostname, never without the switch, never once real email is set up", () => {
  assert.equal(showLinkOnPage(dev, "https://qr-tool-site.qr-tool-spike.workers.dev/api/auth/start"), false);
  assert.equal(showLinkOnPage(dev, "https://localhost.evil.example/x"), false);
  assert.equal(showLinkOnPage({}, "http://localhost:8791/x"), false);
  assert.equal(showLinkOnPage({ DEV_LOG_LINKS: "true" }, "http://localhost:8791/x"), false);
  assert.equal(showLinkOnPage({ ...dev, EMAIL: {}, MAIL_FROM: "a@b.co" }, "http://localhost:8791/x"), false);
});
