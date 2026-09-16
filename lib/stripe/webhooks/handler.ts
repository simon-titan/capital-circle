import type Stripe from "stripe";
import type { WebhookSupabase } from "./_helpers";
import { handleCheckoutCompleted, handleCheckoutExpired } from "./checkout-completed";
import { handleSubscriptionUpdated } from "./subscription-updated";
import { handleSubscriptionDeleted } from "./subscription-deleted";
import { handleSubscriptionPaused } from "./subscription-paused";
import { handleInvoicePaid } from "./invoice-paid";
import { handleInvoicePaymentFailed } from "./invoice-payment-failed";

/**
 * Stripe-Event-Dispatcher.
 *
 * Wird vom Webhook-Endpoint NACH dem Idempotenz-Check aufgerufen.
 * Wirft bei Handler-Fehlern → die Route schreibt den Fehler in
 * `stripe_webhook_events.error` und antwortet mit 500, damit Stripe retried.
 *
 * Unbekannte Event-Typen werden bewusst geschluckt (kein Throw), damit Stripe
 * sie als "delivered" markiert und nicht endlos retried.
 */
export async function handleStripeEvent(
  event: Stripe.Event,
  supabase: WebhookSupabase,
): Promise<void> {
  /*
    ── Testmodus kommt im Live-Betrieb hier nicht herein ──────────────────────

    Zeigt die Anwendung mit einem Live-Schlüssel auf die Produktionsdatenbank,
    darf ein lokaler Testkauf dort nichts hinterlassen. Im Schwesterprojekt hat
    genau das einmal zwei Zeilen erzeugt — eine Kasse über 149 € auf
    `completed` und eine Abo-Zeile auf `active` —, beide zählten in MRR und
    Umsatz mit, und der Abgleich meldete die Abo-Zeile bei jedem Lauf als „bei
    Stripe nicht auffindbar", weil es sie im Livemodus nie gab.

    **Geprüft wird `event.livemode`, nicht der ID-Präfix.** Eine
    Testmodus-Abo-ID sieht aus wie jede andere; nur Kassen tragen `cs_test_`.
    Wer über den Präfix filtert, erwischt die Hälfte.

    **Und der Riegel greift nur, wenn wir selbst live sind.** Capital Circle
    läuft derzeit mit einem `sk_test_`-Schlüssel — würde der Riegel
    bedingungslos zuschlagen, käme kein einziges Ereignis mehr durch und der
    gesamte Kaufweg wäre tot. Die Bedingung ist deshalb: Live-Schlüssel plus
    Testmodus-Ereignis. Läuft die App im Testmodus, sind Testereignisse genau
    das, was erwartet wird.
  */
  if (event.livemode === false && process.env.STRIPE_SECRET_KEY?.trim().startsWith("sk_live_")) {
    console.warn(
      `[stripe-webhook] Testmodus-Ereignis ${event.type} (${event.id}) verworfen — ` +
        "es wuerde sonst in denselben Zahlen landen wie echte Kaeufe.",
    );
    return;
  }

  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session,
        supabase,
      );

    // Läuft eine Kasse ab, ohne dass gezahlt wurde. Ohne diesen Fall bliebe
    // die Trichterzeile für immer auf „started" stehen.
    case "checkout.session.expired":
      return handleCheckoutExpired(
        event.data.object as Stripe.Checkout.Session,
        supabase,
      );

    case "customer.subscription.created":
    case "customer.subscription.updated":
      return handleSubscriptionUpdated(
        event.data.object as Stripe.Subscription,
        supabase,
      );

    case "customer.subscription.deleted":
      return handleSubscriptionDeleted(
        event.data.object as Stripe.Subscription,
        supabase,
      );

    case "customer.subscription.paused":
      return handleSubscriptionPaused(
        event.data.object as Stripe.Subscription,
        supabase,
      );

    case "invoice.paid":
      return handleInvoicePaid(
        event.data.object as Stripe.Invoice,
        supabase,
      );

    case "invoice.payment_failed":
      return handleInvoicePaymentFailed(
        event.data.object as Stripe.Invoice,
        supabase,
      );

    default:
      // Unbekannte Events: kein Throw, kein Handling — Stripe markiert als
      // "delivered" sobald wir 2xx zurückgeben. Logging für spätere Triage.
      console.info(`[stripe-webhook] ignoriere event.type=${event.type}`);
      return;
  }
}
