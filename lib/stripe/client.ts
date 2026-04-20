import { loadStripe, type Stripe as StripeClient } from "@stripe/stripe-js";

/**
 * Browser-seitiger Stripe-Client (für Embedded Checkout, Elements, Payment-
 * Buttons). `loadStripe()` cached intern; trotzdem cachen wir die Promise hier
 * pro Modul-Instanz, damit React-Komponenten den selben Client wiederverwenden.
 */
let _stripePromise: Promise<StripeClient | null> | null = null;

export function getStripePromise(): Promise<StripeClient | null> {
  if (_stripePromise) return _stripePromise;
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    if (typeof window !== "undefined") {
      console.warn("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY missing");
    }
    _stripePromise = Promise.resolve(null);
    return _stripePromise;
  }
  _stripePromise = loadStripe(key);
  return _stripePromise;
}

/**
 * Backwards-compat-Alias: gleiches Promise wie `getStripePromise()`, aber als
 * Eager-Property — manche `<Elements>`-Wrapper erwarten direkt die Promise.
 */
export const stripePromise = getStripePromise();
