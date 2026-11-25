import { defineConfig } from "vite";
import { resolve } from "node:path";
import { BRAND } from "./src/config.js";

// Replaces {{NAME}} and {{TAGLINE}} in every HTML page with the values from src/config.js.
const brand = () => ({
  name: "brand-placeholders",
  transformIndexHtml: (html) =>
    html.replaceAll("{{NAME}}", BRAND.name).replaceAll("{{TAGLINE}}", BRAND.tagline),
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
      },
    },
  },
});
