import type Stripe from "stripe";
import { sendWelcomePaid } from "@/lib/email/templates/welcome-paid";
import { getStripe } from "@/lib/stripe/server";
import { synchronisiereNachProfil } from "@/lib/discord/mitgliedschaft";
import { schliesseOffeneFaelle } from "@/lib/zahlung/fall";
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
  await schreibeTrichter(supabase, session, "completed");

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

  /*
    Ein laufendes Abo muss weg, sonst zahlt der frisch gekaufte Lifetime-Kunde
    weiter monatlich fuer etwas, das er jetzt dauerhaft besitzt. Gekuendigt
    wird zum Periodenende: Der laufende Monat ist bezahlt, und eine sofortige
    Kuendigung wuerfe die Frage nach einer anteiligen Erstattung auf, die
    niemand gestellt hat.

    Best-effort — der Dauerzugang steht an dieser Stelle bereits. Ein Fehler
    hier darf den Webhook nicht mit 500 antworten lassen, sonst wiederholt
    Stripe das Ereignis drei Tage lang und schreibt jedes Mal erneut
    `lifetime_purchased_at`.
  */
  await beendeLaufendesAbo(supabase, userId);

  /*
    Seit 19.09.2026 kaufen auch Gekündigte und Gesperrte Lifetime (Hinweis in
    Mahnung, Warteraum und Abschied). Offene Zahlungsfälle hören deshalb hier
    auf zu mahnen, und Discord zieht nach: Mitgliederrolle zurück, Warteraum
    ab. Beides wirft nie.
  */
  await schliesseOffeneFaelle(supabase, userId, "Lifetime gekauft.");
  await synchronisiereNachProfil(supabase, userId, "Lifetime gekauft");

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
 * Laufendes Abo nach einem Lifetime-Kauf beenden.
 *
 * Die Freigabe des Dauerzugangs haengt nicht daran: `subscription.deleted`
 * laesst `membership_tier = 'lifetime'` seit 17.09.2026 ausdruecklich stehen.
 *
 * ── Ein ueberfaelliges Abo endet sofort ─────────────────────────────────────
 *
 * Ein bezahltes Abo endet zum Periodenende (der laufende Monat ist bezahlt).
 * Ein Abo mit gescheiterter Abbuchung (`past_due`, `unpaid`) endet **sofort**:
 * Zum Periodenende gekuendigt, versuchte Stripe die offene Rechnung weiter
 * einzuziehen, und gelaenge das, zahlte der Kunde neben 997 € noch einen
 * Monat, den er nicht mehr braucht. Bei der sofortigen Kuendigung stellt
 * Stripe den automatischen Einzug offener Rechnungen ein; die Rechnung selbst
 * bleibt offen (kein Erlass — sie steht in der Fallakte).
 */
async function beendeLaufendesAbo(
  supabase: WebhookSupabase,
  userId: string,
): Promise<void> {
  try {
    const { data } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id,status,cancel_at_period_end")
      .eq("user_id", userId)
      .in("status", ["active", "trialing", "past_due", "unpaid"]);

    const abos = (data ?? []) as Array<{
      stripe_subscription_id: string;
      status: string;
      cancel_at_period_end: boolean;
    }>;

    for (const abo of abos) {
      if (abo.status === "past_due" || abo.status === "unpaid") {
        await getStripe().subscriptions.cancel(abo.stripe_subscription_id, {
          cancellation_details: { comment: "Lifetime gekauft, offene Abbuchung" },
        });
        continue;
      }
      if (abo.cancel_at_period_end) continue;
      await getStripe().subscriptions.update(abo.stripe_subscription_id, {
        cancel_at_period_end: true,
        cancellation_details: { comment: "Lifetime gekauft" },
      });
    }
  } catch (err) {
    console.error(
      `[stripe-webhook] Abo-Kuendigung nach Lifetime-Kauf (user=${userId}) fehlgeschlagen. ` +
        "Der Dauerzugang steht; das Abo muss von Hand beendet werden:",
      err,
    );
  }
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
  await schreibeTrichter(supabase, session, "expired");
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
 *
 * Beim Abschluss kommt der Nachweis der Zustimmung aus der Kasse mit
 * (Migration 091): `consent.terms_of_service`, der Zeitpunkt und der Stand
 * der Rechtstexte aus den Metadaten. Fehlen die Spalten noch, wird ohne sie
 * wiederholt — der Trichter darf an einer nicht eingespielten Migration nicht
 * hängen bleiben.
 */
async function schreibeTrichter(
  supabase: WebhookSupabase,
  session: Stripe.Checkout.Session,
  status: "completed" | "expired",
): Promise<void> {
  const jetzt = new Date().toISOString();
  const basis = { status, ...(status === "completed" ? { bezahlt_am: jetzt } : { abgebrochen_am: jetzt }) };
  const zustimmung = session.consent?.terms_of_service ?? null;
  const nachweis =
    status === "completed"
      ? {
          agb_zustimmung: zustimmung,
          zustimmung_am: zustimmung === "accepted" ? jetzt : null,
          rechtstexte_version: session.metadata?.rechtstexte_version ?? null,
        }
      : {};

  const schreibe = (felder: Record<string, unknown>) =>
    supabase.from("checkout_sessions").update(felder).eq("id", session.id).eq("status", "started");

  let { error } = await schreibe({ ...basis, ...nachweis });
  if (error && status === "completed" && /agb_zustimmung|zustimmung_am|rechtstexte_version|PGRST204/i.test(`${error.code} ${error.message}`)) {
    console.warn(`[stripe-webhook] Zustimmung nicht gespeichert (Migration 091 fehlt?): ${error.message}`);
    ({ error } = await schreibe(basis));
  }

  if (error) {
    console.warn(`[stripe-webhook] Trichter-Update (${session.id} → ${status}) fehlgeschlagen: ${error.message}`);
  }
}
