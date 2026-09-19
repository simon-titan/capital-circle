import type Stripe from "stripe";
import { synchronisiereNachProfil } from "@/lib/discord/mitgliedschaft";
import { resolvePlanFromPriceId } from "@/lib/stripe/plan-map";
import {
  extractCurrentPeriod,
  extractPriceId,
  loadProfileByCustomerId,
  type WebhookSupabase,
} from "./_helpers";

/**
 * `customer.subscription.resumed`
 *
 * Das Gegenstück zu `subscription-paused.ts`. Ohne diesen Handler blieb ein
 * Mitglied nach einer Pause auf `free` stehen: Die Pause setzt das Profil
 * zurück, und `subscription.updated` allein hätte es zwar wieder aktiviert,
 * aber Stripe schickt beim Fortsetzen zuerst `resumed` — und der lief bis
 * 17.09.2026 in den Default-Zweig des Dispatchers, der Ereignisse still
 * verwirft. Wer die Pause selbst beendete, zahlte also wieder, sah aber
 * weiterhin das Free-Konto.
 *
 * Bewusst **ohne** Willkommensmail: Der Nutzer ist nicht neu, er kommt zurück.
 * Deshalb auch kein Rückgriff auf `handleSubscriptionUpdated` — dessen
 * Mail-Zweig prüft „war schon zahlend", und nach der Pause steht dort `free`.
 */
export async function handleSubscriptionResumed(
  sub: Stripe.Subscription,
  supabase: WebhookSupabase,
): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return;

  const profile = await loadProfileByCustomerId(supabase, customerId);
  if (!profile) return;

  const plan = resolvePlanFromPriceId(extractPriceId(sub)) ?? "monthly";
  const { startISO, endISO } = extractCurrentPeriod(sub);

  const { error: aboFehler } = await supabase
    .from("subscriptions")
    .update({
      status: sub.status,
      current_period_start: startISO,
      current_period_end: endISO,
      cancel_at_period_end: sub.cancel_at_period_end,
    })
    .eq("stripe_subscription_id", sub.id);

  if (aboFehler) {
    throw new Error(
      `subscriptions-Update nach Fortsetzen (sub=${sub.id}) fehlgeschlagen: ${aboFehler.message}`,
    );
  }

  // Lifetime und 1:1 stehen über jedem Abo (Begründung in subscription-updated.ts).
  if (profile.membership_tier === "lifetime" || profile.membership_tier === "ht_1on1") return;

  const { error } = await supabase
    .from("profiles")
    .update({ membership_tier: plan, is_paid: true, access_until: endISO })
    .eq("id", profile.id);

  if (error) {
    throw new Error(
      `Profil-Fortsetzung (user=${profile.id}) fehlgeschlagen: ${error.message}`,
    );
  }

  // Zugang ist zurück: Mitgliederrolle wieder an, Warteraum ab. Wirft nie.
  await synchronisiereNachProfil(supabase, profile.id, "subscription.resumed");
}
