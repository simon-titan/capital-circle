import type Stripe from "stripe";
import {
  loadProfileByCustomerId,
  pausiereProfil,
  type WebhookSupabase,
} from "./_helpers";

/**
 * `customer.subscription.paused`
 *
 * Stripe setzt diesen Status, wenn eine Testphase ohne hinterlegte Zahlungs-
 * methode endet. Die Pause, die ein Mitglied im Kündigungs-Flow wählt, läuft
 * dagegen über `pause_collection` und kommt als `subscription.updated` an —
 * behandelt wird sie dort, mit demselben Ergebnis.
 *
 * Die `subscriptions`-Row bleibt stehen (der Status kommt über
 * `subscription.updated`); nur der Zugang endet.
 */
export async function handleSubscriptionPaused(
  sub: Stripe.Subscription,
  supabase: WebhookSupabase,
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return;

  const profile = await loadProfileByCustomerId(supabase, customerId);
  if (!profile) return;

  // Trial-Pause: Es wurde nie gezahlt, der Zugang endet sofort.
  await pausiereProfil(supabase, profile.id, new Date().toISOString());
}
