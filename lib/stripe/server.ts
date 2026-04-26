import Stripe from "stripe";

/**
 * Server-seitiger Stripe-Client.
 *
 * Lazy-Init: kein Throw beim Modul-Import, damit Build-Zeit auf Vercel nicht
 * failt, wenn `STRIPE_SECRET_KEY` (z. B. in Preview-Builds ohne ENV) fehlt.
 * Erst beim ersten Aufruf von `getStripe()` wird der Key geprüft.
 *
 * API-Version: explizit gepinnt auf die Default-Version, die `stripe@22` mit
 * sich bringt (`2026-03-25.dahlia`). Beim SDK-Update prüfen, ob die Version
 * angepasst werden muss — siehe `node_modules/stripe/cjs/apiVersion.d.ts`
 * und das Stripe-Changelog.
 *
 * Wichtige Folgewirkungen seit `clover`/`dahlia`:
 *   - `Stripe.Subscription.current_period_start/end` wurde auf
 *     `Stripe.Subscription.items.data[0].current_period_start/end` verschoben.
 *     → Webhook-Helper `extractCurrentPeriod()` deckt das ab.
 *   - `Stripe.Invoice.payment_intent` / `charge` sind als Top-Level-Property
 *     entfernt; die zugehörige PaymentIntent-/Charge-ID lebt jetzt unter
 *     `invoice.payments[].payment.payment_intent`. Wir verzichten in den
 *     Webhook-Handlern auf diese Felder (die DB-Spalten bleiben optional
 *     leer; `stripe_invoice_id` reicht als Korrelations-Key).
 *   - `ui_mode: 'embedded'` heißt seit dahlia `'embedded_page'`.
 */
const STRIPE_API_VERSION = "2026-03-25.dahlia" as const;

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY missing");
  }
  _stripe = new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
    appInfo: { name: "Capital Circle", version: "1.0.0" },
  });
  return _stripe;
}

/**
 * Convenience-Re-Export für Top-Level-Importe à la
 * `import { stripe } from "@/lib/stripe/server"`.
 *
 * Property-Getter, damit der ENV-Check lazy bleibt — andernfalls würde der
 * Import in Server-Komponenten beim Render bereits einen Throw auslösen, auch
 * wenn die Funktion am Ende gar nicht aufgerufen wird.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver);
  },
});

export { STRIPE_API_VERSION };
