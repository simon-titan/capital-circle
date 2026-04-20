import type { Metadata } from "next";
import { CheckoutClient } from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout — Capital Circle",
  description: "Schließe deine Mitgliedschaft ab.",
};

export const dynamic = "force-dynamic";

/**
 * Checkout-Seite mit eingebettetem Stripe-Checkout. Tatsächliche Logik (Plan
 * lesen, ggf. clientSecret nachladen) liegt im Client-Subcomponent — die
 * Server-Wrapper-Page existiert nur, damit Next die Route + Metadata sauber
 * abbildet.
 */
export default function CheckoutPage() {
  return <CheckoutClient />;
}
