import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import {
  extractCurrentPeriod,
  loadProfileByCustomerId,
  unixToISO,
  type WebhookSupabase,
} from "./_helpers";

/**
 * `invoice.paid`
 *
 * - Payment-Row anlegen (idempotent: UNIQUE auf `stripe_invoice_id`)
 * - Bei zugehöriger Subscription: `current_period_end` aktualisieren
 *   (sowohl in `subscriptions` als auch `profiles.access_until`)
 * - Reset der Dunning-Mail-Zähler, damit der nächste Failure wieder mit
 *   Mail 1 startet.
 */
export async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  supabase: WebhookSupabase,
): Promise<void> {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;
  if (!customerId) {
    throw new Error(`Invoice ${invoice.id} ohne customer-ID`);
  }

  const profile = await loadProfileByCustomerId(supabase, customerId);
  if (!profile) {
    console.warn(
      `[stripe-webhook] invoice.paid: Kein Profil für customer=${customerId} (invoice=${invoice.id})`,
    );
    return;
  }

  const paidAtISO = invoice.status_transitions?.paid_at
    ? unixToISO(invoice.status_transitions.paid_at)
    : new Date().toISOString();

  // `payment_intent` und `charge` sind seit API `dahlia` keine Top-Level-
  // Felder mehr; sie leben in `invoice.payments[].payment.payment_intent`.
  // Wir verzichten auf den extra Round-Trip — `stripe_invoice_id` reicht als
  // eindeutige Korrelation zwischen Webhook und DB.
  const paymentRow = {
    user_id: profile.id,
    stripe_invoice_id: invoice.id,
    amount_cents: invoice.amount_paid,
    currency: invoice.currency,
    status: "succeeded" as const,
    paid_at: paidAtISO,
  };

  const { error: paymentError } = await supabase
    .from("payments")
    .upsert(paymentRow, { onConflict: "stripe_invoice_id" });

  if (paymentError) {
    throw new Error(
      `payments UPSERT fehlgeschlagen (invoice=${invoice.id}): ${paymentError.message}`,
    );
  }

  // Subscription-spezifischer Periodendaten-Refresh (nur bei
  // Subscription-Invoices). `invoice.subscription` ist deprecated im neuen
  // API — wir lesen aus dem ersten Line-Item.
  const lineSub = invoice.lines?.data?.find((l) => l.subscription);
  const subId =
    typeof lineSub?.subscription === "string"
      ? lineSub.subscription
      : (lineSub?.subscription?.id ?? null);

  if (subId) {
    try {
      const sub = await getStripe().subscriptions.retrieve(subId);
      const { endISO } = extractCurrentPeriod(sub);

      await supabase
        .from("subscriptions")
        .update({ current_period_end: endISO })
        .eq("stripe_subscription_id", subId);

      await supabase
        .from("profiles")
        .update({ access_until: endISO })
        .eq("id", profile.id);
    } catch (err) {
      console.warn(
        `[stripe-webhook] invoice.paid: Period-Refresh für sub=${subId} fehlgeschlagen:`,
        err,
      );
    }
  }

  if (profile.membership_tier === "monthly") {
    await supabase
      .from("profiles")
      .update({
        payment_failed_email_1_sent_at: null,
        payment_failed_email_2_sent_at: null,
        payment_failed_email_3_sent_at: null,
      })
      .eq("id", profile.id);
  }
}
