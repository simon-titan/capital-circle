import type Stripe from "stripe";
import { createSetPasswordLink } from "@/lib/auth/password-link";
import { synchronisiereNachProfil } from "@/lib/discord/mitgliedschaft";
import { zugangBeendetInDiscord } from "@/lib/discord/warteraum";
import { sendWelcomePaid } from "@/lib/email/templates/welcome-paid";
import { getStripe } from "@/lib/stripe/server";
import { MEMBERSHIP_PLANS, resolvePlanFromPriceId, type MembershipPlan } from "@/lib/stripe/plan-map";
import {
  extractCurrentPeriod,
  extractPriceId,
  getOrCreateUserByEmail,
  loadAuthEmail,
  loadProfileByCustomerId,
  pausiereProfil,
  pickFirstName,
  unixToISO,
  type WebhookSupabase,
} from "./_helpers";

const ACTIVE_STATUSES: ReadonlySet<Stripe.Subscription.Status> = new Set(["active", "trialing"]);

/**
 * `customer.subscription.created` + `customer.subscription.updated`
 *
 * ── Warum die Kontoanlage hier steht und nicht in `checkout.session.completed` ──
 *
 * Seit dem Gast-Checkout über `/go/<plan>` gibt es Käufer ohne vorheriges
 * Konto. Angelegt wird es genau hier, aus zwei Gründen: Erst an dieser Stelle
 * liegen Preis-ID und Abrechnungszeitraum zuverlässig vor (beides braucht das
 * Profil — `membership_tier` und `access_until`), und ein zweiter Schreibpfad
 * in `checkout-completed.ts` würde mit diesem um dieselbe Zeile rennen. Die
 * beiden Ereignisse treffen in unbestimmter Reihenfolge ein.
 *
 * ── Was hier passiert ───────────────────────────────────────────────────────
 *   1. Profil über `stripe_customer_id` suchen; findet sich keins, Konto aus
 *      der Stripe-E-Mail anlegen oder wiederfinden.
 *   2. UPSERT in `subscriptions` (Quelle der Wahrheit pro Stripe-Abo).
 *   3. Profil-Sync nur bei Status `active`/`trialing`.
 *   4. Willkommensmail beim ersten Übergang in eine bezahlte Stufe.
 *
 * Nicht-aktive Übergänge (`past_due`, `paused`, `canceled`, …) setzen das
 * Profil hier NICHT proaktiv zurück — das erledigen `subscription.deleted`
 * bzw. `subscription.paused`. Grund: Stripe schickt `cancel_at_period_end=true`
 * als `updated`, der Zugang soll aber bis Periodenende bestehen bleiben.
 */
