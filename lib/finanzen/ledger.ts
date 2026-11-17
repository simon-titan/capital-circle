import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ART_EINMAL, ART_LIVE, istMentoringArt, type MentoringArt } from "@/lib/mentoring/kasse";
import { getStripe } from "@/lib/stripe/server";
import type { TeamMitglied } from "@/lib/crm/zuweisung";
import { ermittleCredit, type Credit, type CreditTermin } from "./credit";
import { anteilCents, steuerFallback19Inkl } from "./geld";
import { PROVISION_SATZ_BP, provisionFuerZahlung, provisionsKorrektur } from "./provision";
import { berlinPeriode } from "./zeit";

/**
 * Finanz-Ledger aus Stripe (Tracking-Playbook 7, 10; Migration 114).
 *
 * Wird vom Webhook-Dispatcher (`lib/stripe/webhooks/handler.ts`) **nach** den
 * fachlichen Handlern aufgerufen und vom Nachtrag (`backfill.ts`). Jede
 * Funktion ist idempotent über die Stripe-Objekt-ID (`finanz_buchung.
 * stripe_objekt_id`, `provision.buchung_id`, `finanz_dispute.id`) — eine
 * wiederholte Zustellung, ein zweiter Nachtrag oder eine alte Zustellreihenfolge
 * wirken fachlich genau einmal (QA-Karte 21).
 *
 * - Steuer aus Stripe: Kasse `total_details.amount_tax`, Rechnung
 *   `total_taxes`. Nur wenn Stripe nichts liefert, 19 % inklusive als
 *   gekennzeichneter Ersatz (`fallback_19_inkl`). Erstattungen bekommen den
 *   Steueranteil der Originalzahlung anteilig (Stripe weist am Refund keine
 *   Steuer aus).
 * - Gebühr aus der Balance-Transaktion, sonst `null` (= nicht verfügbar, nicht 0).
 * - Zahlung ohne zuordenbaren Kauf → Zeile mit `status = quarantaene` und Log,
 *   zählt in keiner Kennzahl. Wird nachverknüpft, sobald der Kauf steht.
 * - Fehlgeschlagene Rate: kein Ereignis hier (es gibt kein `invoice.paid`).
 *
 * Fehlt Migration 114 noch, schreiben die Funktionen nichts und werfen nicht —
 * der Kaufweg darf nicht an der Buchhaltung hängen.
 */

type DB = SupabaseClient;
const MENTORING = new Set(["ausbildung", "main", "premium"]);

export function tabelleFehlt(msg: string | undefined | null): boolean {
  return /does not exist|schema cache|Could not find/i.test(msg ?? "");
}

let migrationsWarnung = false;
/** Führt eine Ledger-Funktion aus; fehlt Migration 114, wird nur einmal gewarnt. Andere Fehler werfen (Stripe wiederholt). */
export async function ledgerSicher(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (tabelleFehlt(msg)) {
      if (!migrationsWarnung) console.warn(`[finanzen] ${name}: Migration 114 fehlt, Ledger wird nicht geschrieben (${msg}).`);
      migrationsWarnung = true;
      return;
    }
    throw err;
  }
}

type KaufKurz = {
  id: string;
  user_id: string;
  email: string | null;
  produkt: string;
  zahlweise: "einmal" | "raten" | "abo";
  raten_gesamt: number | null;
  status: string;
  gekauft_am: string;
  closer: string | null;
  kassenlink_id: string | null;
  stripe_subscription_id: string | null;
  credit_closer_id: string | null;
  credit_closer_kuerzel: string | null;
  credit_regel: string | null;
};
const KAUF_SPALTEN =
  "id,user_id,email,produkt,zahlweise,raten_gesamt,status,gekauft_am,closer,kassenlink_id,stripe_subscription_id,credit_closer_id,credit_closer_kuerzel,credit_regel";

export type Buchung = {
  id: string;
  art: "zahlung" | "erstattung" | "chargeback";
  stripe_objekt_id: string;
  kauf_id: string | null;
  produkt: string | null;
  rate_nr: number | null;
  brutto_cents: number;
  steuer_cents: number;
  netto_cents: number;
  steuer_quelle: string;
  status: "gebucht" | "quarantaene";
  gebucht_am: string;
  bezug_buchung_id: string | null;
  stripe_charge_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_subscription_id: string | null;
};

const id = (v: string | { id: string } | null | undefined): string | null => (v ? (typeof v === "string" ? v : v.id) : null);
const unix = (s: number | null | undefined) => (s ? new Date(s * 1000).toISOString() : new Date().toISOString());

