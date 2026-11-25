import { defineConfig } from "vite";
import { resolve } from "node:path";
import { BRAND } from "./src/config.js";
import { PRICE, upgradePrice } from "./app/src/billing.js";
import { PLANS, FREE_DAYS } from "./app/src/codes.js";

// Prices and limits on the pricing page come from the same code that charges and enforces them.
const dollars = (cents) => "$" + cents / 100;
// Replaced with a function below: a plain "$29" replacement would be read as a special "$2" pattern.
const planTokens = {
  "{{FREE_DAYS}}": String(FREE_DAYS),
  ...Object.fromEntries(Object.keys(PLANS).flatMap((p) => [
    [`{{PRICE_${p.toUpperCase()}}}`, dollars(PRICE[p])],
    [`{{LIMIT_${p.toUpperCase()}}}`, String(PLANS[p].limit)],
  ])),
  "{{UP_STARTER_PLUS}}": dollars(upgradePrice("starter", "plus")),
};

// Replaces {{NAME}} and {{TAGLINE}} in every HTML page with the values from src/config.js.
const brand = () => ({
  name: "brand-placeholders",
  transformIndexHtml: (html) =>
    Object.entries(planTokens).reduce((h, [k, v]) => h.replaceAll(k, () => v),
      html.replaceAll("{{NAME}}", BRAND.name).replaceAll("{{TAGLINE}}", BRAND.tagline)),
});

const page = (file) => resolve(import.meta.dirname, file);

export default defineConfig({
  plugins: [brand()],
  build: {
    // One entry per HTML page, because this is a plain multi-page site (no framework).
    rollupOptions: {
      input: {
        main: page("index.html"),
        about: page("about.html"),
        privacy: page("privacy.html"),
        faq: page("faq.html"),
        signin: page("signin.html"),
        dashboard: page("dashboard.html"),
        pricing: page("pricing.html"),
        check: page("check.html"),
        printGuide: page("print-guide.html"),
      },
    },
  },
});