export async function handleSubscriptionUpdated(
  ereignisAbo: Stripe.Subscription,
  supabase: WebhookSupabase,
): Promise<void> {
  /**
   * Den aktuellen Stand bei Stripe lesen, nicht den Schnappschuss im Event.
   *
   * Stripe garantiert keine Reihenfolge. Bei der Kasse entstehen
   * `subscription.created` (Status `incomplete`) und `subscription.updated`
   * (`active`) in derselben Sekunde; kommt das ältere Ereignis zuletzt an,
   * schrieb der Upsert unten bis 19.09.2026 `incomplete` über ein laufendes
   * Abo — und die Abo-Verwaltung meldete „kein aktives Abo". Genauso konnte
   * ein verspätetes `updated` (active) nach `subscription.deleted` ein
   * gekündigtes Abo wiederbeleben. Mit dem frischen Stand ist die Reihenfolge
   * egal: Jedes Ereignis schreibt, was jetzt gilt.
   */
  const sub = await getStripe().subscriptions.retrieve(ereignisAbo.id);

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) {
    throw new Error(`Subscription ${sub.id} ohne customer-ID`);
  }

  const priceId = extractPriceId(sub);

  /**
   * Ein unbekannter Preis darf den Event nicht verwerfen.
   *
   * `resolvePlanFromPriceId` liefert bewusst `null` statt zu werfen: Im
   * Bestand laufen Abos über Preis-IDs, die heute nicht mehr in den
   * Umgebungsvariablen stehen (Kontowechsel, im Dashboard von Hand angelegte
   * Preise). Ein `throw` würde den Webhook mit 500 antworten lassen und Stripe
   * drei Tage lang wiederholen, obwohl an dem Abo nichts kaputt ist.
   *
   * Der Rückfall auf `monthly` ist die konservative Richtung: Alle
   * Bestandsabos vor dieser Änderung waren Monatsabos, und `monthly` ist die
   * Stufe mit den wenigsten Zugeständnissen. Der Fall gehört trotzdem ins
   * Protokoll, denn dauerhaft ist er kein Zustand.
   */
  const erkannterPlan = resolvePlanFromPriceId(priceId);
  if (!erkannterPlan) {
    console.warn(
      `[stripe-webhook] subscription ${sub.id}: price ${priceId} keinem Plan zugeordnet, ` +
        "falle auf 'monthly' zurück. STRIPE_PRICE_* prüfen.",
    );
  }
  const plan: MembershipPlan = erkannterPlan ?? "monthly";

  let profile = await loadProfileByCustomerId(supabase, customerId);
  let email: string | null = null;

  if (!profile) {
    const kunde = await ladeStripeKunde(sub);
    email = kunde.email;
    if (!email) {
      throw new Error(
        `Subscription ${sub.id}: kein Profil und keine Customer-E-Mail, Konto kann nicht angelegt werden`,
      );
    }

    const { userId } = await getOrCreateUserByEmail(supabase, email, kunde.name);

    const { error: kundeFehler } = await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);
    if (kundeFehler) {
      throw new Error(
        `profiles-Update (stripe_customer_id, user=${userId}) fehlgeschlagen: ${kundeFehler.message}`,
      );
    }

    profile = await loadProfileByCustomerId(supabase, customerId);
    if (!profile) {
      throw new Error(`Profil für neu angelegtes Konto ${userId} (customer=${customerId}) nicht gefunden`);
    }
  }

  const { startISO, endISO } = extractCurrentPeriod(sub);

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
    throw new Error(`subscriptions UPSERT fehlgeschlagen (sub=${sub.id}): ${upsertError.message}`);
  }

  /**
   * Lifetime und 1:1 stehen über jedem Abo.
   *
   * Wer Lifetime kauft, dessen Monatsabo wird zum Periodenende gekündigt
   * (`checkout-completed.ts`), und genau das schickt Stripe als `updated`
   * (Status `active`, `cancel_at_period_end: true`). Bis 19.09.2026 schrieb der
   * Profil-Sync darunter daraufhin `membership_tier: monthly` über den frisch
   * gekauften Dauerzugang — und `subscription.deleted` setzte das Konto am
   * Periodenende auf `free`. Der Kunde hätte 997 € gezahlt und stünde vor der
   * Bezahlschranke. Die Abo-Zeile oben wird trotzdem gepflegt.
   */
  if (profile.membership_tier === "lifetime" || profile.membership_tier === "ht_1on1") {
    return;
  }

  /**
   * Eingefrorene Abrechnung (`pause_collection`) laesst den Status auf
   * `active` stehen — Stripe unterscheidet die Pause nicht ueber den Status,
   * sondern ueber dieses Feld. Ohne die Abfrage liefe der Zugang waehrend
   * einer dreimonatigen Pause unbezahlt weiter, und der Nutzer haette keinen
   * Grund, sie je zu beenden.
   */
  if (sub.pause_collection) {
    // Der laufende Zeitraum ist bezahlt und laeuft aus; `pausiereProfil`
    // verlaengert ihn nicht, falls Stripe den Zyklus waehrend der Pause
    // weiterdreht.
    await pausiereProfil(supabase, profile.id, endISO);
    /*
      `pausiereProfil` setzt `is_paid` auf falsch, und nach `is_paid` richten
      sich Inhalte und Discord gleichermassen: Mitgliederrolle weg, Warteraum.
      Beim Fortsetzen (`subscription.resumed` bzw. wieder aktiv) kommt beides
      zurück. Wirft nie.
    */
    await zugangBeendetInDiscord(supabase, profile.id, "subscription.updated (Pause)");
    return;
  }

  if (!ACTIVE_STATUSES.has(sub.status)) {
    return;
  }

  /**
   * Zahlte diese Person vorher schon? Entscheidet, ob die Willkommensmail
   * rausgeht. Geprüft wird gegen alle bezahlten Stufen, nicht nur gegen
   * `monthly` — sonst bekäme ein Wechsel von Monat auf Jahr eine zweite
   * Willkommensmail, obwohl niemand neu ist.
   */
  const warSchonZahlend =
    profile.membership_tier != null &&
    ((MEMBERSHIP_PLANS as readonly string[]).includes(profile.membership_tier) ||
      profile.membership_tier === "lifetime" ||
      profile.membership_tier === "ht_1on1");

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ membership_tier: plan, is_paid: true, access_until: endISO })
    .eq("id", profile.id);

  if (profileError) {
    throw new Error(
      `Profil-Sync (sub=${sub.id}, user=${profile.id}) fehlgeschlagen: ${profileError.message}`,
    );
  }

  /*
    Discord nach dem Profil richten: Wer (wieder) zahlt, bekommt die
    Mitgliederrolle, und ein Warteraum geht mit ab. Bis 19.09.2026 fasste
    dieser Handler Discord nicht an — wer nach einer Kündigung neu abschloss,
    blieb ohne Rolle, bis er Discord neu verknüpfte. Wirft nie.
  */
  await synchronisiereNachProfil(supabase, profile.id, "subscription.updated");

  if (warSchonZahlend) return;

  const empfaenger = email ?? (await loadAuthEmail(supabase, profile.id));
  if (!empfaenger) return;

  await sendeWillkommensmail(supabase, {
    email: empfaenger,
    firstName: pickFirstName(profile),
    userId: profile.id,
    plan,
  });
}