async function ladeKauf(db: DB, spalte: "id" | "stripe_subscription_id", wert: string): Promise<KaufKurz | null> {
  const { data, error } = await db.from("mentoring_kauf").select(KAUF_SPALTEN).eq(spalte, wert).maybeSingle();
  if (error) throw new Error(`mentoring_kauf (${spalte}=${wert}): ${error.message}`);
  return (data as KaufKurz | null) ?? null;
}

/** Legt eine Buchung an oder liefert die vorhandene (gleiche Stripe-Objekt-ID). */
async function schreibeBuchung(db: DB, zeile: Record<string, unknown>): Promise<{ buchung: Buchung; neu: boolean }> {
  const { data, error } = await db.from("finanz_buchung").insert(zeile).select("*").maybeSingle();
  if (!error && data) return { buchung: data as Buchung, neu: true };
  if (error && error.code !== "23505") throw new Error(`finanz_buchung INSERT (${String(zeile.stripe_objekt_id)}): ${error.message}`);
  const { data: alt, error: e2 } = await db.from("finanz_buchung").select("*").eq("stripe_objekt_id", zeile.stripe_objekt_id).maybeSingle();
  if (e2 || !alt) throw new Error(`finanz_buchung (${String(zeile.stripe_objekt_id)}) nicht lesbar: ${e2?.message ?? "fehlt"}`);
  return { buchung: alt as Buchung, neu: false };
}

function steuerAus(bruttoCents: number, stripeSteuer: number | null | undefined): { steuer: number; quelle: string } {
  if (typeof stripeSteuer === "number" && Number.isFinite(stripeSteuer)) return { steuer: stripeSteuer, quelle: "stripe" };
  return { steuer: steuerFallback19Inkl(bruttoCents).steuerCents, quelle: "fallback_19_inkl" };
}

/** Charge-ID und Gebühr zu einem PaymentIntent (Balance-Transaktion). Wirft nie. */
async function chargeZuPi(piId: string | null): Promise<{ chargeId: string | null; gebuehr: number | null; btId: string | null }> {
  if (!piId) return { chargeId: null, gebuehr: null, btId: null };
  try {
    const pi = await getStripe().paymentIntents.retrieve(piId, { expand: ["latest_charge.balance_transaction"] });
    const charge = typeof pi.latest_charge === "object" ? pi.latest_charge : null;
    const bt = charge && typeof charge.balance_transaction === "object" ? charge.balance_transaction : null;
    return { chargeId: id(pi.latest_charge), gebuehr: bt ? bt.fee : null, btId: bt?.id ?? id(charge?.balance_transaction ?? null) };
  } catch (err) {
    console.warn(`[finanzen] Gebühr zu ${piId} nicht lesbar:`, err instanceof Error ? err.message : err);
    return { chargeId: null, gebuehr: null, btId: null };
  }
}

/* ─── Zahlungen ─────────────────────────────────────────────────────────── */

/**
 * `checkout.session.completed` / `async_payment_succeeded` einer Mentoring-Kasse.
 * Einmalzahlung → Zahlung aus der Kasse. Raten und Live-Abo zahlen über
 * Rechnungen (`bucheMentoringRechnung`); hier nur Credit einfrieren und
 * Rechnungen aus der Quarantäne nachverknüpfen.
 */
export async function bucheMentoringCheckout(db: DB, session: Stripe.Checkout.Session, eventId: string | null): Promise<void> {
  const art = session.metadata?.art;
  if (!istMentoringArt(art)) return;
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return;

  const kauf = await ladeKauf(db, "id", session.id);
  if (kauf && MENTORING.has(kauf.produkt)) await stelleCreditSicher(db, kauf);

  const subId = id(session.subscription);
  if (art !== ART_EINMAL) {
    if (subId) await verknuepfeQuarantaene(db, subId);
    return;
  }
  const brutto = session.amount_total ?? 0;
  if (session.payment_status !== "paid" || brutto <= 0) return;

  const piId = id(session.payment_intent);
  const { chargeId, gebuehr, btId } = await chargeZuPi(piId);
  const { steuer, quelle } = steuerAus(brutto, session.total_details?.amount_tax);
  const { buchung } = await schreibeBuchung(db, {
    art: "zahlung",
    stripe_objekt_id: piId ?? session.id,
    stripe_event_id: eventId,
    stripe_payment_intent_id: piId,
    stripe_charge_id: chargeId,
    stripe_balance_txn_id: btId,
    kauf_id: kauf?.id ?? null,
    produkt: kauf?.produkt ?? session.metadata?.produkt ?? null,
    rate_nr: 1,
    user_id: kauf?.user_id ?? null,
    email: kauf?.email ?? session.customer_details?.email ?? null,
    waehrung: session.currency ?? "eur",
    brutto_cents: brutto,
    steuer_cents: steuer,
    netto_cents: brutto - steuer,
    steuer_quelle: quelle,
    gebuehr_cents: gebuehr,
    status: kauf ? "gebucht" : "quarantaene",
    quarantaene_grund: kauf ? null : "kauf_fehlt",
    gebucht_am: unix(session.created),
  });
  if (!kauf) console.error(`[finanzen] QUARANTÄNE: Einmalzahlung ${buchung.stripe_objekt_id} ohne Kauf ${session.id}.`);
  await legeProvisionAn(db, buchung);
}

