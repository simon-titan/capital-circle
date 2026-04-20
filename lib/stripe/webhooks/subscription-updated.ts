import type Stripe from "stripe";
import { sendWelcomePaid } from "@/lib/email/templates/welcome-paid";
import {
  extractCurrentPeriod,
  extractPriceId,
  loadAuthEmail,
  loadProfileByCustomerId,
  pickFirstName,
  unixToISO,
  type WebhookSupabase,
} from "./_helpers";

const ACTIVE_STATUSES: ReadonlySet<Stripe.Subscription.Status> = new Set([
  "active",
  "trialing",
]);

/**
 * `customer.subscription.created` + `customer.subscription.updated`
 *
 * - UPSERT in `subscriptions` (Quelle der Wahrheit pro Stripe-Subscription)
 * - Profil-Sync nur wenn Status active/trialing:
 *     `membership_tier='monthly'`, `is_paid=true`, `access_until=period_end`
 * - Bei `created` mit aktivem Status zusätzlich Welcome-Mail (idempotent über
 *   `email_sequence_log` UNIQUE).
 *
 * Nicht-aktive Übergänge (past_due, paused, canceled, …) werden hier NICHT
 * proaktiv auf `free` zurückgesetzt — das erledigt `subscription.deleted`,
 * weil Stripe `cancel_at_period_end=true` als `updated` schickt, der Zugang
 * aber bis Periodenende erhalten bleiben soll.
 */
export async function handleSubscriptionUpdated(
  sub: Stripe.Subscription,
  supabase: WebhookSupabase,
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) {
    throw new Error(`Subscription ${sub.id} ohne customer-ID`);
  }

  const profile = await loadProfileByCustomerId(supabase, customerId);
  if (!profile) {
    console.warn(
      `[stripe-webhook] subscription.updated: Kein Profil für customer=${customerId} (sub=${sub.id})`,
    );
    return;
  }

  const { startISO, endISO } = extractCurrentPeriod(sub);
  const priceId = extractPriceId(sub);

  const subRow = {
    user_id: profile.id,
    stripe_subscription_id: sub.id,
    stripe_customer_id: customerId,
    stripe_price_id: priceId,
    status: sub.status,
    current_period_start: startISO,
    current_period_end: endISO,
    cancel_at_period_end: sub.cancel_at_period_end,
    canceled_at: sub.canceled_at ? unixToISO(sub.canceled_at) : null,
  };

  const { error: upsertError } = await supabase
    .from("subscriptions")
    .upsert(subRow, { onConflict: "stripe_subscription_id" });

  if (upsertError) {
    throw new Error(
      `subscriptions UPSERT fehlgeschlagen (sub=${sub.id}): ${upsertError.message}`,
    );
  }

  if (!ACTIVE_STATUSES.has(sub.status)) {
    return;
  }

  const wasMonthlyAlready = profile.membership_tier === "monthly";

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      membership_tier: "monthly",
      is_paid: true,
      access_until: endISO,
    })
    .eq("id", profile.id);

  if (profileError) {
    throw new Error(
      `Profil-Sync (sub=${sub.id}, user=${profile.id}) fehlgeschlagen: ${profileError.message}`,
    );
  }

  // Welcome-Mail nur beim ersten Übergang in `monthly`. `email_sequence_log`
  // garantiert über UNIQUE-Constraint zusätzliche Idempotenz.
  if (!wasMonthlyAlready) {
    const email = await loadAuthEmail(supabase, profile.id);
    if (email) {
      await sendWelcomePaid({
        firstName: pickFirstName(profile),
        email,
        userId: profile.id,
        tier: "monthly",
      });
    }
  }
}
