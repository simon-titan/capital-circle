import type Stripe from "stripe";
import {
  loadProfileByCustomerId,
  type WebhookSupabase,
} from "./_helpers";

/**
 * `customer.subscription.paused`
 *
 * Stripe pausiert Subscriptions z. B. bei "Pause Collection" im Portal.
 * Solange pausiert: kein Zugang, aber wir lassen die `subscriptions`-Row
 * stehen (status wird über `subscription.updated` separat synchronisiert).
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

  const { error } = await supabase
    .from("profiles")
    .update({
      membership_tier: "free",
      is_paid: false,
    })
    .eq("id", profile.id);

  if (error) {
    throw new Error(
      `Profil-Pause (user=${profile.id}) fehlgeschlagen: ${error.message}`,
    );
  }
}