function aboAusRechnung(invoice: Stripe.Invoice): string | null {
  const p = invoice.parent?.subscription_details?.subscription;
  return p ? (typeof p === "string" ? p : p.id) : null;
}

/** Steuer einer Rechnung laut Stripe (Summe `total_taxes`), anteilig, falls nicht voll bezahlt. */
export function steuerAusRechnung(invoice: Pick<Stripe.Invoice, "amount_paid" | "total" | "total_taxes">): { steuer: number; quelle: string } {
  const brutto = invoice.amount_paid ?? 0;
  const taxes = invoice.total_taxes;
  if (!Array.isArray(taxes)) return steuerAus(brutto, null);
  const summe = taxes.reduce((s, t) => s + (t.amount ?? 0), 0);
  if (invoice.total > 0 && brutto !== invoice.total) return { steuer: anteilCents(summe, brutto, invoice.total), quelle: "stripe_anteilig" };
  return { steuer: summe, quelle: "stripe" };
}

/** `invoice.paid` einer Rate oder des Live-Abos (Art aus den Abo-Metadaten). */
export async function bucheMentoringRechnung(db: DB, invoice: Stripe.Invoice, eventId: string | null): Promise<void> {
  const art = invoice.parent?.subscription_details?.metadata?.art;
  if (!istMentoringArt(art) || !invoice.id || (invoice.amount_paid ?? 0) <= 0) return;
  const subId = aboAusRechnung(invoice);
  const kauf = subId ? await ladeKauf(db, "stripe_subscription_id", subId) : null;

  let rateNr: number | null = null;
  if (kauf && kauf.zahlweise === "raten") {
    const { data } = await db.from("mentoring_rate").select("nummer").eq("id", invoice.id).maybeSingle();
    rateNr = (data as { nummer: number } | null)?.nummer ?? null;
  }

  let piId: string | null = null;
  try {
    const zahlungen = await getStripe().invoicePayments.list({ invoice: invoice.id, status: "paid", limit: 5 });
    piId = zahlungen.data.map((z) => id(z.payment.payment_intent ?? null)).find(Boolean) ?? null;
  } catch (err) {
    console.warn(`[finanzen] Zahlung zu Rechnung ${invoice.id} nicht lesbar:`, err instanceof Error ? err.message : err);
  }
  const { chargeId, gebuehr, btId } = await chargeZuPi(piId);
  const brutto = invoice.amount_paid;
  const { steuer, quelle } = steuerAusRechnung(invoice);

  const { buchung } = await schreibeBuchung(db, {
    art: "zahlung",
    stripe_objekt_id: invoice.id,
    stripe_event_id: eventId,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: piId,
    stripe_charge_id: chargeId,
    stripe_subscription_id: subId,
    stripe_balance_txn_id: btId,
    kauf_id: kauf?.id ?? null,
    produkt: kauf?.produkt ?? (art === ART_LIVE ? "live" : null),
    rate_nr: rateNr,
    user_id: kauf?.user_id ?? null,
    email: kauf?.email ?? invoice.customer_email ?? null,
    waehrung: invoice.currency ?? "eur",
    brutto_cents: brutto,
    steuer_cents: steuer,
    netto_cents: brutto - steuer,
    steuer_quelle: quelle,
    gebuehr_cents: gebuehr,
    status: kauf ? "gebucht" : "quarantaene",
    quarantaene_grund: kauf ? null : "kauf_fehlt",
    gebucht_am: unix(invoice.status_transitions?.paid_at ?? invoice.created),
  });
  if (!kauf) console.error(`[finanzen] QUARANTÄNE: Rechnung ${invoice.id} (${art}, Abo ${subId ?? "?"}) ohne Kauf.`);
  await legeProvisionAn(db, buchung);
}

