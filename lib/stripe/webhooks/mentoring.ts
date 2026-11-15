import type Stripe from "stripe";
import { PRODUKTE, istKassenProdukt, type KassenProdukt } from "@/config/mentoring";
import { createSetPasswordLink } from "@/lib/auth/password-link";
import { synchronisiereNachProfil } from "@/lib/discord/mitgliedschaft";
import { sendMentoringBestaetigung } from "@/lib/email/templates/mentoring-bestaetigung";
import { ART_EINMAL, ART_LIVE, ART_RATEN, istMentoringArt, type MentoringArt } from "@/lib/mentoring/kasse";
import { plusMonate, spaeteresDatum } from "@/lib/mentoring/zugang";
import { getStripe } from "@/lib/stripe/server";
import { schliesseOffeneFaelle } from "@/lib/zahlung/fall";
import {
  extractCurrentPeriod,
  extractCustomerId,
  getOrCreateUserByEmail,
  loadAuthEmail,
  loadProfileByCustomerId,
  loadProfileByUserId,
  pickFirstName,
  unixToISO,
  type WebhookSupabase,
} from "./_helpers";

/**
 * Webhook-Zweig für Mentoring-Programme und Live-Abo (`config/mentoring.ts`,
 * Kasse in `lib/mentoring/kasse.ts`).
 *
 * ── Warum ein eigener Zweig ─────────────────────────────────────────────────
 *
 * Ein Ratenkauf ist technisch ein Monatsabo, aber **keine Mitgliedschaft**.
 * Liefe er durch die Abo-Handler, geschähe genau das, wovor MoonTrading in
 * seiner Doku warnt: `subscription.updated` schriebe `membership_tier:
 * monthly` über das Programm, `invoice.paid` setzte `access_until` auf das
 * Ende der Rate, und `subscription.deleted` — das nach der letzten Rate
 * planmäßig kommt — nähme dem Kunden den Zugang, weil er fertig bezahlt hat.
 * Deshalb verzweigen alle Abo- und Rechnungs-Handler vorne an `metadata.art`
 * hierher und schreiben solche Abos auch nicht in `subscriptions` (die
 * Tabelle heißt dort „laufende Mitgliedschaft": MRR, Kündigen-Knopf,
 * „anderes laufendes Abo" im Mahnlauf).
 *
 * ── Zugang hängt am Kauf, nicht am Abo ──────────────────────────────────────
 *
 * Das Ende des Raten-Abos nimmt nichts weg. Eine geplatzte Rate sperrt über den
 * normalen Mahnlauf (`lib/zahlung/fall.ts`, Tag 7, `is_paid`), und die
 * nachgeholte Zahlung öffnet hier wieder (Entscheidung Simon, 17.10.2026:
 * „Mahnen, dann sperren").
 */

/* ─── Erkennen ──────────────────────────────────────────────────────────── */

export function mentoringArt(metadata: Stripe.Metadata | null | undefined): MentoringArt | null {
  const art = metadata?.art;
  return istMentoringArt(art) ? art : null;
}

/**
 * Art einer Rechnung. Stripe kopiert die Abo-Metadaten in
 * `parent.subscription_details.metadata` — ohne zusätzlichen Abruf.
 */
export function mentoringArtAusRechnung(invoice: Stripe.Invoice): MentoringArt | null {
  return mentoringArt(invoice.parent?.subscription_details?.metadata ?? null);
}

/* ─── Kauf abgeschlossen ────────────────────────────────────────────────── */

interface KaufZeile {
  id: string;
  user_id: string;
  kassenlink_id: string | null;
  produkt: KassenProdukt;
  zahlweise: "einmal" | "raten" | "abo";
  raten_gesamt: number | null;
  raten_betrag_cents: number | null;
  soll_cents: number | null;
  stripe_subscription_id: string | null;
  status: "aktiv" | "vollstaendig" | "beendet" | "erstattet";
  vollstaendig_am: string | null;
}

const KAUF_SPALTEN =
  "id,user_id,kassenlink_id,produkt,zahlweise,raten_gesamt,raten_betrag_cents,soll_cents,stripe_subscription_id,status,vollstaendig_am";

