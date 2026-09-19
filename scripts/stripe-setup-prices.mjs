/**
 * Legt die drei Membership-Preise (99 €/Monat, 267 €/Quartal, 599 €/Jahr) in
 * Stripe an — idempotent über `lookup_key`. Gibt die Price-IDs aus.
 *
 *   node scripts/stripe-setup-prices.mjs          Dry-Run: zeigt Produkt/Preise, legt nichts an
 *   node scripts/stripe-setup-prices.mjs --apply  legt an
 */
import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import Stripe from "stripe";

const ROOT = process.cwd();
for (const f of [".env.local", ".env"]) {
  const full = path.resolve(ROOT, f);
  if (existsSync(full)) dotenv.config({ path: full, override: false });
}

const apply = process.argv.includes("--apply");
const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) throw new Error("STRIPE_SECRET_KEY fehlt");
const stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });

console.log(`Modus: ${key.startsWith("sk_live") ? "LIVE" : "TEST"} · ${apply ? "APPLY" : "DRY-RUN"}`);

const PLANS = [
  { lookup: "cc_membership_monthly", nickname: "Capital Circle — Monatlich", amount: 9900, interval: "month", count: 1 },
  { lookup: "cc_membership_quarterly", nickname: "Capital Circle — Vierteljährlich", amount: 26700, interval: "month", count: 3 },
  { lookup: "cc_membership_yearly", nickname: "Capital Circle — Jährlich", amount: 59900, interval: "year", count: 1 },
];

// Bestand zeigen
const existingPrices = await stripe.prices.list({ limit: 100, expand: ["data.product"] });
console.log("\n── Vorhandene Preise ──");
for (const p of existingPrices.data) {
  const rec = p.recurring ? `${p.recurring.interval_count}×${p.recurring.interval}` : "einmalig";
  console.log(
    `  ${p.id}  ${(p.unit_amount / 100).toFixed(2)} ${p.currency.toUpperCase()}  ${rec}  ${p.product?.name ?? ""}  ${p.active ? "" : "(inaktiv)"}  ${p.lookup_key ?? ""}`,
  );
}

// Produkt finden/anlegen
const PRODUCT_NAME = "Capital Circle Membership";
const products = await stripe.products.list({ limit: 100 });
let product = products.data.find((p) => p.name === PRODUCT_NAME && p.active);
console.log(`\nProdukt "${PRODUCT_NAME}": ${product ? product.id : "existiert nicht"}`);

if (!apply) {
  console.log("\nDry-Run — nichts angelegt. Mit --apply erneut aufrufen.");
  process.exit(0);
}

if (!product) {
  product = await stripe.products.create({
    name: PRODUCT_NAME,
    description: "Zugang zu Institut, Live-Sessions, Journal und Community.",
    tax_code: "txcd_10103000", // Digitale Dienstleistung (Online-Kurs/Mitgliedschaft)
  });
  console.log(`  angelegt: ${product.id}`);
}

const out = {};
for (const plan of PLANS) {
  const found = await stripe.prices.list({ lookup_keys: [plan.lookup], limit: 1 });
  if (found.data[0]) {
    out[plan.lookup] = found.data[0].id;
    console.log(`  ${plan.lookup}: bereits vorhanden → ${found.data[0].id}`);
    continue;
  }
  const price = await stripe.prices.create({
    product: product.id,
    nickname: plan.nickname,
    currency: "eur",
    unit_amount: plan.amount,
    lookup_key: plan.lookup,
    tax_behavior: "inclusive", // Preise im Mockup sind Brutto-Endpreise (B2C, DE)
    recurring: { interval: plan.interval, interval_count: plan.count },
  });
  out[plan.lookup] = price.id;
  console.log(`  ${plan.lookup}: angelegt → ${price.id}`);
}

console.log("\n── .env-Zeilen ──");
console.log(`STRIPE_PRICE_MONTHLY=${out.cc_membership_monthly}`);
console.log(`STRIPE_PRICE_QUARTERLY=${out.cc_membership_quarterly}`);
console.log(`STRIPE_PRICE_YEARLY=${out.cc_membership_yearly}`);