/** Zahlungen aus der Quarantäne einem inzwischen angelegten Kauf zuordnen. */
export async function verknuepfeQuarantaene(db: DB, subId: string): Promise<number> {
  const { data } = await db.from("finanz_buchung").select("*").eq("status", "quarantaene").eq("stripe_subscription_id", subId);
  const zeilen = (data ?? []) as Buchung[];
  if (!zeilen.length) return 0;
  const kauf = await ladeKauf(db, "stripe_subscription_id", subId);
  if (!kauf) return 0;
  let n = 0;
  for (const b of zeilen) {
    let rateNr = b.rate_nr;
    if (kauf.zahlweise === "raten" && b.art === "zahlung" && !rateNr) {
      const { data: r } = await db.from("mentoring_rate").select("nummer").eq("id", b.stripe_objekt_id).maybeSingle();
      rateNr = (r as { nummer: number } | null)?.nummer ?? null;
    }
    const { data: neu } = await db
      .from("finanz_buchung")
      .update({ kauf_id: kauf.id, produkt: kauf.produkt, user_id: kauf.user_id, email: kauf.email, rate_nr: rateNr, status: "gebucht", quarantaene_grund: null })
      .eq("id", b.id)
      .eq("status", "quarantaene")
      .select("*")
      .maybeSingle();
    if (neu) {
      n++;
      await legeProvisionAn(db, neu as Buchung);
    }
  }
  return n;
}

/* ─── Erstattungen ──────────────────────────────────────────────────────── */

async function findeZahlung(db: DB, chargeId: string | null, piId: string | null): Promise<Buchung | null> {
  for (const [spalte, wert] of [
    ["stripe_charge_id", chargeId],
    ["stripe_payment_intent_id", piId],
  ] as const) {
    if (!wert) continue;
    const { data } = await db.from("finanz_buchung").select("*").eq("art", "zahlung").eq(spalte, wert).limit(1).maybeSingle();
    if (data) return data as Buchung;
  }
  return null;
}

/**
 * Gehört ein PaymentIntent zu einem Mentoring-Kauf? Einmalzahlungen tragen die
 * Art am PaymentIntent (`payment_intent_data.metadata`), Raten an der Rechnung
 * des Abos. Alles andere (Mitgliedsabos) gehört nicht in dieses Ledger.
 */
async function mentoringArtZuPi(piId: string | null): Promise<{ art: MentoringArt; subId: string | null } | null> {
  if (!piId) return null;
  try {
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(piId);
    if (istMentoringArt(pi.metadata?.art)) return { art: pi.metadata.art as MentoringArt, subId: null };
    const zahlungen = await stripe.invoicePayments.list({ payment: { type: "payment_intent", payment_intent: piId }, limit: 1, expand: ["data.invoice"] });
    const inv = zahlungen.data[0]?.invoice;
    if (inv && typeof inv === "object" && "parent" in inv) {
      const a = inv.parent?.subscription_details?.metadata?.art;
      if (istMentoringArt(a)) return { art: a, subId: aboAusRechnung(inv) };
    }
  } catch (err) {
    console.warn(`[finanzen] Herkunft von ${piId} nicht bestimmbar:`, err instanceof Error ? err.message : err);
  }
  return null;
}