/**
 * `checkout.session.completed` (und `async_payment_succeeded`) einer
 * Mentoring-Kasse.
 *
 * Reihenfolge mit Absicht: erst Konto und Kundennummer, dann der Kauf, dann
 * der Zugang, zuletzt alles, was scheitern darf (Schedule, Lead, Discord,
 * Mail). Die Kundennummer **muss** am Profil stehen, bevor die erste Rate
 * verbucht wird: `invoice.paid` findet das Profil ausschließlich über sie. Im
 * Schwesterprojekt fehlte genau dieser Schritt für Gastkäufer, und Stripe
 * hätte nach der letzten Rate einfach weiter abgebucht.
 */
export async function handleMentoringCheckout(
  session: Stripe.Checkout.Session,
  supabase: WebhookSupabase,
): Promise<void> {
  const art = mentoringArt(session.metadata);
  if (!art) return;

  /*
    Mit verzögerten Zahlarten (Lastschrift) kommt `completed` mit `unpaid`, das
    Geld erst mit `checkout.session.async_payment_succeeded` — dann läuft diese
    Funktion ein zweites Mal. Beim Live-Abo mit Probezeit ist nichts zu zahlen.
  */
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    console.info(`[stripe-webhook] Mentoring-Kasse ${session.id}: Zahlung ${session.payment_status}, warte auf Eingang.`);
    return;
  }

  const meta = session.metadata ?? {};
  const produkt = meta.produkt;
  if (!istKassenProdukt(produkt)) {
    throw new Error(`Mentoring-Kasse ${session.id} ohne gültiges Produkt (${produkt ?? "leer"})`);
  }
  const def = PRODUKTE[produkt];
  const raten = Math.max(1, Number(meta.raten) || 1);
  const betragCents = Number(meta.betrag_cents) || def.preisCents;
  const rateCents = art === ART_RATEN ? Number(meta.rate_cents) || Math.floor(betragCents / raten) : null;

  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const customerId = extractCustomerId(session.customer);
  const subId = typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null);
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);

  // ── 1. Konto ──
  let userId = meta.user_id || null;
  if (!userId) {
    if (!email) throw new Error(`Mentoring-Kasse ${session.id} ohne E-Mail, Konto nicht anlegbar`);
    ({ userId } = await getOrCreateUserByEmail(supabase, email, session.customer_details?.name ?? null));
  }

  const { data: profilRoh, error: profilFehler } = await supabase
    .from("profiles")
    .select("membership_tier,is_paid,stripe_customer_id,live_bis,journal_bis,archiv_bis")
    .eq("id", userId)
    .maybeSingle();
  if (profilFehler || !profilRoh) {
    throw new Error(`Profil ${userId} nicht lesbar (Mentoring-Kasse ${session.id}): ${profilFehler?.message ?? "fehlt"}`);
  }
  const profil = profilRoh as {
    membership_tier: string | null;
    is_paid: boolean | null;
    stripe_customer_id: string | null;
    live_bis: string | null;
    journal_bis: string | null;
    archiv_bis: string | null;
  };

  // ── 2. Kundennummer ──
  if (customerId && !profil.stripe_customer_id) {
    const { error } = await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
    if (error) throw new Error(`stripe_customer_id für ${userId} nicht setzbar: ${error.message}`);
  } else if (customerId && profil.stripe_customer_id !== customerId) {
    // Kommt nur vor, wenn jemand mit einer zweiten Stripe-Kundennummer kauft.
    // Die Raten dieses Kaufs fände `invoice.paid` dann nicht — laut melden.
    console.error(
      `[stripe-webhook] Mentoring-Kasse ${session.id}: Kunde ${customerId} weicht von ${profil.stripe_customer_id} ` +
        `am Profil ${userId} ab. Raten werden über die Abo-ID zugeordnet, Profil-Suche über den Kunden schlägt fehl.`,
    );
  }

  // ── 3. Kauf ──
  const zahlweise = art === ART_LIVE ? "abo" : art === ART_RATEN ? "raten" : "einmal";
  const kauf = {
    id: session.id,
    user_id: userId,
    kassenlink_id: meta.kassenlink_id || null,
    produkt,
    zahlweise,
    raten_gesamt: art === ART_RATEN ? raten : null,
    raten_betrag_cents: rateCents,
    // Seit 07.11.2026 trägt Rate 1 den Restcent — die Summe ist immer der Preis.
    soll_cents: art === ART_LIVE ? null : betragCents,
    stripe_customer_id: customerId,
    stripe_subscription_id: subId,
    stripe_payment_intent_id: paymentIntentId,
    status: "aktiv",
    live_monate: def.liveMonate,
    closer: meta.closer || null,
    email,
    gekauft_am: unixToISO(session.created),
    // Upgrade Ausbildung → Main/Premium (Migration 113): nur die Zusatzsumme ist neuer Umsatz.
    anrechnung_cents: Number(meta.anrechnung_cents) || 0,
    upgrade_von_kauf_id: meta.upgrade_von_kauf_id || null,
  };
  const { error: kaufFehler } = await supabase.from("mentoring_kauf").insert(kauf);
  const neu = !kaufFehler;
  if (kaufFehler && kaufFehler.code !== "23505") {
    throw new Error(`mentoring_kauf INSERT (${session.id}) fehlgeschlagen: ${kaufFehler.message}`);
  }

  // ── 4. Zugang ──
  let liveBis: string | null = profil.live_bis;
  // Q01 (E-Mail-Playbook): Beginn und nächster Zahlungstermin des Live-Abos.
  let liveStart: string | null = null;
  let naechsteZahlung: string | null = null;
  if (art === ART_LIVE) {
    // Den Zeitraum liefert das Abo; dieselbe Rechnung wie bei jedem `updated`.
    if (subId) {
      const sub = await getStripe().subscriptions.retrieve(subId);
      liveBis = (await verlaengereLiveZugang(supabase, userId, subId, sub)) ?? liveBis;
      const probe = sub.status === "trialing" && sub.trial_end ? unixToISO(sub.trial_end) : null;
      // Früh gebucht: Das Abo beginnt, wenn der enthaltene Live-Zeitraum endet (trial_end).
      liveStart = probe ?? new Date().toISOString();
      naechsteZahlung = probe ?? extractCurrentPeriod(sub).endISO ?? null;
    }
  } else {
    const dauerzugang = profil.membership_tier === "lifetime" || profil.membership_tier === "ht_1on1";
    /*
      Ende des Live-Zugangs ab dem **Kaufzeitpunkt**, nicht ab „jetzt": Eine
      Wiederholung desselben Ereignisses Tage später darf den Zeitraum nicht
      verschieben. `spaeteresDatum`, damit ein laufender längerer Zugang (etwa
      aus einem früheren Programm) nicht verkürzt wird.
    */
    const kaufzeit = new Date(session.created * 1000);
    const ende = plusMonate(kaufzeit, def.liveMonate ?? 0).toISOString();
    liveBis = spaeteresDatum(profil.live_bis, ende);
    const update: Record<string, unknown> = { is_paid: true, live_bis: liveBis };
    /*
      Archiv und Journal seit 08.11.2026 (Tracking-Playbook 2.2, Migration 113).
      Archiv: nur Main/Premium, verkürzt nie. Journal: Main/Premium dauerhaft
      (`null`); die Ausbildung befristet es nur, wenn das Konto es nicht schon
      dauerhaft hat — ein Mentoring-Konto mit leerem `journal_bis` hat es
      dauerhaft, ein Abo- oder Free-Konto noch gar nicht.
    */
    if (def.archivMonate > 0) {
      update.archiv_bis = spaeteresDatum(profil.archiv_bis, plusMonate(kaufzeit, def.archivMonate).toISOString());
    }
    const journalDauerhaft = profil.membership_tier === "mentoring" && !profil.journal_bis;
    if (def.journalMonate === null) {
      update.journal_bis = null;
    } else if (def.journalMonate > 0 && !journalDauerhaft && !dauerzugang) {
      update.journal_bis = spaeteresDatum(profil.journal_bis, plusMonate(kaufzeit, def.journalMonate).toISOString());
    }
    // Lifetime und 1:1 haben mehr als ein Programm (Live unbefristet) — Stufe bleibt.
    if (!dauerzugang) Object.assign(update, { membership_tier: "mentoring", access_until: null });
    const { error } = await supabase.from("profiles").update(update).eq("id", userId);
    if (error) throw new Error(`Zugang für ${userId} (Mentoring-Kasse ${session.id}) nicht setzbar: ${error.message}`);

    if (!dauerzugang && neu) {
      // Ein laufendes Mitgliedsabo endet zum Periodenende, wie beim Lifetime-Kauf.
      const { beendeLaufendesAbo } = await import("./checkout-completed");
      await beendeLaufendesAbo(supabase, userId);
    }
  }

  // ── 5. Raten enden von selbst ──
  if (art === ART_RATEN && subId) {
    await richteRatenEndeEin(subId, raten, session.metadata ?? {}, rateCents);
  }

  if (neu) {
    await vermerkeKassenlink(supabase, kauf.kassenlink_id, session.id, kauf.soll_cents, def.name, zahlweise, raten, kauf.closer);
    if (art !== ART_LIVE) await vermerkeTrainingLead(supabase, userId, kauf.soll_cents, def.name, zahlweise, raten);
    if (art !== ART_LIVE) await schliesseOffeneFaelle(supabase, userId, `${def.name} gekauft.`);
  }

  await synchronisiereNachProfil(supabase, userId, `${def.name} gekauft`);

  // ── 6. Bestätigung (§ 312f BGB), genau einmal je Kauf ──
  await sendeBestaetigung(supabase, {
    kaufId: session.id,
    userId,
    email: email ?? (await loadAuthEmail(supabase, userId)),
    produkt,
    raten: art === ART_RATEN ? raten : 1,
    rateCents,
    gesamtCents: art === ART_LIVE ? def.preisCents : betragCents,
    anrechnungCents: kauf.anrechnung_cents,
    liveBis,
    liveStart,
    naechsteZahlung,
  });
}