/**
 * Willkommensmail — Fehler werden protokolliert, aber NICHT weitergeworfen.
 *
 * Das klingt nachlässig, ist aber die einzige Variante, die etwas verbessert:
 * Der Zugang steht an dieser Stelle bereits vollständig. Würden wir werfen,
 * antwortete der Webhook mit 500 und Stripe wiederholte den Aufruf drei Tage
 * lang. Beim ersten Wiederholungsversuch steht das Profil aber schon auf der
 * bezahlten Stufe, `warSchonZahlend` ist true — die Mail ginge also **nie**
 * raus. Wir bekämen ausschließlich Fehlalarme.
 *
 * Was der Kunde stattdessen hat: Sein Konto steht, und das Passwort setzt er
 * direkt auf `/checkout/success`. Wer den Link dort verpasst, holt sich über
 * `/passwort-vergessen` selbst einen (`lib/auth/passwort-reset.ts`, dieselbe
 * `createSetPasswordLink()` wie hier). Nebeneffekt: Der Kaufweg lässt sich
 * vollständig testen, ohne dass der Mailversand eingerichtet sein muss.
 */
async function sendeWillkommensmail(
  supabase: WebhookSupabase,
  daten: { email: string; firstName: string; userId: string; plan: MembershipPlan },
): Promise<void> {
  try {
    /**
     * Passwort-Link für jedes Konto, an dem sich noch nie jemand angemeldet
     * hat. Wer das schon getan hat (Free-Mitglied, das aufrüstet), bekommt
     * den normalen Dashboard-Knopf — ein „Passwort setzen" wäre für ihn eine
     * Aufforderung, etwas zu reparieren, das nicht kaputt ist.
     *
     * Bis 19.09.2026 hing der Link daran, ob das Konto *in diesem Ereignis*
     * entstanden war. Bei der Kasse ist es das nie: Das Konto entsteht mit
     * `subscription.created` (Status `incomplete`), die Mail geht erst mit
     * `subscription.updated` (`active`) raus — dort war das Konto „alt", und
     * jeder Gastkäufer bekam einen Dashboard-Knopf für ein Konto ohne
     * Passwort. Dieselbe Frage stellt `ladeKaufStatus` auf der Erfolgsseite.
     */
    const { data: authNutzer } = await supabase.auth.admin.getUserById(daten.userId);
    const nochNieAngemeldet = !authNutzer?.user?.last_sign_in_at;
    const setPasswordUrl = nochNieAngemeldet
      ? await createSetPasswordLink(supabase, daten.email)
      : undefined;

    await sendWelcomePaid({
      firstName: daten.firstName,
      email: daten.email,
      userId: daten.userId,
      tier: daten.plan,
      setPasswordUrl,
    });
  } catch (err) {
    console.error(
      `[stripe-webhook] Willkommensmail an ${daten.email} fehlgeschlagen. Das Konto ist angelegt, ` +
        "der Kunde kommt über /checkout/success oder den Passwort-Reset hinein:",
      err,
    );
  }
}

/**
 * Stripe liefert auf `Subscription` nur die Customer-ID, nicht die E-Mail — separat nachladen.
 *
 * Der Name kommt mit, weil die Kasse ihn als Karteninhaber abfragt. Ohne ihn
 * legte der Trigger das Profil mit leerem `full_name` an, und die
 * Willkommensmail begrüßte den Käufer mit dem Teil seiner Adresse vor dem @.
 */
async function ladeStripeKunde(sub: Stripe.Subscription): Promise<{ email: string | null; name: string | null }> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return { email: null, name: null };
  const customer = await getStripe().customers.retrieve(customerId);
  if (customer.deleted) return { email: null, name: null };
  return { email: customer.email ?? null, name: customer.name?.trim() || null };
}