/** Ein Refund (`refund.created/updated`, `charge.refunded`). Nur `succeeded` wirkt. */
export async function bucheErstattung(db: DB, refund: Stripe.Refund, eventId: string | null): Promise<void> {
  const chargeId = id(refund.charge);
  const piId = id(refund.payment_intent);
  if (refund.status !== "succeeded") {
    if (refund.status === "failed" || refund.status === "canceled") {
      const { data } = await db.from("finanz_buchung").select("id").eq("stripe_objekt_id", refund.id).maybeSingle();
      if (data) console.error(`[finanzen] Erstattung ${refund.id} ist nachträglich ${refund.status} — Buchung steht, bitte von Hand prüfen.`);
    }
    return;
  }
  const original = await findeZahlung(db, chargeId, piId);
  let quarantaene: string | null = null;
  let subId: string | null = original?.stripe_subscription_id ?? null;
  if (!original) {
    const herkunft = await mentoringArtZuPi(piId);
    if (!herkunft) return; // Mitgliedsabo o. Ä. — nicht Teil dieses Ledgers.
    quarantaene = "originalzahlung_fehlt";
    subId = herkunft.subId;
  }

  const brutto = -Math.abs(refund.amount);
  let steuer: number;
  let quelle: string;
  if (original && original.brutto_cents > 0) {
    steuer = -anteilCents(original.steuer_cents, Math.abs(brutto), original.brutto_cents);
    quelle = original.steuer_quelle === "stripe" ? "stripe_anteilig" : original.steuer_quelle;
    const { data: bisher } = await db.from("finanz_buchung").select("brutto_cents, stripe_objekt_id").eq("bezug_buchung_id", original.id);
    const schon = ((bisher ?? []) as { brutto_cents: number; stripe_objekt_id: string }[])
      .filter((b) => b.stripe_objekt_id !== refund.id)
      .reduce((s, b) => s + Math.abs(b.brutto_cents), 0);
    if (schon + Math.abs(brutto) > original.brutto_cents) quarantaene = "erstattung_uebersteigt_zahlung";
  } else {
    const f = steuerFallback19Inkl(Math.abs(brutto));
    steuer = -f.steuerCents;
    quelle = "fallback_19_inkl";
  }

  let gebuehr: number | null = null;
  let btId: string | null = id(refund.balance_transaction);
  try {
    const r = await getStripe().refunds.retrieve(refund.id, { expand: ["balance_transaction"] });
    if (r.balance_transaction && typeof r.balance_transaction === "object") {
      gebuehr = r.balance_transaction.fee;
      btId = r.balance_transaction.id;
    }
  } catch {
    /* Gebühr bleibt unbekannt */
  }

  const { buchung } = await schreibeBuchung(db, {
    art: "erstattung",
    stripe_objekt_id: refund.id,
    stripe_event_id: eventId,
    stripe_payment_intent_id: piId,
    stripe_charge_id: chargeId,
    stripe_subscription_id: subId,
    stripe_balance_txn_id: btId,
    bezug_buchung_id: original?.id ?? null,
    kauf_id: original?.kauf_id ?? null,
    produkt: original?.produkt ?? null,
    rate_nr: original?.rate_nr ?? null,
    user_id: null,
    email: null,
    waehrung: refund.currency ?? "eur",
    brutto_cents: brutto,
    steuer_cents: steuer,
    netto_cents: brutto - steuer,
    steuer_quelle: quelle,
    gebuehr_cents: gebuehr,
    status: quarantaene ? "quarantaene" : "gebucht",
    quarantaene_grund: quarantaene,
    gebucht_am: unix(refund.created),
  });
  if (quarantaene) console.error(`[finanzen] QUARANTÄNE: Erstattung ${refund.id} (${quarantaene}).`);
  await ergaenzeKontakt(db, buchung);
  await legeProvisionAn(db, buchung);
  if (buchung.kauf_id) await pruefeVollerstattung(db, buchung.kauf_id);
}

/** E-Mail und Konto einer Korrekturbuchung aus der Originalzahlung (für Auswertung nach Kunde). */
async function ergaenzeKontakt(db: DB, b: Buchung): Promise<void> {
  if (!b.bezug_buchung_id) return;
  const { data } = await db.from("finanz_buchung").select("email, user_id").eq("id", b.bezug_buchung_id).maybeSingle();
  const o = data as { email: string | null; user_id: string | null } | null;
  if (o) await db.from("finanz_buchung").update({ email: o.email, user_id: o.user_id }).eq("id", b.id).is("email", null);
}

/** `charge.refunded`: alle erfolgreichen Refunds der Charge buchen (idempotent). */
export async function bucheErstattungenZuCharge(db: DB, charge: Stripe.Charge, eventId: string | null): Promise<void> {
  const refunds = await getStripe().refunds.list({ charge: charge.id, limit: 100 });
  for (const r of refunds.data) await bucheErstattung(db, r, eventId);
}

/* ─── Chargebacks ───────────────────────────────────────────────────────── */

function disputeStatus(s: string): "opened" | "won" | "lost" {
  if (s === "lost") return "lost";
  if (s === "won" || s === "warning_closed" || s === "prevented") return "won";
  return "opened";
}

/**
 * `charge.dispute.created/updated/closed`. Eröffnet ist kein endgültiger
 * Ausfall; erst „lost" bucht eine negative Zeile und korrigiert die Provision.
 * „won" stellt nichts doppelt her (es wurde ja nichts gebucht).
 */