/**
 * Den Raten-Abo in einen Subscription Schedule überführen, der nach `raten`
 * Monaten von selbst endet (`end_behavior: cancel`).
 *
 * Stripe kennt kein Abo „läuft genau dreimal"; der Schedule ist der
 * dokumentierte Weg für Ratenpläne. Gegenüber `cancel_at` rechnet hier Stripe
 * die Monatsgrenzen selbst — kein Datum, das um Stunden danebenliegen und eine
 * fünfte Rate auslösen könnte.
 *
 * **Wirft nie**, aber laut: Scheitert das, läuft das Abo weiter wie ein
 * normales Monatsabo, und jemand muss es nach der letzten Rate von Hand
 * beenden. `handleMentoringRechnung` meldet jede Rate zu viel zusätzlich.
 */
async function richteRatenEndeEin(
  subId: string,
  raten: number,
  metadata: Stripe.Metadata,
  regelRateCents: number | null,
): Promise<void> {
  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subId);
    // Schon eingerichtet und endet von selbst? Dann nichts tun. Hängt ein Schedule ohne
    // `cancel` (Update scheiterte), wird er hier repariert — jedes Abo-Ereignis versucht es erneut.
    let schedule: Stripe.SubscriptionSchedule;
    if (sub.schedule) {
      const id = typeof sub.schedule === "string" ? sub.schedule : sub.schedule.id;
      schedule = await stripe.subscriptionSchedules.retrieve(id);
      if (schedule.end_behavior === "cancel") return;
    } else {
      schedule = await stripe.subscriptionSchedules.create({ from_subscription: subId });
    }
    const phase = schedule.phases[0];
    if (!phase) throw new Error(`Schedule ${schedule.id} ohne Phase`);

    const zahlart = typeof sub.default_payment_method === "string" ? sub.default_payment_method : sub.default_payment_method?.id;

    const gemeinsam = {
      automatic_tax: { enabled: true },
      proration_behavior: "none" as const,
      metadata,
      ...(zahlart ? { default_payment_method: zahlart } : {}),
    };
    const items = phase.items.map((item) => ({
      price: typeof item.price === "string" ? item.price : item.price.id,
      quantity: item.quantity ?? 1,
    }));

    /*
      Restcent (seit 07.11.2026): Die erste Rate an der Kasse ist um ein paar Cent
      höher als die übrigen (5.000 € / 6). Dann zwei Phasen — ein Monat zum
      Kassenpreis, danach `raten − 1` Monate zum Regelbetrag. Geht der Preis
      glatt auf, bleibt es eine Phase wie bisher.
    */
    const kassenPreis = sub.items.data[0]?.price;
    const ersteCents = kassenPreis?.unit_amount ?? null;
    const mitRest = raten > 1 && regelRateCents != null && ersteCents != null && ersteCents !== regelRateCents;
    if (mitRest && kassenPreis) {
      const produktId = typeof kassenPreis.product === "string" ? kassenPreis.product : kassenPreis.product.id;
      await stripe.subscriptionSchedules.update(schedule.id, {
        end_behavior: "cancel",
        phases: [
          { start_date: phase.start_date, items, duration: { interval: "month", interval_count: 1 }, ...gemeinsam },
          {
            items: [
              {
                price_data: {
                  currency: kassenPreis.currency,
                  product: produktId,
                  unit_amount: regelRateCents,
                  tax_behavior: "inclusive",
                  recurring: { interval: "month" },
                },
                quantity: 1,
              },
            ],
            duration: { interval: "month", interval_count: raten - 1 },
            ...gemeinsam,
          },
        ],
      });
      return;
    }

    await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: "cancel",
      phases: [{ start_date: phase.start_date, items, duration: { interval: "month", interval_count: raten }, ...gemeinsam }],
    });
  } catch (err) {
    console.error(
      `[stripe-webhook] RATENPLAN OHNE ENDE: Schedule für ${subId} (${raten} Raten) nicht eingerichtet. ` +
        "Das Abo bucht weiter ab, bis es in Stripe beendet wird:",
      err,
    );
  }
}

