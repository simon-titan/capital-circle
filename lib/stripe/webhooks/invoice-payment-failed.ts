import type Stripe from "stripe";
import { sendPaymentFailed1 } from "@/lib/email/templates/payment-failed-1";
import {
  loadAuthEmail,
  loadProfileByCustomerId,
  pickFirstName,
  type WebhookSupabase,
} from "./_helpers";

/**
 * `invoice.payment_failed`
 *
 * - Payment-Row mit `status='failed'` (idempotent: UNIQUE auf invoice-ID)
 * - 48h Grace Period: `access_until = now()+48h`
 *   (Stripe versucht Smart-Retries; in dem Fenster soll der User
 *   weiterhin Zugang haben.)
 * - Sofort die erste Dunning-Mail senden, falls `payment_failed_email_1_sent_at`
 *   noch NULL ist. Mail 2/3 übernehmen die Cron-Jobs (Paket 6).
 */
export async function handleInvoicePaymentFailed(
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
      `[stripe-webhook] invoice.payment_failed: Kein Profil für customer=${customerId}`,
    );
    return;
  }

  const failureMessage =
    invoice.last_finalization_error?.message ??
    invoice.last_finalization_error?.code ??
    null;

  // `payment_intent` ist seit API `dahlia` kein Top-Level-Feld mehr (siehe
  // Kommentar in invoice-paid.ts). Korrelation läuft über `stripe_invoice_id`.
  const paymentRow = {
    user_id: profile.id,
    stripe_invoice_id: invoice.id,
    amount_cents: invoice.amount_due,
    currency: invoice.currency,
    status: "failed" as const,
    failure_reason: failureMessage,
    attempt_count: invoice.attempt_count ?? 1,
  };

  const { error: paymentError } = await supabase
    .from("payments")
    .upsert(paymentRow, { onConflict: "stripe_invoice_id" });

  if (paymentError) {
    throw new Error(
      `payments UPSERT (failed) fehlgeschlagen (invoice=${invoice.id}): ${paymentError.message}`,
    );
  }

  const graceUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const { error: graceError } = await supabase
    .from("profiles")
    .update({ access_until: graceUntil })
    .eq("id", profile.id);

  if (graceError) {
    throw new Error(
      `48h-Grace-Update (user=${profile.id}) fehlgeschlagen: ${graceError.message}`,
    );
  }

  if (!profile.payment_failed_email_1_sent_at) {
    const email = await loadAuthEmail(supabase, profile.id);
    if (email) {
      const result = await sendPaymentFailed1({
        firstName: pickFirstName(profile),
        email,
        userId: profile.id,
      });
      if (!result.skipped) {
        await supabase
          .from("profiles")
          .update({ payment_failed_email_1_sent_at: new Date().toISOString() })
          .eq("id", profile.id);
      }
    }
  }
}
