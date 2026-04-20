import type Stripe from "stripe";
import type { WebhookSupabase } from "./_helpers";
import { handleCheckoutCompleted } from "./checkout-completed";
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
  switch (event.type) {
    case "checkout.session.completed":
      return handleCheckoutCompleted(
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
