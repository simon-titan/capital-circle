import type Stripe from "stripe";
import { sendCancellationSurvey } from "@/lib/email/templates/cancellation-survey";
import {
  loadAuthEmail,
  loadProfileByCustomerId,
  pickFirstName,
  type WebhookSupabase,
} from "./_helpers";

/**
 * `customer.subscription.deleted`
 *
 * Tritt am Periodenende ein, nachdem im Portal gekündigt wurde — oder sofort,
 * wenn Stripe-Admin die Subscription killt. Ablauf:
 *   1. `subscriptions.status='canceled'`, `canceled_at=now()`
 *   2. Profil zurück auf `free`, `is_paid=false`, `access_until=now()`
 *   3. Cancellation-Survey (idempotent über `email_sequence_log`)
 *   4. `cancellations`-Row als Vorlage für Offboarding-Survey
 */
export async function handleSubscriptionDeleted(
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
      `[stripe-webhook] subscription.deleted: Kein Profil für customer=${customerId}`,
    );
    return;
  }

  const nowISO = new Date().toISOString();

  const { data: subRow, error: subError } = await supabase
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: nowISO })
    .eq("stripe_subscription_id", sub.id)
    .select("id")
    .maybeSingle();

  if (subError) {
    throw new Error(
      `subscriptions UPDATE (cancel) fehlgeschlagen (sub=${sub.id}): ${subError.message}`,
    );
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      membership_tier: "free",
      is_paid: false,
      access_until: nowISO,
    })
    .eq("id", profile.id);

  if (profileError) {
    throw new Error(
      `Profil-Reset bei Cancel (user=${profile.id}) fehlgeschlagen: ${profileError.message}`,
    );
  }

  const { error: cancelInsertError } = await supabase
    .from("cancellations")
    .insert({
      user_id: profile.id,
      subscription_id: (subRow as { id?: string } | null)?.id ?? null,
      canceled_at: nowISO,
    });

  // Doppelte Insert (Webhook 2x) tolerieren — sonst wirft RLS/Unique nicht,
  // weil `cancellations` keine Eindeutigkeit auf user+sub hat. Doppel-Insert
  // wäre ein Daten-Hygiene-Issue, aber nicht fatal — wir loggen es.
  if (cancelInsertError) {
    console.warn(
      `[stripe-webhook] cancellations INSERT warn (user=${profile.id}, sub=${sub.id}): ${cancelInsertError.message}`,
    );
  }

  const email = await loadAuthEmail(supabase, profile.id);
  if (email) {
    await sendCancellationSurvey({
      firstName: pickFirstName(profile),
      email,
      userId: profile.id,
    });
  }
}
