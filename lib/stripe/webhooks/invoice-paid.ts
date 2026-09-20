import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { synchronisiereNachProfil } from "@/lib/discord/mitgliedschaft";
import { schliesseFallZuRechnung } from "@/lib/zahlung/fall";
import {
  extractCurrentPeriod,
  loadProfileByCustomerId,
  unixToISO,
  type WebhookSupabase,
} from "./_helpers";

/**
 * Abo-ID einer Rechnung.
 *
 * Seit API `basil` steht sie weder auf `invoice.subscription` noch auf
 * `lines.data[].subscription`, sondern unter `invoice.parent`. Genau dort hat
 * der Handler bis 19.09.2026 nicht gesucht — `subId` war immer `null`, der
 * Perioden-Refresh unten lief nie, und nach einer nachgeholten Zahlung hing
 * `access_until` am Ende der 48-Stunden-Gnadenfrist, bis zufällig noch ein
 * `subscription.updated` kam. Die alten Felder bleiben als Rückfall für
 * Ereignisse, die mit einer älteren API-Version gerendert wurden.
 */
function aboIdAusRechnung(invoice: Stripe.Invoice): string | null {
  const ausParent = invoice.parent?.subscription_details?.subscription;
  if (ausParent) return typeof ausParent === "string" ? ausParent : ausParent.id;

  for (const zeile of invoice.lines?.data ?? []) {
    const ausZeile = zeile.parent?.subscription_item_details?.subscription;
    if (ausZeile) return ausZeile;
    const alt = (zeile as { subscription?: string | { id: string } | null }).subscription;
    if (alt) return typeof alt === "string" ? alt : alt.id;
  }
  return null;
}

/**
 * `invoice.paid`
 *
 * - Payment-Row anlegen (idempotent: UNIQUE auf `stripe_invoice_id`)
 * - Bei zugehöriger Subscription: `current_period_end` aktualisieren
 *   (sowohl in `subscriptions` als auch `profiles.access_until`)
 * - Einen offenen Zahlungsfall zu dieser Rechnung schliessen
 *   (`lib/zahlung/fall.ts`) und die Mitgliederrolle nach dem Profil richten —
 *   wer im Warteraum sass, bekommt seine Kanäle zurück.
 *
 * Die alten Mahn-Stempel (`payment_failed_email_*`) werden nicht mehr
 * zurückgesetzt, weil sie nicht mehr gelesen werden: Die Mahnstrecke hängt
 * seit 19.09.2026 am Fall je Rechnung, und ein zweiter Ausfall ist eine neue
 * Rechnung und damit ein neuer Fall. Genau das war der Zweck des Resets.
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

  const subId = aboIdAusRechnung(invoice);

  const profile = await loadProfileByCustomerId(supabase, customerId);
  if (!profile) {
    /*
      Abo-Rechnung ohne Profil heißt fast immer: Das Konto entsteht gerade
      erst, in `subscription.created`/`.updated` — und Stripe hat die Rechnung
      zuerst zugestellt. Bei synchron bezahlten Abos ist das sogar die
      natürliche Reihenfolge (`invoice.paid` vor `subscription.created`).
      Bis 19.09.2026 stand hier ein stilles `return`: Stripe bekam 200, und die
      erste Zahlung fehlte für immer in `payments` (Umsatz, Rechnungsliste).
      Werfen lässt Stripe wiederholen; beim nächsten Versuch steht das Konto.
      Rechnungen ohne Abo (von Hand im Dashboard angelegt) gehören zu keinem
      Kaufweg und bleiben beim Protokolleintrag.
    */
    if (subId) {
      throw new Error(
        `invoice.paid: Profil für customer=${customerId} (sub=${subId}) noch nicht angelegt. Stripe soll wiederholen`,
      );
    }
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
  // Subscription-Invoices).
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

  /*
    Erst den Fall schliessen, dann die Rolle richten: Solange der Fall offen
    steht, ist er für niemanden mehr relevant, und `synchronisiereNachProfil`
    liest den gerade aktualisierten `access_until`.
  */
  if (invoice.id) await schliesseFallZuRechnung(supabase, invoice.id);
  await synchronisiereNachProfil(supabase, profile.id, "invoice.paid");
}
