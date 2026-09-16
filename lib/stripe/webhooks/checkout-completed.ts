import type Stripe from "stripe";
import { sendWelcomePaid } from "@/lib/email/templates/welcome-paid";
import {
  extractCustomerId,
  loadAuthEmail,
  loadProfileByUserId,
  pickFirstName,
  type WebhookSupabase,
} from "./_helpers";

/**
 * `checkout.session.completed`
 *
 * Zwei Modi:
 *   - `mode: 'subscription'` → die Mitgliedschaft. Hier passiert **kein**
 *     Profil-Update: Das erledigt `customer.subscription.created/.updated`,
 *     weil erst dort Preis-ID und Abrechnungszeitraum zuverlässig vorliegen.
 *     Diese Funktion schreibt nur den Trichter fort.
 *   - `mode: 'payment'` → der frühere Lifetime-Kauf (Einmalzahlung). Aus dem
 *     Verkauf genommen, der Pfad bleibt aber bestehen: Ein Nachzügler-Event
 *     oder eine von Hand angelegte Zahlung darf nicht ins Leere laufen.
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: WebhookSupabase,
): Promise<void> {
  await schreibeTrichter(supabase, session.id, "completed");

  /**
   * Der Abo-Fall verlässt die Funktion, BEVOR `metadata.user_id` verlangt
   * wird. Diese Reihenfolge ist der Unterschied zwischen funktionierendem und
   * totem Gast-Checkout: Eine Session aus `/go/<plan>` hat naturgemäß keine
   * `user_id` — es gibt zu diesem Zeitpunkt noch kein Konto. Stünde die
   * Prüfung wie früher oben, würde hier bei jedem Gastkauf geworfen, der
   * Webhook antwortete mit 500, und Stripe wiederholte drei Tage lang ein
   * Ereignis, für das es gar nichts zu tun gibt.
   */
  if (session.mode === "subscription") {
    return;
  }

  if (session.mode !== "payment") {
    return;
  }

  const userId = session.metadata?.user_id;
  if (!userId) {
    throw new Error(`checkout.session.completed (payment) ohne metadata.user_id (session=${session.id})`);
  }

  const customerId = extractCustomerId(session.customer);

  const update: Record<string, unknown> = {
    membership_tier: "lifetime",
    is_paid: true,
    lifetime_purchased_at: new Date().toISOString(),
    access_until: null,
  };
  if (customerId) {
    update.stripe_customer_id = customerId;
  }

  const { error: updateError } = await supabase.from("profiles").update(update).eq("id", userId);

  if (updateError) {
    throw new Error(`Lifetime-Update für ${userId} fehlgeschlagen: ${updateError.message}`);
  }

  const profile = await loadProfileByUserId(supabase, userId);
  const email =
    session.customer_details?.email ??
    session.customer_email ??
    (await loadAuthEmail(supabase, userId));
  if (!email) {
    return;
  }

  await sendWelcomePaid({
    firstName: pickFirstName(profile),
    email,
    userId,
    tier: "lifetime",
  });
}

/**
 * `checkout.session.expired`
 *
 * Kommt, wenn die Kasse abläuft, ohne dass gezahlt wurde — bei uns nach zwei
 * Stunden (`expires_at` in `/go/<plan>`). Ohne diesen Handler bliebe die
 * Trichterzeile für immer auf `started` stehen, und ein Abbruch wäre von einem
 * noch laufenden Kauf nicht zu unterscheiden.
 */
export async function handleCheckoutExpired(
  session: Stripe.Checkout.Session,
  supabase: WebhookSupabase,
): Promise<void> {
  await schreibeTrichter(supabase, session.id, "expired");
}

/**
 * Trichterstand fortschreiben.
 *
 * Die Tabelle ist reine Auswertung, deshalb hält ein Fehler den Webhook nicht
 * auf — er wird nur protokolliert. `supabase-js` wirft dabei nicht, es liefert
 * `error` zurück; ohne die ausdrückliche Prüfung sähe ein stiller `PGRST204`
 * wie ein Erfolg aus.
 *
 * `.eq("status", "started")` schützt die Reihenfolge: `completed` und
 * `expired` können in beliebiger Folge eintreffen, und ein abgelaufenes
 * Ereignis darf einen bereits verbuchten Kauf nicht überschreiben.
 */
async function schreibeTrichter(
  supabase: WebhookSupabase,
  sessionId: string,
  status: "completed" | "expired",
): Promise<void> {
  const { error } = await supabase
    .from("checkout_sessions")
    .update({
      status,
      ...(status === "completed"
        ? { bezahlt_am: new Date().toISOString() }
        : { abgebrochen_am: new Date().toISOString() }),
    })
    .eq("id", sessionId)
    .eq("status", "started");

  if (error) {
    console.warn(`[stripe-webhook] Trichter-Update (${sessionId} → ${status}) fehlgeschlagen: ${error.message}`);
  }
}