/** Kassenlink auf „bezahlt", Lead im Closer-Board auf „gewonnen". Wirft nie. */
async function vermerkeKassenlink(
  supabase: WebhookSupabase,
  kassenlinkId: string | null,
  kaufId: string,
  sollCents: number | null,
  produktName: string,
  zahlweise: string,
  raten: number,
  closer: string | null,
): Promise<void> {
  if (!kassenlinkId) return;
  try {
    const jetzt = new Date().toISOString();
    const { data, error } = await supabase
      .from("kassenlink")
      .update({ status: "bezahlt", bezahlt_am: jetzt, kauf_id: kaufId })
      .eq("id", kassenlinkId)
      .select("lead_id")
      .maybeSingle();
    if (error) {
      console.warn(`[stripe-webhook] Kassenlink ${kassenlinkId} nicht auf bezahlt gesetzt: ${error.message}`);
      return;
    }
    const leadId = (data as { lead_id: string | null } | null)?.lead_id;
    if (!leadId) return;

    const { error: leadFehler } = await supabase
      .from("discord_leads")
      .update({
        closed: "closed_won",
        closed_at: jetzt,
        product: zahlweise === "raten" ? `${produktName} (${raten} Raten)` : produktName,
        ...(sollCents ? { revenue_cents: sollCents } : {}),
        ...(closer === "kevin" || closer === "simon" ? { closer } : {}),
        updated_at: jetzt,
      })
      .eq("id", leadId);
    if (leadFehler) console.warn(`[stripe-webhook] Lead ${leadId} nicht als gewonnen vermerkt: ${leadFehler.message}`);
  } catch (err) {
    console.warn("[stripe-webhook] Kassenlink/Lead nicht nachgezogen:", err);
  }
}