export async function bucheDispute(db: DB, dispute: Stripe.Dispute, eventId: string | null): Promise<void> {
  const chargeId = id(dispute.charge);
  const piId = id(dispute.payment_intent);
  const original = await findeZahlung(db, chargeId, piId);
  if (!original && !(await mentoringArtZuPi(piId))) return;

  const status = disputeStatus(dispute.status);
  const gebuehr = (dispute.balance_transactions ?? []).reduce((s, bt) => s + Math.max(0, bt.fee ?? 0), 0);
  const jetzt = new Date().toISOString();
  const { data: altRoh } = await db.from("finanz_dispute").select("status, verlauf").eq("id", dispute.id).maybeSingle();
  const alt = altRoh as { status: string; verlauf: unknown[] } | null;
  const schritt = { status, stripe_status: dispute.status, am: jetzt, event: eventId };

  if (!alt) {
    const { error } = await db.from("finanz_dispute").insert({
      id: dispute.id,
      stripe_charge_id: chargeId,
      stripe_payment_intent_id: piId,
      bezug_buchung_id: original?.id ?? null,
      kauf_id: original?.kauf_id ?? null,
      betrag_cents: dispute.amount,
      waehrung: dispute.currency,
      grund: dispute.reason,
      status,
      stripe_status: dispute.status,
      gebuehr_cents: gebuehr || null,
      eroeffnet_am: unix(dispute.created),
      entschieden_am: status === "opened" ? null : jetzt,
      verlauf: [schritt],
    });
    if (error && error.code !== "23505") throw new Error(`finanz_dispute INSERT (${dispute.id}): ${error.message}`);
  } else if (alt.status !== status || gebuehr) {
    if (alt.status === "lost" && status !== "lost") console.error(`[finanzen] Dispute ${dispute.id} von lost auf ${status} — Buchung bleibt, bitte prüfen.`);
    await db
      .from("finanz_dispute")
      .update({
        status,
        stripe_status: dispute.status,
        gebuehr_cents: gebuehr || null,
        updated_at: jetzt,
        ...(alt.status !== status ? { entschieden_am: status === "opened" ? null : jetzt, verlauf: [...(alt.verlauf ?? []), schritt] } : {}),
      })
      .eq("id", dispute.id);
  }

  if (status !== "lost") return;
  const brutto = -Math.abs(dispute.amount);
  const steuer = original && original.brutto_cents > 0 ? -anteilCents(original.steuer_cents, Math.abs(brutto), original.brutto_cents) : -steuerFallback19Inkl(Math.abs(brutto)).steuerCents;
  const { buchung } = await schreibeBuchung(db, {
    art: "chargeback",
    stripe_objekt_id: dispute.id,
    stripe_event_id: eventId,
    stripe_payment_intent_id: piId,
    stripe_charge_id: chargeId,
    stripe_subscription_id: original?.stripe_subscription_id ?? null,
    bezug_buchung_id: original?.id ?? null,
    kauf_id: original?.kauf_id ?? null,
    produkt: original?.produkt ?? null,
    rate_nr: original?.rate_nr ?? null,
    waehrung: dispute.currency ?? "eur",
    brutto_cents: brutto,
    steuer_cents: steuer,
    netto_cents: brutto - steuer,
    steuer_quelle: original ? (original.steuer_quelle === "stripe" ? "stripe_anteilig" : original.steuer_quelle) : "fallback_19_inkl",
    gebuehr_cents: gebuehr || null,
    status: original ? "gebucht" : "quarantaene",
    quarantaene_grund: original ? null : "originalzahlung_fehlt",
    gebucht_am: jetzt,
  });
  await ergaenzeKontakt(db, buchung);
  await legeProvisionAn(db, buchung);
  if (buchung.kauf_id) await pruefeVollerstattung(db, buchung.kauf_id);
}

/* ─── Vollerstattung ────────────────────────────────────────────────────── */

/**
 * Alles Bezahlte eines Kaufs erstattet (oder per Chargeback verloren) →
 * `mentoring_kauf.status = erstattet`. Daran hängen die Kunden-Mails U/V
 * (`lib/mailsystem/kunde-entscheidung.ts`) und der Ratenstand. Den Zugang
 * fasst das nicht an (eigene Entscheidung, nicht im Playbook geregelt).
 */
export async function pruefeVollerstattung(db: DB, kaufId: string): Promise<void> {
  const { data } = await db.from("finanz_buchung").select("art, brutto_cents").eq("kauf_id", kaufId).eq("status", "gebucht");
  const zeilen = (data ?? []) as { art: string; brutto_cents: number }[];
  const bezahlt = zeilen.filter((z) => z.art === "zahlung").reduce((s, z) => s + z.brutto_cents, 0);
  const korrigiert = zeilen.filter((z) => z.art !== "zahlung").reduce((s, z) => s + Math.abs(z.brutto_cents), 0);
  if (bezahlt <= 0 || korrigiert < bezahlt) return;
  const { data: k } = await db
    .from("mentoring_kauf")
    .update({ status: "erstattet" })
    .eq("id", kaufId)
    .neq("status", "erstattet")
    .select("zahlweise, stripe_subscription_id")
    .maybeSingle();
  const kauf = k as { zahlweise: string; stripe_subscription_id: string | null } | null;
  if (kauf?.stripe_subscription_id && kauf.zahlweise !== "einmal") {
    console.error(
      `[finanzen] Kauf ${kaufId} vollständig erstattet, Abo ${kauf.stripe_subscription_id} läuft evtl. weiter — in Stripe beenden, sonst wird weiter abgebucht.`,
    );
  }
}

