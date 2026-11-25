// Pricing page. Signed out, the buttons are plain links to sign-in (they work without this script).
// Signed in, each card shows what you have, what's included, or the exact "pay the difference" price,
// and a paid button starts Dodo's checkout.
import { upgradeKey, upgradePrice } from "../app/src/billing.js";

const dollars = (cents) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

async function me() {
  try {
    const r = await fetch("/api/me", { credentials: "same-origin" });
    return r.ok ? await r.json() : null;
  } catch {
    return null; // offline or the API is down: the signed-out links still work
  }
}

async function checkout(plan, button, error) {
  error.textContent = "";
  button.setAttribute("aria-disabled", "true");
  let data = {};
  try {
    const r = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan }),
      credentials: "same-origin",
    });
    data = await r.json();
  } catch { /* handled below */ }
  // Only ever leave for an https checkout address that our own server handed back.
  if (data.ok && /^https:\/\//.test(data.checkout_url ?? "")) return location.assign(data.checkout_url);
  button.removeAttribute("aria-disabled");
  error.textContent = data.error ?? "Checkout couldn't start. Please try again.";
}

export async function initPricing() {
  const account = await me();
  if (!account?.plan) return;

  document.getElementById("pricing-who").textContent = `Signed in as ${account.email}.`;
  for (const card of document.querySelectorAll("[data-plan]")) {
    const plan = card.dataset.plan;
    const name = card.querySelector("h2").textContent;
    const button = card.querySelector(".tier-btn");
    const error = card.querySelector(".tier-error");

    if (plan === account.plan) {
      card.classList.add("tier-current");
      const badge = document.createElement("p");
      badge.className = "pill pill-ok tier-badge";
      badge.textContent = "Your plan";
      card.querySelector("h2").after(badge);
      button.textContent = "Go to your codes";
      button.href = "/dashboard.html";
      button.classList.remove("btn-primary");
    } else if (!upgradeKey(account.plan, plan)) {
      // A lower plan than the one you have: everything in it is already yours.
      card.classList.add("tier-below");
      button.replaceWith(Object.assign(document.createElement("p"), { className: "hint tier-included", textContent: "Included in your plan" }));
    } else {
      const price = dollars(upgradePrice(account.plan, plan));
      button.textContent = account.plan === "free" ? `Buy ${name}: ${price} once` : `Upgrade to ${name}: pay ${price}`;
      button.href = "#";
      button.addEventListener("click", (e) => {
        e.preventDefault();
        if (button.getAttribute("aria-disabled") !== "true") checkout(plan, button, error);
      });
    }
  }
}