/**
 * Offener Lead aus dem Free Training (`training_leads`, Board `/admin/training`)
 * auf „gewonnen" — egal ob über den Kassenlink nach dem Gespräch oder per
 * Selbstkauf der Ausbildung. Ohne Lead passiert nichts. Wirft nie.
 */
async function vermerkeTrainingLead(
  supabase: WebhookSupabase,
  userId: string,
  sollCents: number | null,
  produktName: string,
  zahlweise: string,
  raten: number,
): Promise<void> {
  try {
    const jetzt = new Date().toISOString();
    const { error } = await supabase
      .from("training_leads")
      .update({
        status: "gewonnen",
        gewonnen_am: jetzt,
        produkt: zahlweise === "raten" ? `${produktName} (${raten} Raten)` : produktName,
        ...(sollCents ? { revenue_cents: sollCents } : {}),
        updated_at: jetzt,
      })
      .eq("user_id", userId)
      .not("status", "in", "(gewonnen,verloren)");
    // Ohne Migration 109 fehlt die Tabelle — das ist kein Grund, den Kauf zu kippen.
    if (error && !/training_leads|does not exist|schema cache/i.test(error.message)) {
      console.warn(`[stripe-webhook] Training-Lead für ${userId} nicht als gewonnen vermerkt: ${error.message}`);
    }
  } catch (err) {
    console.warn("[stripe-webhook] Training-Lead nicht nachgezogen:", err);
  }
}