/* ─── Verkaufs-Credit ───────────────────────────────────────────────────── */

/**
 * Credit eines Kaufs einfrieren, falls noch nicht geschehen (Regel in
 * `credit.ts`). Gibt den gültigen Credit zurück. Ein gesetzter Credit wird nie
 * überschrieben — auch nicht, wenn der CRM-Closer später wechselt.
 */
export async function stelleCreditSicher(db: DB, kauf: KaufKurz): Promise<Credit> {
  if (kauf.credit_regel) {
    return { closerId: kauf.credit_closer_id, kuerzel: kauf.credit_closer_kuerzel, regel: kauf.credit_regel as Credit["regel"], terminId: null };
  }
  const email = (kauf.email ?? "").trim().toLowerCase();
  const ilike = email.replace(/[\\%_]/g, (c) => `\\${c}`);
  const [termine, team, kontakt, link] = await Promise.all([
    email
      ? db.from("termine").select("id, start_am, status, gefuehrt_am, berater_email, gesetzt_von").ilike("email", ilike)
      : Promise.resolve({ data: [] }),
    db.from("crm_team").select("*"),
    email ? db.from("crm_kontakte").select("closer_id").eq("email", email).maybeSingle() : Promise.resolve({ data: null }),
    kauf.kassenlink_id ? db.from("kassenlink").select("closer").eq("id", kauf.kassenlink_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const credit = ermittleCredit({
    kaufAm: kauf.gekauft_am,
    termine: (termine.data ?? []) as CreditTermin[],
    team: (team.data ?? []) as TeamMitglied[],
    kassenlinkKuerzel: (link.data as { closer: string | null } | null)?.closer ?? kauf.closer,
    crmCloserId: (kontakt.data as { closer_id: string | null } | null)?.closer_id ?? null,
  });
  const { error } = await db
    .from("mentoring_kauf")
    .update({
      credit_closer_id: credit.closerId,
      credit_closer_kuerzel: credit.kuerzel,
      credit_regel: credit.regel,
      credit_termin_id: credit.terminId,
      credit_gesetzt_am: new Date().toISOString(),
    })
    .eq("id", kauf.id)
    .is("credit_regel", null);
  if (error) throw new Error(`Credit für ${kauf.id} nicht setzbar: ${error.message}`);
  // Parallel gesetzt? Dann gilt, was zuerst stand.
  const frisch = await ladeKauf(db, "id", kauf.id);
  if (frisch?.credit_regel) {
    return { closerId: frisch.credit_closer_id, kuerzel: frisch.credit_closer_kuerzel, regel: frisch.credit_regel as Credit["regel"], terminId: credit.terminId };
  }
  return credit;
}

/* ─── Provision ─────────────────────────────────────────────────────────── */

/**
 * Provisionseintrag zu einer Buchung (genau einer, `unique(buchung_id)`).
 * Nur Mentoring-Produkte (kein Live-Abo) und nur mit Closer-Credit; ein
 * Verkauf ohne Closer steht im Dashboard als „unassigned", ohne Provision.
 */
export async function legeProvisionAn(db: DB, b: Buchung): Promise<void> {
  if (b.status !== "gebucht" || !b.kauf_id || !b.produkt || !MENTORING.has(b.produkt)) return;
  const { data: schon } = await db.from("provision").select("id").eq("buchung_id", b.id).maybeSingle();
  if (schon) return;
  const kauf = await ladeKauf(db, "id", b.kauf_id);
  if (!kauf) return;

  let closerId: string | null;
  let kuerzel: string | null;
  if (b.art !== "zahlung" && b.bezug_buchung_id) {
    // Korrektur trifft denselben Closer wie die Originalzahlung.
    const { data: orig } = await db.from("provision").select("closer_id, closer_kuerzel").eq("buchung_id", b.bezug_buchung_id).maybeSingle();
    const o = orig as { closer_id: string | null; closer_kuerzel: string | null } | null;
    if (!o) return; // Originalzahlung ohne Provision → nichts zu korrigieren.
    closerId = o.closer_id;
    kuerzel = o.closer_kuerzel;
  } else {
    const credit = await stelleCreditSicher(db, kauf);
    closerId = credit.closerId;
    kuerzel = credit.kuerzel;
  }
  if (!closerId) return;

  let betrag: number;
  let ausgleich = 0;
  let art: "anspruch" | "korrektur_erstattung" | "korrektur_chargeback";
  if (b.art === "zahlung") {
    art = "anspruch";
    let ausgleichDaten: { nettoSummeAlleZahlungen: number; provisionBisher: number } | null = null;
    if (kauf.zahlweise === "raten" && kauf.raten_gesamt && b.rate_nr === kauf.raten_gesamt) {
      const [{ data: buchungen }, { data: provisionen }] = await Promise.all([
        db.from("finanz_buchung").select("id, art, netto_cents").eq("kauf_id", kauf.id).eq("status", "gebucht"),
        db.from("provision").select("buchung_id, betrag_cents, art").eq("kauf_id", kauf.id),
      ]);
      const bs = (buchungen ?? []) as { id: string; art: string; netto_cents: number }[];
      const zahlungen = bs.filter((x) => x.art === "zahlung");
      // Planmäßige Vollzahlung: alle Raten da, keine Korrektur am Kauf.
      if (zahlungen.length === kauf.raten_gesamt && !bs.some((x) => x.art !== "zahlung")) {
        ausgleichDaten = {
          nettoSummeAlleZahlungen: zahlungen.reduce((s, x) => s + x.netto_cents, 0),
          provisionBisher: ((provisionen ?? []) as { buchung_id: string; betrag_cents: number; art: string }[])
            .filter((p) => p.art === "anspruch" && p.buchung_id !== b.id)
            .reduce((s, p) => s + p.betrag_cents, 0),
        };
      }
    }
    const r = provisionFuerZahlung({ nettoCents: b.netto_cents, satzBp: PROVISION_SATZ_BP, ausgleich: ausgleichDaten });
    betrag = r.betragCents;
    ausgleich = r.rundungsausgleichCents;
  } else {
    art = b.art === "erstattung" ? "korrektur_erstattung" : "korrektur_chargeback";
    betrag = provisionsKorrektur(b.netto_cents, PROVISION_SATZ_BP);
  }

  const { error } = await db.from("provision").insert({
    buchung_id: b.id,
    kauf_id: kauf.id,
    closer_id: closerId,
    closer_kuerzel: kuerzel,
    art,
    basis_netto_cents: b.netto_cents,
    satz_bp: PROVISION_SATZ_BP,
    betrag_cents: betrag,
    rundungsausgleich_cents: ausgleich,
    status: "accrued",
    periode: berlinPeriode(b.gebucht_am),
    entstanden_am: b.gebucht_am,
  });
  if (error && error.code !== "23505") throw new Error(`provision INSERT (${b.id}): ${error.message}`);
}

/* ─── Live-Abo ──────────────────────────────────────────────────────────── */

/** Stand eines echten 99-€-Live-Abos für MRR und Churn (jedes Abo-Ereignis). */
export async function pflegeLiveAbo(db: DB, sub: Stripe.Subscription): Promise<void> {
  if (sub.metadata?.art !== ART_LIVE) return;
  const kauf = await ladeKauf(db, "stripe_subscription_id", sub.id);
  const item = sub.items?.data?.[0];
  const { data: altRoh } = await db.from("finanz_live_abo").select("kuendigung_angefragt_am").eq("stripe_subscription_id", sub.id).maybeSingle();
  const alt = altRoh as { kuendigung_angefragt_am: string | null } | null;
  const gekuendigt = Boolean(sub.cancel_at_period_end || sub.cancel_at);
  const periodeEnde = item?.current_period_end ? unix(item.current_period_end) : null;
  const { error } = await db.from("finanz_live_abo").upsert(
    {
      stripe_subscription_id: sub.id,
      kauf_id: kauf?.id ?? null,
      user_id: kauf?.user_id ?? sub.metadata?.user_id ?? null,
      email: kauf?.email ?? null,
      status: sub.status,
      preis_brutto_cents: item?.price?.unit_amount ?? null,
      waehrung: sub.currency ?? "eur",
      begonnen_am: sub.start_date ? unix(sub.start_date) : null,
      probe_ende_am: sub.trial_end ? unix(sub.trial_end) : null,
      periode_start_am: item?.current_period_start ? unix(item.current_period_start) : null,
      periode_ende_am: periodeEnde,
      cancel_at_period_end: Boolean(sub.cancel_at_period_end),
      kuendigung_angefragt_am: gekuendigt ? (alt?.kuendigung_angefragt_am ?? (sub.canceled_at ? unix(sub.canceled_at) : new Date().toISOString())) : null,
      vertragsende_am: sub.cancel_at ? unix(sub.cancel_at) : sub.cancel_at_period_end ? periodeEnde : sub.ended_at ? unix(sub.ended_at) : null,
      beendet_am: sub.ended_at ? unix(sub.ended_at) : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (error) throw new Error(`finanz_live_abo (${sub.id}): ${error.message}`);
}
