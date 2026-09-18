import type Stripe from "stripe";
import { createSetPasswordLink } from "@/lib/auth/password-link";
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
  sub: Stripe.Subscription,
  supabase: WebhookSupabase,
): Promise<void> {
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
  let neuesKonto = false;
  let email: string | null = null;

  if (!profile) {
    email = await ladeStripeKundenEmail(sub);
    if (!email) {
      throw new Error(
        `Subscription ${sub.id}: kein Profil und keine Customer-E-Mail, Konto kann nicht angelegt werden`,
      );
    }

    const { userId, isNew } = await getOrCreateUserByEmail(supabase, email);
    neuesKonto = isNew;

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

  if (warSchonZahlend) return;

  const empfaenger = email ?? (await loadAuthEmail(supabase, profile.id));
  if (!empfaenger) return;

  await sendeWillkommensmail(supabase, {
    email: empfaenger,
    firstName: pickFirstName(profile),
    userId: profile.id,
    plan,
    neuesKonto,
  });
}

/**
 * Willkommensmail — Fehler werden protokolliert, aber NICHT weitergeworfen.
 *
 * Das klingt nachlässig, ist aber die einzige Variante, die etwas verbessert:
 * Der Zugang steht an dieser Stelle bereits vollständig. Würden wir werfen,
 * antwortete der Webhook mit 500 und Stripe wiederholte den Aufruf drei Tage
 * lang. Beim ersten Wiederholungsversuch existiert das Konto aber schon, damit
 * ist `neuesKonto` false und `warSchonZahlend` true — die Mail ginge also
 * **nie** raus. Wir bekämen ausschließlich Fehlalarme.
 *
 * Was der Kunde stattdessen hat: Sein Konto steht, das Passwort setzt er
 * direkt auf `/checkout/success`, und über „Passwort vergessen" kommt er
 * ohnehin hinein. Nebeneffekt: Der Kaufweg lässt sich vollständig testen, ohne
 * dass der Mailversand eingerichtet sein muss.
 */
async function sendeWillkommensmail(
  supabase: WebhookSupabase,
  daten: { email: string; firstName: string; userId: string; plan: MembershipPlan; neuesKonto: boolean },
): Promise<void> {
  try {
    /**
     * Nur für frisch angelegte Konten ein Passwort-Link. Wer schon ein
     * Passwort hat (Free-Mitglied, das aufrüstet), bekommt den normalen
     * Dashboard-Knopf — ein „Passwort setzen" wäre für ihn eine Aufforderung,
     * etwas zu reparieren, das nicht kaputt ist.
     */
    const setPasswordUrl = daten.neuesKonto
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

/** Stripe liefert auf `Subscription` nur die Customer-ID, nicht die E-Mail — separat nachladen. */
async function ladeStripeKundenEmail(sub: Stripe.Subscription): Promise<string | null> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return null;
  const customer = await getStripe().customers.retrieve(customerId);
  if (customer.deleted) return null;
  return customer.email ?? null;
}