async function sendeBestaetigung(
  supabase: WebhookSupabase,
  d: {
    kaufId: string;
    userId: string;
    email: string | null;
    produkt: KassenProdukt;
    raten: number;
    rateCents: number | null;
    gesamtCents: number;
    anrechnungCents?: number;
    liveBis: string | null;
    liveStart?: string | null;
    naechsteZahlung?: string | null;
  },
): Promise<void> {
  if (!d.email) return;
  try {
    // Sperre über den Zeitstempel: Nur wer ihn setzt, verschickt.
    const { data, error } = await supabase
      .from("mentoring_kauf")
      .update({ bestaetigung_gesendet_am: new Date().toISOString() })
      .eq("id", d.kaufId)
      .is("bestaetigung_gesendet_am", null)
      .select("id");
    if (error || (data ?? []).length === 0) return;

    const { data: authNutzer } = await supabase.auth.admin.getUserById(d.userId);
    const setPasswordUrl = authNutzer?.user?.last_sign_in_at ? undefined : await createSetPasswordLink(supabase, d.email);
    const profil = await loadProfileByUserId(supabase, d.userId);

    await sendMentoringBestaetigung({
      firstName: pickFirstName(profil),
      email: d.email,
      userId: d.userId,
      kaufId: d.kaufId,
      produkt: d.produkt,
      raten: d.raten,
      rateCents: d.rateCents,
      gesamtCents: d.gesamtCents,
      anrechnungCents: d.anrechnungCents ?? 0,
      liveBis: d.liveBis,
      setPasswordUrl,
      liveStart: d.liveStart ?? null,
      naechsteZahlung: d.naechsteZahlung ?? null,
    });
  } catch (err) {
    // Der Zugang steht. Die Sperre wieder lösen, damit eine Wiederholung des
    // Ereignisses die Bestätigung (§ 312f) nachholen kann — sonst käme sie nie.
    console.error(`[stripe-webhook] Bestätigung zu ${d.kaufId} an ${d.email} fehlgeschlagen:`, err);
    await supabase.from("mentoring_kauf").update({ bestaetigung_gesendet_am: null }).eq("id", d.kaufId);
  }
}

/* ─── Abo-Ereignisse ────────────────────────────────────────────────────── */

/**
 * `customer.subscription.created/updated/resumed` eines Raten- oder Live-Abos.
 * Raten: nichts zu tun (Zugang hängt am Kauf). Live-Abo: `live_bis` auf das
 * Ende des bezahlten Zeitraums schieben, nie zurück.
 */
export async function handleMentoringAbo(sub: Stripe.Subscription, supabase: WebhookSupabase): Promise<void> {
  // Ratenabo: sicherstellen, dass der Ratenplan von selbst endet (Reparatur, falls die Einrichtung scheiterte).
  if (mentoringArt(sub.metadata) === ART_RATEN && (sub.status === "active" || sub.status === "trialing")) {
    const raten = Math.max(1, Number(sub.metadata?.raten) || 1);
    if (raten > 1) await richteRatenEndeEin(sub.id, raten, sub.metadata ?? {}, Number(sub.metadata?.rate_cents) || null);
    return;
  }
  if (mentoringArt(sub.metadata) !== ART_LIVE) return;
  if (sub.status !== "active" && sub.status !== "trialing") return;
  const userId = await userZuAbo(supabase, sub);
  if (!userId) {
    throw new Error(`Live-Abo ${sub.id}: Konto noch nicht zugeordnet, Stripe soll wiederholen`);
  }
  await verlaengereLiveZugang(supabase, userId, sub.id, sub);
  if (sub.cancel_at_period_end || sub.cancel_at) await sendeLiveKuendigung(supabase, sub, userId);
  else await vergissLiveKuendigung(supabase, sub.id);
}

/**
 * Kündigung zurückgenommen: den Q02-Vermerk löschen, damit eine spätere zweite
 * Kündigung wieder bestätigt wird. Wirft nie.
 */
async function vergissLiveKuendigung(supabase: WebhookSupabase, subId: string): Promise<void> {
  const { error } = await supabase.from("mail_versand").delete().eq("vorlage", "Q02").eq("bezug", `kuendigung:${subId}`);
  if (error && !/does not exist|schema cache/i.test(error.message)) console.warn(`[stripe-webhook] Q02-Vermerk ${subId}:`, error.message);
}

/**
 * Q02 „Live-Abo-Kündigung bestätigt" (E-Mail-Playbook 1.0), sobald Stripe die
 * Kündigung zum Periodenende führt — genau einmal je Abo (`kuendigung:<sub>`).
 * Kam die Kündigung über den Kündigungsbutton, hat dessen gesetzliche
 * Eingangsbestätigung (§ 312k) das Enddatum schon bestätigt; der Button trägt
 * Q02 vorher als übersprungen ein, damit keine zweite Mail kommt. Wirft nie.
 */
async function sendeLiveKuendigung(supabase: WebhookSupabase, sub: Stripe.Subscription, userId: string): Promise<void> {
  try {
    const ende = sub.cancel_at ?? sub.items.data[0]?.current_period_end;
    if (!ende) return;
    const email = await loadAuthEmail(supabase, userId);
    if (!email) return;
    const profil = await loadProfileByUserId(supabase, userId);
    const { kundeMail } = await import("@/lib/email/templates/playbook/kunde");
    const { sendeVorlage } = await import("@/lib/mailsystem/versand");
    const app = (await import("@/lib/site-url")).getAppUrl();
    const mail = kundeMail("Q02", {
      vorname: pickFirstName(profil),
      gespraechUrl: `${app}/programme`,
      liveAboUrl: `${app}/live-abo`,
      accountUrl: `${app}/einstellungen/abonnement`,
      endeAm: new Date(ende * 1000),
    });
    await sendeVorlage(supabase, {
      vorlage: "Q02",
      bezug: `kuendigung:${sub.id}`,
      email,
      userId,
      betreff: mail.betreff,
      jsx: mail.jsx,
    });
  } catch (err) {
    console.error(`[stripe-webhook] Q02 zu ${sub.id} nicht verschickt:`, err);
  }
}

/** `customer.subscription.deleted`: Kauf vermerken, Zugang **nicht** anfassen. */
export async function handleMentoringAboEnde(sub: Stripe.Subscription, supabase: WebhookSupabase): Promise<void> {
  const { data, error } = await supabase
    .from("mentoring_kauf")
    .select(KAUF_SPALTEN)
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (error) throw new Error(`mentoring_kauf zu ${sub.id} nicht lesbar: ${error.message}`);
  const kauf = data as KaufZeile | null;
  if (!kauf || kauf.status !== "aktiv") return;

  /*
    Nach der letzten Rate steht der Kauf schon auf `vollstaendig`. Steht er noch
    auf `aktiv`, endete das Abo vorher: Stripe hat nach geplatzten Raten
    aufgegeben, oder jemand hat es im Dashboard beendet. Der Zugang ruht dann
    bereits über den Mahnlauf; hier wird nur vermerkt.
  */
  const { error: updateFehler } = await supabase.from("mentoring_kauf").update({ status: "beendet" }).eq("id", kauf.id);
  if (updateFehler) throw new Error(`mentoring_kauf ${kauf.id} nicht beendet: ${updateFehler.message}`);
  if (kauf.zahlweise === "raten") {
    console.warn(`[stripe-webhook] Ratenkauf ${kauf.id} endete vor der letzten Rate (Abo ${sub.id}).`);
  }
}

/* ─── Rechnungen ────────────────────────────────────────────────────────── */

/**
 * `invoice.paid` eines Raten- oder Live-Abos, nach dem Eintrag in `payments`.
 *
 * Raten werden **gezählt, nicht hochgezählt**: Eine Zeile je Rechnung, die
 * Nummer aus dem Bestand. Eine wiederholte Zustellung findet ihre Zeile schon
 * vor und ändert nichts.
 */
export async function handleMentoringRechnung(
  invoice: Stripe.Invoice,
  art: MentoringArt,
  subId: string,
  userId: string,
  supabase: WebhookSupabase,
): Promise<void> {
  if (art === ART_LIVE) {
    await verlaengereLiveZugang(supabase, userId, subId);
    return;
  }
  if (art !== ART_RATEN || !invoice.id || (invoice.amount_paid ?? 0) <= 0) return;

  const { data, error } = await supabase
    .from("mentoring_kauf")
    .select(KAUF_SPALTEN)
    .eq("stripe_subscription_id", subId)
    .maybeSingle();
  if (error) throw new Error(`mentoring_kauf zu ${subId} nicht lesbar: ${error.message}`);
  const kauf = data as KaufZeile | null;
  if (!kauf) {
    // Die erste Rate kommt oft vor `checkout.session.completed` an. Wiederholen lassen.
    throw new Error(`invoice.paid: Ratenkauf zu ${subId} noch nicht angelegt, Stripe soll wiederholen`);
  }

  const bezahltAm = invoice.status_transitions?.paid_at
    ? unixToISO(invoice.status_transitions.paid_at)
    : new Date().toISOString();

  const { count: bisher } = await supabase
    .from("mentoring_rate")
    .select("id", { count: "exact", head: true })
    .eq("kauf_id", kauf.id)
    .neq("id", invoice.id);

  const { error: rateFehler } = await supabase.from("mentoring_rate").insert({
    id: invoice.id,
    kauf_id: kauf.id,
    nummer: (bisher ?? 0) + 1,
    betrag_cents: invoice.amount_paid,
    stripe_subscription_id: subId,
    bezahlt_am: bezahltAm,
  });
  if (rateFehler && rateFehler.code !== "23505") {
    throw new Error(`mentoring_rate INSERT (${invoice.id}) fehlgeschlagen: ${rateFehler.message}`);
  }

  const { count: gezahlt } = await supabase
    .from("mentoring_rate")
    .select("id", { count: "exact", head: true })
    .eq("kauf_id", kauf.id);
  const gesamt = kauf.raten_gesamt ?? 0;

  if (gesamt > 0 && (gezahlt ?? 0) >= gesamt && !kauf.vollstaendig_am) {
    await supabase
      .from("mentoring_kauf")
      .update({ status: "vollstaendig", vollstaendig_am: bezahltAm })
      .eq("id", kauf.id)
      .is("vollstaendig_am", null);
  }
  if (gesamt > 0 && (gezahlt ?? 0) > gesamt) {
    console.error(
      `[stripe-webhook] RATE ZU VIEL: Kauf ${kauf.id} hat ${gezahlt} von ${gesamt} Raten bezahlt (Abo ${subId}). ` +
        "Abo in Stripe beenden und die Rate erstatten.",
    );
  }

  /*
    Nachgeholte Rate nach der Sperre am siebten Tag: Zugang wieder öffnen. Nur
    für die Stufe `mentoring` — ein Lifetime-Konto war nie gesperrt.
  */
  if (kauf.status !== "erstattet") {
    await supabase.from("profiles").update({ is_paid: true }).eq("id", userId).eq("membership_tier", "mentoring");
  }
}

/* ─── Hilfen ────────────────────────────────────────────────────────────── */

async function userZuAbo(supabase: WebhookSupabase, sub: Stripe.Subscription): Promise<string | null> {
  if (sub.metadata?.user_id) return sub.metadata.user_id;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return null;
  const profil = await loadProfileByCustomerId(supabase, customerId);
  return profil?.id ?? null;
}

/**
 * `live_bis` auf das Ende des laufenden Live-Abo-Zeitraums heben (bei Probezeit
 * auf ihr Ende), nie senken. Gibt den neuen Wert zurück.
 */
async function verlaengereLiveZugang(
  supabase: WebhookSupabase,
  userId: string,
  subId: string,
  bekannt?: Stripe.Subscription,
): Promise<string | null> {
  const sub = bekannt ?? (await getStripe().subscriptions.retrieve(subId));
  if (sub.status !== "active" && sub.status !== "trialing") return null;
  const { endISO } = extractCurrentPeriod(sub);
  const ende = sub.trial_end && sub.status === "trialing" ? unixToISO(sub.trial_end) : endISO;

  const { data } = await supabase.from("profiles").select("live_bis").eq("id", userId).maybeSingle();
  const bisher = (data as { live_bis: string | null } | null)?.live_bis ?? null;
  const neu = spaeteresDatum(bisher, ende);
  if (neu === bisher) return bisher;

  const { error } = await supabase.from("profiles").update({ live_bis: neu }).eq("id", userId);
  if (error) throw new Error(`live_bis für ${userId} (Abo ${subId}) nicht setzbar: ${error.message}`);
  return neu;
}

export { ART_EINMAL, ART_LIVE, ART_RATEN };
