import { createHash, createHmac } from "node:crypto";
import { ALLE_FRAGEN } from "@/config/discord-funnel-questions";
import { pipelineStatus, type CallOutcome, type Phase } from "@/config/crm";
import { plusMonate } from "@/lib/mentoring/zugang";
import { csv, isoUtc, type Zelle } from "./csv";
import type { Rohdaten } from "./dashboard";
import { euroDezimal } from "./geld";
import { vertragsNetto } from "./kpi";
import { imZeitraum, type Zeitraum } from "./zeit";
import { leseZipStored, zipStored, type ZipDatei } from "./zip";

/**
 * Exporte (Tracking-Playbook 14 und 15) als ZIP.
 *
 * - **Buchhaltung** (`baueBuchhaltungsExport`): finanzielle Transaktionen mit
 *   Referenzen, nicht pseudonymisiert (nur Admins). Schema mit Steuerberatung
 *   abzustimmen.
 * - **ChatGPT** (`baueChatGptExport`): pseudonymisiert per HMAC-SHA-256 mit
 *   `EXPORT_PSEUDO_SECRET` (der Schlüssel liegt nie in der ZIP), ohne Namen,
 *   E-Mails, Telefonnummern und Freitexte. Mit Datenwörterbuch,
 *   KPI-Definitionen, README (inkl. bekannter Lücken) und Manifest (Zeilen,
 *   SHA-256, Min/Max-Zeit).
 *
 * Exportvertrag (15.3): UTF-8, RFC 4180, Komma, ISO-8601 UTC, Dezimalpunkt,
 * Währung als eigene Spalte, Formel-Escaping. Vor dem Ausliefern:
 * Fremdschlüssel, Zeilenzahl und Prüfsumme gegen das fertige Archiv,
 * PII-Suche — schlägt etwas fehl, gibt es **keine** ZIP, sondern einen Fehler.
 */

export const EXPORT_VERSION = "1.0";
const SCHEMA_VERSION = "2026-11-08";

type Roh = Record<string, unknown>;
const norm = (e: unknown) => (typeof e === "string" ? e.trim().toLowerCase() : "");

type Feld = { name: string; typ: "string" | "integer" | "decimal" | "datetime" | "boolean"; nullable: boolean; einheit?: string; definition: string; klasse: "technisch" | "pseudonym" | "kategorie" | "finanz" | "betrieb" };
type Datei = { name: string; felder: Feld[]; zeilen: Zelle[][]; zeitFeld?: string; hinweis?: string };

const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const enc = new TextEncoder();

export class ExportFehler extends Error {}

function zeitraumText(z: Zeitraum): { von: string; bis: string } {
  return z ? { von: z.von.toISOString(), bis: z.bis.toISOString() } : { von: "", bis: "" };
}

function dateiBytes(d: Datei): Uint8Array {
  return enc.encode(csv(d.felder.map((f) => f.name), d.zeilen));
}

function minMax(d: Datei): { min: string; max: string } {
  if (!d.zeitFeld) return { min: "", max: "" };
  const i = d.felder.findIndex((f) => f.name === d.zeitFeld);
  const werte = d.zeilen.map((z) => String(z[i] ?? "")).filter(Boolean).sort();
  return { min: werte[0] ?? "", max: werte[werte.length - 1] ?? "" };
}

/** Packt, liest zurück und vergleicht Prüfsummen — keine scheinbar vollständige ZIP bei Abweichung (Playbook 13). */
function packeUndPruefe(dateien: ZipDatei[]): Uint8Array {
  const zip = zipStored(dateien);
  const zurueck = leseZipStored(zip);
  if (zurueck.length !== dateien.length) throw new ExportFehler("Archiv unvollständig");
  dateien.forEach((d, i) => {
    if (zurueck[i]!.name !== d.name || sha256(zurueck[i]!.daten) !== sha256(d.daten)) throw new ExportFehler(`Prüfsumme von ${d.name} weicht ab`);
  });
  return zip;
}

/* ─── Gemeinsame Aufbereitung ───────────────────────────────────────────── */

function kaufListe(roh: Rohdaten) {
  const zahlungenJe = new Map<string, Roh[]>();
  for (const b of roh.buchungen.zeilen) if (b.art === "zahlung" && b.status === "gebucht" && b.kauf_id) zahlungenJe.set(String(b.kauf_id), [...(zahlungenJe.get(String(b.kauf_id)) ?? []), b]);
  return roh.kaeufe.zeilen.map((k) => {
    const id = String(k.id);
    const zs = zahlungenJe.get(id) ?? [];
    const brutto = Number(k.soll_cents ?? 0);
    const netto = vertragsNetto(brutto, zs.map((z) => ({ bruttoCents: Number(z.brutto_cents), nettoCents: Number(z.netto_cents) })));
    const erste = zs.map((z) => String(z.gebucht_am)).sort()[0] ?? null;
    return { k, id, brutto, netto, erste, zs };
  });
}

/* ─── Buchhaltung ───────────────────────────────────────────────────────── */

export function baueBuchhaltungsExport(roh: Rohdaten, z: Zeitraum, jetzt = new Date()): { zip: Uint8Array; dateiname: string } {
  if (roh.buchungen.fehlt) throw new ExportFehler("Migration 114 fehlt — kein Ledger");
  const team = roh.team.zeilen;
  const kuerzel = (uid: unknown) => (uid ? String(team.find((t) => t.user_id === uid)?.kuerzel ?? "") : "");
  const buchungen = roh.buchungen.zeilen.filter((b) => imZeitraum(String(b.gebucht_am), z));
  const zahlungen = buchungen.filter((b) => b.art === "zahlung");
  const korrekturen = buchungen.filter((b) => b.art !== "zahlung");
  const kaeufe = kaufListe(roh);
  const bezogen = new Set(buchungen.map((b) => String(b.kauf_id ?? "")).filter(Boolean));
  const orders = kaeufe.filter((o) => imZeitraum(String(o.k.gekauft_am), z) || bezogen.has(o.id));

  const ordersCsv = csv(
    ["order_id", "kunde_email", "user_id", "stripe_customer_id", "produkt", "order_type", "upgrade_from_order_id", "credit_offset_eur", "gross_contract_eur", "tax_eur", "net_contract_eur", "net_quality", "installment_count", "zahlweise", "status", "contract_signed_at", "first_paid_at", "currency", "closer_credit", "credit_regel", "kassenlink_id", "stripe_subscription_id"],
    orders.map(({ k, id, brutto, netto, erste }) => [
      id,
      (k.email as string) ?? "",
      (k.user_id as string) ?? "",
      (k.stripe_customer_id as string) ?? "",
      String(k.produkt),
      k.upgrade_von_kauf_id ? "upgrade" : k.produkt === "live" ? "subscription" : "new_sale",
      (k.upgrade_von_kauf_id as string) ?? "",
      euroDezimal(Number(k.anrechnung_cents ?? 0)),
      k.produkt === "live" ? "" : euroDezimal(brutto),
      k.produkt === "live" || netto == null ? "" : euroDezimal(brutto - netto),
      k.produkt === "live" || netto == null ? "" : euroDezimal(netto),
      k.produkt === "live" ? "" : netto == null ? "unbekannt_ohne_zahlung" : "aus_zahlungen",
      Number(k.raten_gesamt ?? (k.zahlweise === "einmal" ? 1 : 0)) || "",
      String(k.zahlweise),
      String(k.status),
      isoUtc(String(k.gekauft_am)),
      isoUtc(erste),
      "EUR",
      kuerzel(k.credit_closer_id) || (k.credit_regel === "unassigned" ? "unassigned" : ""),
      (k.credit_regel as string) ?? "",
      (k.kassenlink_id as string) ?? "",
      (k.stripe_subscription_id as string) ?? "",
    ]),
  );

  const buchungsZeile = (b: Roh): Zelle[] => [
    String(b.id),
    String(b.art),
    String(b.stripe_objekt_id),
    (b.stripe_invoice_id as string) ?? "",
    (b.stripe_payment_intent_id as string) ?? "",
    (b.stripe_charge_id as string) ?? "",
    (b.kauf_id as string) ?? "",
    b.rate_nr == null ? "" : Number(b.rate_nr),
    (b.produkt as string) ?? "",
    isoUtc(String(b.gebucht_am)),
    euroDezimal(Number(b.brutto_cents)),
    euroDezimal(Number(b.steuer_cents)),
    euroDezimal(Number(b.netto_cents)),
    String(b.steuer_quelle),
    b.gebuehr_cents == null ? "" : euroDezimal(Number(b.gebuehr_cents)),
    String(b.waehrung ?? "eur").toUpperCase(),
    String(b.status),
    (b.quarantaene_grund as string) ?? "",
    (b.bezug_buchung_id as string) ?? "",
    isoUtc(String(b.eingegangen_am)),
    (b.stripe_event_id as string) ?? "",
  ];
  const buchungsKopf = ["id", "art", "stripe_id", "stripe_invoice_id", "stripe_payment_intent_id", "stripe_charge_id", "order_id", "rate_no", "produkt", "booked_at", "gross_eur", "tax_eur", "net_eur", "tax_source", "stripe_fee_eur", "currency", "status", "quarantine_reason", "original_payment_id", "received_at", "stripe_event_id"];
  const paymentsCsv = csv(buchungsKopf, zahlungen.map(buchungsZeile));

  const disputes = roh.disputes.zeilen.filter((d) => imZeitraum(String(d.eroeffnet_am), z) || imZeitraum(String(d.entschieden_am ?? ""), z));
  const rcKopf = ["typ", ...buchungsKopf.slice(0, 1), ...buchungsKopf.slice(2), "dispute_status", "dispute_reason"];
  const rcCsv = csv(rcKopf, [
    ...korrekturen.map((b) => {
      const z0 = buchungsZeile(b);
      const d = b.art === "chargeback" ? roh.disputes.zeilen.find((x) => x.id === b.stripe_objekt_id) : undefined;
      return [String(b.art), z0[0]!, ...z0.slice(2), d ? String(d.status) : "", d ? String(d.grund ?? "") : ""];
    }),
    // Offene und gewonnene Chargebacks ohne Finanzwirkung — sichtbar, nicht gebucht.
    ...disputes
      .filter((d) => d.status !== "lost")
      .map((d) => [
        "chargeback_status",
        String(d.id),
        String(d.id),
        "",
        (d.stripe_payment_intent_id as string) ?? "",
        (d.stripe_charge_id as string) ?? "",
        (d.kauf_id as string) ?? "",
        "",
        "",
        isoUtc(String(d.eroeffnet_am)),
        euroDezimal(Number(d.betrag_cents)),
        "",
        "",
        "",
        d.gebuehr_cents == null ? "" : euroDezimal(Number(d.gebuehr_cents)),
        String(d.waehrung ?? "eur").toUpperCase(),
        "ohne_finanzwirkung",
        "",
        (d.bezug_buchung_id as string) ?? "",
        isoUtc(String(d.updated_at)),
        "",
        String(d.status),
        String(d.grund ?? ""),
      ]),
  ]);

  const letzteZahlung = new Map<string, string>();
  for (const b of roh.buchungen.zeilen) if (b.produkt === "live" && b.art === "zahlung" && b.stripe_subscription_id) {
    const s = String(b.stripe_subscription_id);
    if (!letzteZahlung.has(s) || String(b.gebucht_am) > letzteZahlung.get(s)!) letzteZahlung.set(s, String(b.gebucht_am));
  }
  const abos = roh.liveAbos.zeilen.filter((a) => {
    if (!z) return true;
    const start = a.begonnen_am ? new Date(String(a.begonnen_am)) : null;
    const ende = a.beendet_am ? new Date(String(a.beendet_am)) : null;
    return (!start || start < z.bis) && (!ende || ende >= z.von);
  });
  const subsCsv = csv(
    ["subscription_id", "order_id", "kunde_email", "plan", "status", "price_gross_eur", "currency", "started_at", "trial_end_at", "period_start_at", "period_end_at", "cancel_requested_at", "contractual_end_at", "ended_at", "last_paid_at"],
    abos.map((a) => [
      String(a.stripe_subscription_id),
      (a.kauf_id as string) ?? "",
      (a.email as string) ?? "",
      "live_99",
      String(a.status),
      a.preis_brutto_cents == null ? "" : euroDezimal(Number(a.preis_brutto_cents)),
      String(a.waehrung ?? "eur").toUpperCase(),
      isoUtc(a.begonnen_am as string),
      isoUtc(a.probe_ende_am as string),
      isoUtc(a.periode_start_am as string),
      isoUtc(a.periode_ende_am as string),
      isoUtc(a.kuendigung_angefragt_am as string),
      isoUtc(a.vertragsende_am as string),
      isoUtc(a.beendet_am as string),
      isoUtc(letzteZahlung.get(String(a.stripe_subscription_id)) ?? null),
    ]),
  );

  const provisionen = roh.provisionen.zeilen.filter((p) => imZeitraum(String(p.entstanden_am), z) || imZeitraum(String(p.ausgezahlt_am ?? ""), z));
  const provCsv = csv(
    ["id", "closer_id", "closer", "art", "basis_net_eur", "rate_pct", "amount_eur", "rounding_adjustment_eur", "status", "period", "accrued_at", "approved_at", "paid_at", "payout_ref", "payment_id", "order_id"],
    provisionen.map((p) => [
      String(p.id),
      (p.closer_id as string) ?? "",
      kuerzel(p.closer_id),
      String(p.art),
      euroDezimal(Number(p.basis_netto_cents)),
      (Number(p.satz_bp) / 100).toFixed(2),
      euroDezimal(Number(p.betrag_cents)),
      euroDezimal(Number(p.rundungsausgleich_cents ?? 0)),
      String(p.status),
      String(p.periode),
      isoUtc(String(p.entstanden_am)),
      isoUtc(p.freigegeben_am as string),
      isoUtc(p.ausgezahlt_am as string),
      (p.auszahlung_ref as string) ?? "",
      String(p.buchung_id),
      (p.kauf_id as string) ?? "",
    ]),
  );

  const gebuehren = [
    ...buchungen.filter((b) => b.gebuehr_cents != null && Number(b.gebuehr_cents) !== 0).map((b) => ["stripe_fee", String(b.id), String(b.stripe_objekt_id), isoUtc(String(b.gebucht_am)), euroDezimal(Number(b.gebuehr_cents)), "EUR", (b.stripe_balance_txn_id as string) ?? ""]),
    ...disputes.filter((d) => d.gebuehr_cents).map((d) => ["dispute_fee", String(d.id), String(d.id), isoUtc(String(d.eroeffnet_am)), euroDezimal(Number(d.gebuehr_cents)), "EUR", ""]),
  ] as Zelle[][];
  const feesCsv = csv(["kategorie", "bezug_id", "stripe_id", "datum", "betrag_eur", "currency", "balance_transaction"], gebuehren);

  // Abstimmung: Summen, Zeilen, Regelprüfungen.
  const summe = (zs: Roh[], f: string) => zs.reduce((s, b) => s + Number(b[f] ?? 0), 0);
  const unstimmig = buchungen.filter((b) => Number(b.brutto_cents) !== Number(b.netto_cents) + Number(b.steuer_cents)).length;
  const quarantaene = buchungen.filter((b) => b.status === "quarantaene").length;
  const gebucht = buchungen.filter((b) => b.status === "gebucht");
  const zr = zeitraumText(z);
  const zeilenZahl = (s: string) => s.split("\r\n").length - 2;
  const recon: Zelle[][] = [
    ["export_version", EXPORT_VERSION, ""],
    ["erstellt_am", jetzt.toISOString(), "UTC"],
    ["zeitraum_von", zr.von || "gesamt", "UTC, inklusive"],
    ["zeitraum_bis", zr.bis || "gesamt", "UTC, exklusive"],
    ["waehrung", "EUR", ""],
    ["rows_orders", zeilenZahl(ordersCsv), "Zeilen"],
    ["rows_payments", zeilenZahl(paymentsCsv), "Zeilen"],
    ["rows_refunds_chargebacks", zeilenZahl(rcCsv), "Zeilen"],
    ["rows_subscriptions", zeilenZahl(subsCsv), "Zeilen"],
    ["rows_commissions", zeilenZahl(provCsv), "Zeilen"],
    ["rows_fees_costs", zeilenZahl(feesCsv), "Zeilen"],
    ["zahlungen_brutto", euroDezimal(summe(gebucht.filter((b) => b.art === "zahlung"), "brutto_cents")), "EUR"],
    ["zahlungen_steuer", euroDezimal(summe(gebucht.filter((b) => b.art === "zahlung"), "steuer_cents")), "EUR"],
    ["zahlungen_netto", euroDezimal(summe(gebucht.filter((b) => b.art === "zahlung"), "netto_cents")), "EUR"],
    ["erstattungen_brutto", euroDezimal(summe(gebucht.filter((b) => b.art === "erstattung"), "brutto_cents")), "EUR"],
    ["chargebacks_verloren_brutto", euroDezimal(summe(gebucht.filter((b) => b.art === "chargeback"), "brutto_cents")), "EUR"],
    ["netto_zahlungseingang", euroDezimal(summe(gebucht, "netto_cents")), "EUR"],
    ["stripe_gebuehren", euroDezimal(gebuehren.reduce((s, g) => s + Math.round(Number(g[4]) * 100), 0)), "EUR"],
    ["provision_accrued", euroDezimal(summe(provisionen.filter((p) => p.status === "accrued"), "betrag_cents")), "EUR"],
    ["provision_approved", euroDezimal(summe(provisionen.filter((p) => p.status === "approved"), "betrag_cents")), "EUR"],
    ["provision_paid", euroDezimal(summe(provisionen.filter((p) => p.status === "paid"), "betrag_cents")), "EUR"],
    ["pruefung_brutto_gleich_netto_plus_steuer", unstimmig ? `fehler:${unstimmig}` : "ok", ""],
    ["quarantaene_buchungen", quarantaene, "nicht in Summen enthalten"],
    ["steuer_fallback_buchungen", buchungen.filter((b) => b.steuer_quelle === "fallback_19_inkl").length, "19 % inkl. statt Stripe-Steuer"],
    ["status", unstimmig ? "fehler" : quarantaene ? "warnung" : "ok", ""],
    ["hinweis", "Schema mit Steuerberatung abzustimmen (Playbook 14, Prüfpunkt T-07). Payouts sind kein Umsatz und nicht enthalten.", ""],
  ];
  if (unstimmig) throw new ExportFehler(`${unstimmig} Buchung(en) mit Brutto ≠ Netto + Steuer`);
  const reconCsv = csv(["kennzahl", "wert", "einheit"], recon);

  const dateien: ZipDatei[] = [
    ["orders.csv", ordersCsv],
    ["payments.csv", paymentsCsv],
    ["refunds_chargebacks.csv", rcCsv],
    ["subscriptions.csv", subsCsv],
    ["commissions.csv", provCsv],
    ["fees_costs.csv", feesCsv],
    ["reconciliation.csv", reconCsv],
  ].map(([name, inhalt]) => ({ name: name!, daten: enc.encode(inhalt!) }));
  const tag = jetzt.toISOString().slice(0, 10);
  return { zip: packeUndPruefe(dateien), dateiname: `capital-circle-buchhaltung-${tag}.zip` };
}

/* ─── ChatGPT ───────────────────────────────────────────────────────────── */

export function pseudoSecret(): string | null {
  const s = process.env.EXPORT_PSEUDO_SECRET?.trim();
  return s && s.length >= 32 ? s : null;
}

export function baueChatGptExport(roh: Rohdaten, sitzungen: Roh[], z: Zeitraum, secret: string, jetzt = new Date()): { zip: Uint8Array; dateiname: string } {
  const p = (art: string, wert: unknown) => (wert == null || wert === "" ? "" : `${art}_${createHmac("sha256", secret).update(`${art}:${String(wert)}`).digest("hex").slice(0, 20)}`);
  const pc = (email: unknown) => p("pc", norm(email));
  const team = roh.team.zeilen;
  const closerId = (uid: unknown) => (uid ? String(team.find((t) => t.user_id === uid)?.kuerzel ?? "unbekannt") : "unassigned");
  const kontakte = new Map(roh.kontakte.zeilen.map((k) => [norm(k.email), k]));
  const kanal = (email: unknown) => norm(kontakte.get(norm(email))?.kanal) || "unknown";
  const funnelVon = (email: unknown) => {
    const q = String(kontakte.get(norm(email))?.quelle ?? "");
    return q === "training" || q === "bewerbung" ? "free" : ["call_funnel", "termin_direct", "discord_funnel"].includes(q) ? "main" : "unknown";
  };
  const benutzteKontakte = new Set<string>();
  const merke = (email: unknown) => {
    const e = norm(email);
    if (e) benutzteKontakte.add(e);
    return pc(e);
  };
  const mailJeUser = new Map<string, string>();
  for (const b of roh.bewerbungen.zeilen) if (b.user_id && b.email) mailJeUser.set(String(b.user_id), norm(b.email));
  for (const k of roh.kaeufe.zeilen) if (k.user_id && k.email && !mailJeUser.has(String(k.user_id))) mailJeUser.set(String(k.user_id), norm(k.email));
  for (const k of roh.kontakte.zeilen) if (k.user_id && k.email && !mailJeUser.has(String(k.user_id))) mailJeUser.set(String(k.user_id), norm(k.email));

  const auswahl = ALLE_FRAGEN.filter((q) => q.typ !== "freitext" && q.options.length);
  const kategorie = (answers: unknown, frageId: string) => {
    const v = ((answers ?? {}) as Record<string, unknown>)[frageId];
    const q = auswahl.find((x) => x.id === frageId);
    return q && typeof v === "string" && q.options.includes(v) ? `${frageId}_${q.options.indexOf(v) + 1}` : "";
  };

  const im = (v: unknown) => imZeitraum(v ? String(v) : null, z);
  const ergebnisse = [...roh.ergebnisse.zeilen].sort((a, b) => Number(a.version) - Number(b.version));
  const ergebnisJe = new Map(ergebnisse.map((e) => [String(e.termin_id), e]));
  const kaeufe = kaufListe(roh);

  /* funnel_events.csv — nur serverbestätigte Ereignisse */
  const ev: Zelle[][] = [];
  const event = (name: string, am: unknown, email: unknown, objektArt: string, objektId: string, system: string) => {
    if (!im(am)) return;
    ev.push([p("ev", `${name}:${objektId}:${String(am)}`), name, "1", isoUtc(String(am)), merke(email), funnelVon(email), objektArt, objektId, kanal(email), system, "server_confirmed"]);
  };
  for (const b of roh.bewerbungen.zeilen) {
    event("application_submitted", b.eingereicht_am, b.email, "free_application", p("app", b.id), "platform");
    if (b.geprueft_am && b.status !== "offen") event(`application_${String(b.status) === "angenommen" ? "accepted" : "rejected"}`, b.geprueft_am, b.email, "free_application", p("app", b.id), "admin");
  }
  for (const l of roh.dLeads.zeilen) if (l.questions_completed_at) event("call_application_submitted", l.questions_completed_at, l.email, "main_application", p("app", l.id), "platform");
  for (const l of roh.tLeads.zeilen) if (l.fragen_am) event("call_application_submitted", l.fragen_am, l.email, "training_application", p("app", l.id), "platform");
  for (const x of roh.zugang.zeilen) if (!x.aus_bestand) event("course_access_granted", x.freigeschaltet_am, mailJeUser.get(String(x.user_id)) ?? "", "course_access", p("acc", x.user_id), "platform");
  for (const t of roh.termine.zeilen) {
    const call = p("call", t.id);
    event(t.vorgaenger_id ? "booking_rescheduled" : "booking_confirmed", t.created_at, t.email, "booking", call, "calendar");
    if (t.abgesagt_am) event("booking_cancelled", t.abgesagt_am, t.email, "booking", call, "calendar");
    if (t.status === "gefuehrt") event("call_held", t.gefuehrt_am ?? t.start_am, t.email, "call", call, "crm");
    if (t.status === "no_show") event("call_no_show", t.no_show_am ?? t.start_am, t.email, "call", call, "crm");
  }
  for (const e of ergebnisse) {
    const t = roh.termine.zeilen.find((x) => x.id === e.termin_id);
    if (t) event("call_outcome_recorded", e.am, t.email, "call", p("call", t.id), "crm");
  }
  for (const { k } of kaeufe) event("order_created", k.gekauft_am, k.email, "order", p("ord", k.id), "stripe");
  for (const b of roh.buchungen.zeilen) {
    if (b.status !== "gebucht") continue;
    const name = b.art === "zahlung" ? "payment_succeeded" : b.art === "erstattung" ? "refund_succeeded" : "chargeback_lost";
    event(name, b.gebucht_am, b.email ?? (b.kauf_id ? kaeufe.find((x) => x.id === b.kauf_id)?.k.email : ""), "payment", p("pay", b.id), "stripe");
  }
  for (const d of roh.disputes.zeilen) {
    const email = d.kauf_id ? kaeufe.find((x) => x.id === d.kauf_id)?.k.email : "";
    event("chargeback_opened", d.eroeffnet_am, email, "dispute", p("dsp", d.id), "stripe");
    if (d.status !== "opened" && d.entschieden_am) event(`chargeback_${String(d.status)}`, d.entschieden_am, email, "dispute", p("dsp", d.id), "stripe");
  }
  for (const a of roh.liveAbos.zeilen) {
    event("subscription_started", a.begonnen_am, a.email, "subscription", p("sub", a.stripe_subscription_id), "stripe");
    if (a.kuendigung_angefragt_am) event("subscription_cancel_scheduled", a.kuendigung_angefragt_am, a.email, "subscription", p("sub", a.stripe_subscription_id), "stripe");
    if (a.beendet_am) event("subscription_ended", a.beendet_am, a.email, "subscription", p("sub", a.stripe_subscription_id), "stripe");
  }
  ev.sort((a, b) => String(a[3]).localeCompare(String(b[3])));

  /* sessions_pages.csv — Kaufweg-Messung der Verkaufsseite */
  const ses = sitzungen
    .filter((s) => im(s.begonnen_am))
    .map((s) => [
      p("ses", s.sitzung),
      "",
      isoUtc(String(s.begonnen_am)),
      isoUtc(String(s.zuletzt_am)),
      Number(s.sichtbare_ms ?? 0),
      Number(s.max_scroll ?? 0),
      String(s.max_abschnitt ?? ""),
      String(s.erste_seite ?? ""),
      String(s.geraet ?? "unknown"),
      String(s.utm_quelle ?? "") || "unknown",
      String(s.utm_medium ?? ""),
      String(s.utm_kampagne ?? ""),
      Number(s.klicks ?? 0),
      Boolean(s.kasse_gestartet),
      "partial",
    ]) as Zelle[][];

  /* calls.csv */
  const calls = roh.termine.zeilen
    .filter((t) => im(t.start_am) || im(t.created_at))
    .map((t) => {
      const e = ergebnisJe.get(String(t.id));
      const fu = e?.follow_up_am ? String(e.follow_up_am) : null;
      const kontakt = kontakte.get(norm(t.email));
      return [
        p("call", t.id),
        p("book", t.vorgang),
        merke(t.email),
        closerId(kontakt?.closer_id ?? null),
        String(t.status),
        isoUtc(String(t.start_am)),
        isoUtc(t.gefuehrt_am as string),
        isoUtc(String(t.created_at)),
        (e?.outcome as string) ?? "",
        (e?.produkt as string) ?? "",
        (e?.grund as string) ?? "",
        isoUtc(fu),
        fu ? (new Date(fu).getTime() < jetzt.getTime() ? "overdue" : "open") : "none",
        e ? Number(e.version) : "",
        String(t.lead_art) === "training" ? "free" : "main",
      ];
    }) as Zelle[][];

  /* orders.csv, installments.csv, payments_refunds.csv */
  const bezogen = new Set(roh.buchungen.zeilen.filter((b) => im(b.gebucht_am)).map((b) => String(b.kauf_id ?? "")));
  const orderListe = kaeufe.filter((o) => im(o.k.gekauft_am) || bezogen.has(o.id));
  const orders = orderListe.map(({ k, id, brutto, netto }) => [
    p("ord", id),
    merke(k.email),
    String(k.produkt),
    k.upgrade_von_kauf_id ? "upgrade" : k.produkt === "live" ? "subscription" : "new_sale",
    p("ord", k.upgrade_von_kauf_id),
    euroDezimal(Number(k.anrechnung_cents ?? 0)),
    k.produkt === "live" ? "" : euroDezimal(brutto),
    k.produkt === "live" || netto == null ? "" : euroDezimal(brutto - netto),
    k.produkt === "live" || netto == null ? "" : euroDezimal(netto),
    k.produkt === "live" ? "" : netto == null ? "unknown" : "from_payments",
    Number(k.raten_gesamt ?? (k.zahlweise === "einmal" ? 1 : 0)) || "",
    closerId(k.credit_closer_id),
    (k.credit_regel as string) ?? "",
    isoUtc(String(k.gekauft_am)),
    String(k.status),
    "EUR",
    funnelVon(k.email),
  ]) as Zelle[][];
  const orderIds = new Set(orders.map((o) => String(o[0])));

  const raten: Zelle[][] = [];
  for (const { k, id, zs } of orderListe) {
    if (k.produkt === "live") continue;
    const n = Number(k.raten_gesamt ?? 1) || 1;
    const soll = Number(k.soll_cents ?? 0);
    const regel = Math.floor(soll / n);
    const bezahlt = zs.filter((z0) => z0.rate_nr != null).sort((a, b) => Number(a.rate_nr) - Number(b.rate_nr));
    for (let r = 1; r <= n; r++) {
      const faellig = plusMonate(new Date(String(k.gekauft_am)), r - 1);
      const zahlung = bezahlt.find((b) => Number(b.rate_nr) === r) ?? (n === 1 ? zs[0] : undefined);
      const status = zahlung ? "paid" : k.status === "erstattet" || k.status === "beendet" ? "cancelled" : faellig.getTime() + 3 * 86_400_000 < jetzt.getTime() ? "overdue" : "planned";
      raten.push([p("ord", id), r, isoUtc(faellig), euroDezimal(r === 1 ? soll - regel * (n - 1) : regel), status, isoUtc((zahlung?.gebucht_am as string) ?? null), "EUR"]);
    }
  }

  const pr = roh.buchungen.zeilen
    .filter((b) => im(b.gebucht_am) && b.status === "gebucht")
    .map((b) => [
      p("pay", b.id),
      String(b.art),
      p("ord", b.kauf_id),
      b.rate_nr == null ? "" : Number(b.rate_nr),
      String(b.produkt ?? ""),
      isoUtc(String(b.gebucht_am)),
      euroDezimal(Number(b.brutto_cents)),
      euroDezimal(Number(b.steuer_cents)),
      euroDezimal(Number(b.netto_cents)),
      String(b.steuer_quelle),
      p("pay", b.bezug_buchung_id),
      "EUR",
    ]) as Zelle[][];
  // Zahlungen, deren Order außerhalb liegt, wurden oben mit aufgenommen — Fremdschlüssel prüfen.
  const fehlendeOrder = [...pr.map((z0) => String(z0[2] ?? "")), ...raten.map((z0) => String(z0[0] ?? ""))].find((o) => o && !orderIds.has(o));
  if (fehlendeOrder) throw new ExportFehler(`Fremdschlüssel: order_id ${fehlendeOrder} fehlt in orders.csv`);

  const subs = roh.liveAbos.zeilen.map((a) => [
    p("sub", a.stripe_subscription_id),
    merke(a.email),
    "live_99",
    String(a.status),
    isoUtc(a.begonnen_am as string),
    isoUtc(a.periode_ende_am as string),
    isoUtc(a.kuendigung_angefragt_am as string),
    isoUtc(a.vertragsende_am as string),
    isoUtc(a.beendet_am as string),
    a.preis_brutto_cents == null ? "" : euroDezimal(Number(a.preis_brutto_cents)),
    "EUR",
  ]) as Zelle[][];

  const kosten = roh.buchungen.zeilen
    .filter((b) => im(b.gebucht_am) && b.gebuehr_cents != null && Number(b.gebuehr_cents) !== 0)
    .map((b) => [p("cost", b.id), "stripe_fee", euroDezimal(Number(b.gebuehr_cents)), "", euroDezimal(Number(b.gebuehr_cents)), isoUtc(String(b.gebucht_am)), "EUR"]) as Zelle[][];

  /* leads.csv, applications.csv, closers.csv */
  const neueKontakte = roh.kontakte.zeilen.filter((k) => im(k.created_at)).map((k) => norm(k.email));
  for (const e of neueKontakte) benutzteKontakte.add(e);
  const letztesOutcome = new Map<string, CallOutcome>();
  for (const t of [...roh.termine.zeilen].sort((a, b) => String(a.start_am).localeCompare(String(b.start_am)))) {
    const e = ergebnisJe.get(String(t.id));
    if (e) letztesOutcome.set(norm(t.email), e.outcome as CallOutcome);
  }
  const antwortenJe = new Map<string, unknown>();
  for (const l of [...roh.dLeads.zeilen, ...roh.tLeads.zeilen].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))) antwortenJe.set(norm(l.email), l.answers);
  const leads = [...benutzteKontakte].sort().map((e) => {
    const k = kontakte.get(e);
    const a = antwortenJe.get(e);
    return [
      pc(e),
      String(k?.quelle ?? "unknown"),
      norm(k?.kanal) || "unknown",
      "",
      k ? "identified_after_submit" : "unknown",
      isoUtc((k?.created_at as string) ?? null),
      String(k?.phase ?? ""),
      k ? pipelineStatus({ phase: String(k.phase) as Phase, verlustGrund: (k.verlust_grund as string | null) ?? null, letztesOutcome: letztesOutcome.get(e) ?? null }) : "",
      closerId(k?.closer_id ?? null),
      kategorie(a, "trading_stand"),
      kategorie(a, "ziel"),
      kategorie(a, "investition"),
      funnelVon(e),
    ];
  }) as Zelle[][];

  const apps: Zelle[][] = [
    ...roh.bewerbungen.zeilen.filter((b) => im(b.eingereicht_am)).map((b) => [p("app", b.id), pc(b.email), "free", isoUtc(String(b.eingereicht_am)), String(b.status), "", "", ""]),
    ...roh.dLeads.zeilen.filter((l) => im(l.questions_completed_at)).map((l) => [p("app", l.id), pc(l.email), "main_call", isoUtc(String(l.questions_completed_at)), "submitted", kategorie(l.answers, "trading_stand"), kategorie(l.answers, "ziel"), kategorie(l.answers, "investition")]),
    ...roh.tLeads.zeilen.filter((l) => im(l.fragen_am)).map((l) => [p("app", l.id), pc(l.email), "training_call", isoUtc(String(l.fragen_am)), "submitted", kategorie(l.answers, "trading_stand"), kategorie(l.answers, "ziel"), kategorie(l.answers, "investition")]),
  ];
  // Fremdschlüssel: Jeder Kontakt aus applications.csv steht in leads.csv.
  const leadIds = new Set(leads.map((l) => String(l[0])));
  for (const a of apps) {
    const id = String(a[1] ?? "");
    if (!id || leadIds.has(id)) continue;
    leads.push([id, "unknown", "unknown", "", "unknown", "", "", "", "unassigned", "", "", "", "unknown"]);
    leadIds.add(id);
  }

  const closers = team.map((t) => [String(t.kuerzel), String(t.name), Boolean(t.aktiv), isoUtc(String(t.created_at ?? "")), ""]) as Zelle[][];
  closers.push(["unassigned", "Nicht zugewiesen", true, "", "Aggregationswert"]);

  /* Dateien mit Datenwörterbuch */
  const F = (name: string, typ: Feld["typ"], definition: string, klasse: Feld["klasse"] = "technisch", nullable = true, einheit = ""): Feld => ({ name, typ, nullable, einheit, definition, klasse });
  const geldFeld = (name: string, d: string) => F(name, "decimal", d, "finanz", true, "EUR");
  const dateien: Datei[] = [
    {
      name: "funnel_events.csv",
      zeitFeld: "occurred_at_utc",
      felder: [
        F("event_id", "string", "Pseudonyme, stabile Ereignis-ID", "pseudonym", false),
        F("event_name", "string", "application_submitted, application_accepted/rejected, call_application_submitted, course_access_granted, booking_confirmed/rescheduled/cancelled, call_held, call_no_show, call_outcome_recorded, order_created, payment_succeeded, refund_succeeded, chargeback_opened/won/lost, subscription_started/cancel_scheduled/ended", "kategorie", false),
        F("event_version", "string", "Schema-Version des Ereignisses", "technisch", false),
        F("occurred_at_utc", "datetime", "Zeitpunkt des Geschehens, ISO-8601 UTC", "technisch", false),
        F("pseudo_contact_id", "string", "HMAC-Pseudonym der E-Mail (Kontakt)", "pseudonym"),
        F("funnel", "string", "free | main | unknown (erste bekannte Quelle)", "kategorie"),
        F("object_type", "string", "Fachobjekt", "kategorie"),
        F("object_id", "string", "Pseudonyme Objekt-ID (verknüpft mit den übrigen Dateien)", "pseudonym"),
        F("source", "string", "Kanal des Kontakts (UTM bei Registrierung), sonst unknown", "kategorie"),
        F("source_system", "string", "platform, calendar, crm, admin, stripe", "technisch", false),
        F("quality", "string", "server_confirmed — Client-Events (Seite, VSL) sind nicht enthalten", "technisch"),
      ],
      zeilen: ev,
    },
    {
      name: "sessions_pages.csv",
      zeitFeld: "started_at",
      hinweis: "Nur Verkaufsseite / (Kaufweg-Messung), Rohdaten 90 Tage aufbewahrt; nicht mit Kontakten verknüpft.",
      felder: [
        F("session_id", "string", "Pseudonyme Sitzungs-ID", "pseudonym", false),
        F("pseudo_contact_id", "string", "Leer: Sitzungen werden nicht mit Kontakten verknüpft (keine Identifikation)", "pseudonym"),
        F("started_at", "datetime", "Sitzungsbeginn UTC"),
        F("last_seen_at", "datetime", "Letztes Ereignis UTC (Näherung für das Ende)"),
        F("active_ms", "integer", "Sichtbare Zeit (Tab im Vordergrund)", "technisch", false, "ms"),
        F("max_scroll_pct", "integer", "Maximal beobachtete Scrolltiefe", "technisch", false, "%"),
        F("max_section", "string", "Tiefster gesehener Abschnitt", "kategorie"),
        F("landing_page", "string", "Erste Seite (Pfad)", "kategorie"),
        F("device", "string", "desktop | mobile | tablet | unknown", "kategorie"),
        F("utm_source", "string", "UTM-Quelle der Sitzung, sonst unknown", "kategorie"),
        F("utm_medium", "string", "UTM-Medium", "kategorie"),
        F("utm_campaign", "string", "UTM-Kampagne", "kategorie"),
        F("cta_clicks", "integer", "Klicks auf Kauf-/Beitrittsknöpfe", "technisch", false),
        F("checkout_started", "boolean", "Kasse geöffnet", "technisch", false),
        F("quality", "string", "partial (keine Consent-/Botfilter-Kennzeichnung je Sitzung)"),
      ],
      zeilen: ses,
    },
    {
      name: "video_retention_5s.csv",
      hinweis: "LÜCKE: VSL-Messung ist P1 und nicht gebaut — Datei absichtlich leer.",
      felder: [F("video_id", "string", "VSL/Lektion"), F("video_version", "string", "Fassung"), F("bucket_start_s", "integer", "Intervallbeginn", "technisch", true, "s"), F("bucket_end_s", "integer", "Intervallende", "technisch", true, "s"), F("viewers_started", "integer", "Starts der Kohorte"), F("viewers_reached", "integer", "Zuschauer, die das Intervall abgespielt haben"), F("rate", "decimal", "reached / started")],
      zeilen: [],
    },
    {
      name: "video_paths_pseudonymous.csv",
      hinweis: "LÜCKE: VSL-Messung ist P1 und nicht gebaut — Datei absichtlich leer.",
      felder: [F("pseudo_id", "string", "Pseudonym", "pseudonym"), F("session_id", "string", "Sitzung", "pseudonym"), F("video_id", "string", "Video"), F("played_seconds", "decimal", "Wiedergabezeit", "technisch", true, "s"), F("unique_coverage", "decimal", "Einzigartige Abdeckung", "technisch", true, "Anteil"), F("replay_seconds", "decimal", "Replay", "technisch", true, "s"), F("seeks", "integer", "Sprünge"), F("milestones", "string", "25/50/75/95/100")],
      zeilen: [],
    },
    {
      name: "leads.csv",
      zeitFeld: "created_at",
      felder: [
        F("pseudo_contact_id", "string", "HMAC-Pseudonym der E-Mail", "pseudonym", false),
        F("first_known_source", "string", "Erste Quelle im CRM: call_funnel, termin_direct, discord_funnel, training, bewerbung, ht_apply, manuell, unknown", "kategorie", false),
        F("first_known_channel", "string", "Kanal (youtube, instagram, tiktok, podcast, google, direkt, sonstige) oder unknown", "kategorie", false),
        F("last_non_direct_source", "string", "Nicht erfasst (leer) — Lücke", "kategorie"),
        F("attribution_confidence", "string", "identified_after_submit | unknown", "kategorie", false),
        F("created_at", "datetime", "Kontakt angelegt UTC"),
        F("crm_phase", "string", "Aktuelle CRM-Phase", "kategorie"),
        F("pipeline_status", "string", "Statusbegriff Playbook 4.3", "kategorie"),
        F("closer_id", "string", "Aktuell zuständiger Closer (Kürzel) oder unassigned", "betrieb"),
        F("trading_stage", "string", "Antwortkategorie trading_stand_1..4 (Optionstext im README)", "kategorie"),
        F("long_term_goal", "string", "Antwortkategorie ziel_1..4", "kategorie"),
        F("budget_band", "string", "Antwortkategorie investition_1..4", "kategorie"),
        F("funnel", "string", "free | main | unknown", "kategorie"),
      ],
      zeilen: leads,
    },
    {
      name: "applications.csv",
      zeitFeld: "submitted_at",
      felder: [
        F("application_id", "string", "Pseudonyme Bewerbungs-/Anfrage-ID", "pseudonym", false),
        F("pseudo_contact_id", "string", "Kontakt", "pseudonym"),
        F("type", "string", "free (Free-Kurs-Bewerbung) | main_call (/call, /termin, Discord) | training_call (Analysegespräch)", "kategorie", false),
        F("submitted_at", "datetime", "Serverbestätigt UTC", "technisch", false),
        F("status", "string", "Free: offen/angenommen/abgelehnt; Anfragen: submitted", "kategorie"),
        F("trading_stage", "string", "Kategorie (Free-Bewerbung: nur Freitext, daher leer)", "kategorie"),
        F("long_term_goal", "string", "Kategorie", "kategorie"),
        F("budget_band", "string", "Kategorie", "kategorie"),
      ],
      zeilen: apps,
    },
    {
      name: "calls.csv",
      zeitFeld: "scheduled_at",
      felder: [
        F("call_id", "string", "Terminversion (Umbuchung = neue Version)", "pseudonym", false),
        F("booking_id", "string", "Gesprächsvorgang, stabil über Umbuchungen", "pseudonym", false),
        F("pseudo_contact_id", "string", "Kontakt", "pseudonym"),
        F("closer_id", "string", "Aktuell zuständiger Closer (Kürzel) oder unassigned", "betrieb"),
        F("status", "string", "gebucht, umgebucht, abgesagt_kunde, abgesagt_team, gefuehrt, no_show", "kategorie", false),
        F("scheduled_at", "datetime", "Terminbeginn UTC"),
        F("held_at", "datetime", "Als geführt markiert UTC"),
        F("booked_at", "datetime", "Buchung UTC"),
        F("outcome", "string", "won_payment_pending, open_decision, lost, unqualified, no_show (letzte Version)", "kategorie"),
        F("product", "string", "main, premium, ausbildung, none", "kategorie"),
        F("reason", "string", "budget, timing, trust, consideration, fit, other", "kategorie"),
        F("follow_up_at", "datetime", "Nächstes Follow-up UTC"),
        F("follow_up_status", "string", "open | overdue | none (zum Exportzeitpunkt)", "kategorie"),
        F("outcome_version", "integer", "Version der Ergebnis-Maske"),
        F("funnel", "string", "free | main (Lead-Art)", "kategorie"),
      ],
      zeilen: calls,
    },
    {
      name: "closers.csv",
      felder: [F("closer_id", "string", "Stabiler Kürzel-Schlüssel", "betrieb", false), F("display_name", "string", "Anzeigename (Vorname)", "betrieb", false), F("active", "boolean", "Derzeit aktiv"), F("active_since", "datetime", "Im CRM-Team seit"), F("note", "string", "Hinweis")],
      zeilen: closers,
    },
    {
      name: "orders.csv",
      zeitFeld: "ordered_at",
      felder: [
        F("order_id", "string", "Pseudonyme Order-ID", "pseudonym", false),
        F("pseudo_contact_id", "string", "Kontakt", "pseudonym"),
        F("product", "string", "ausbildung, main, premium, live", "kategorie", false),
        F("order_type", "string", "new_sale | upgrade | subscription", "kategorie", false),
        F("upgrade_from_order_id", "string", "Angerechnete Ausbildung", "pseudonym"),
        geldFeld("credit_offset", "Anrechnung beim Upgrade (499 €)"),
        geldFeld("gross_contract", "Vertragsvolumen brutto (Upgrade: nur Zusatzauftrag)"),
        geldFeld("tax_contract", "USt aus den tatsächlichen Zahlungen (leer ohne Zahlung)"),
        geldFeld("net_contract", "Vertragsvolumen netto"),
        F("net_quality", "string", "from_payments | unknown"),
        F("installment_count", "integer", "Raten (Ausbildung ≤ 2, Main/Premium ≤ 6)"),
        F("closer_credit", "string", "Eingefrorener Verkaufs-Credit (Kürzel) oder unassigned", "betrieb"),
        F("credit_rule", "string", "gefuehrter_call | kassenlink | crm_zuweisung | unassigned"),
        F("ordered_at", "datetime", "Kaufzeitpunkt UTC", "technisch", false),
        F("status", "string", "aktiv, vollstaendig, beendet, erstattet", "kategorie"),
        F("currency", "string", "EUR", "finanz", false),
        F("funnel", "string", "free | main | unknown", "kategorie"),
      ],
      zeilen: orders,
    },
    {
      name: "installments.csv",
      zeitFeld: "due_at",
      felder: [F("order_id", "string", "Order", "pseudonym", false), F("rate_no", "integer", "Ratennummer", "technisch", false), F("due_at", "datetime", "Geplante Fälligkeit (Kauf + n−1 Monate)"), geldFeld("planned_gross", "Geplanter Bruttobetrag (Restcent auf Rate 1)"), F("status", "string", "paid | planned | overdue | cancelled", "kategorie", false), F("paid_at", "datetime", "Zahlungszeitpunkt"), F("currency", "string", "EUR", "finanz", false)],
      zeilen: raten,
    },
    {
      name: "payments_refunds.csv",
      zeitFeld: "booked_at",
      felder: [
        F("id", "string", "Pseudonyme Buchungs-ID", "pseudonym", false),
        F("type", "string", "zahlung | erstattung | chargeback (verloren)", "kategorie", false),
        F("order_id", "string", "Order", "pseudonym"),
        F("rate_no", "integer", "Rate"),
        F("product", "string", "Produkt", "kategorie"),
        F("booked_at", "datetime", "Zahlungs-/Erstattungszeitpunkt UTC", "technisch", false),
        geldFeld("gross", "Brutto (Korrekturen negativ)"),
        geldFeld("tax", "USt laut Stripe bzw. anteilig/Ersatz"),
        geldFeld("net", "Netto = Brutto − USt"),
        F("tax_source", "string", "stripe | stripe_anteilig | fallback_19_inkl | unbekannt"),
        F("original_id", "string", "Originalzahlung bei Korrekturen", "pseudonym"),
        F("currency", "string", "EUR", "finanz", false),
      ],
      zeilen: pr,
    },
    {
      name: "subscriptions.csv",
      zeitFeld: "started_at",
      felder: [F("subscription_id", "string", "Pseudonym", "pseudonym", false), F("pseudo_contact_id", "string", "Kontakt", "pseudonym"), F("plan", "string", "live_99", "kategorie", false), F("status", "string", "Stripe-Status", "kategorie", false), F("started_at", "datetime", "Beginn"), F("period_end_at", "datetime", "Ende des laufenden Zeitraums"), F("cancel_requested_at", "datetime", "Kündigungsanfrage"), F("contractual_end_at", "datetime", "Vertragsende"), F("ended_at", "datetime", "Beendet"), geldFeld("price_gross", "Monatspreis brutto"), F("currency", "string", "EUR", "finanz", false)],
      zeilen: subs,
    },
    {
      name: "costs.csv",
      zeitFeld: "date",
      hinweis: "Nur Stripe-Gebühren; weitere Kostenkategorien sind nicht erfasst.",
      felder: [F("reference", "string", "Pseudonyme Referenz", "pseudonym", false), F("category", "string", "stripe_fee", "kategorie", false), geldFeld("net", "Netto"), geldFeld("tax", "USt (unbekannt, leer)"), geldFeld("gross", "Brutto"), F("date", "datetime", "Datum"), F("currency", "string", "EUR", "finanz", false)],
      zeilen: kosten,
    },
  ];

  // PII-Suche: keine E-Mail-Adressen in den Datendateien (QA-Karte 19).
  const mail = /[^\s,"@]+@[^\s,"@]+\.[a-z]{2,}/i;
  for (const d of dateien) for (const zeile of d.zeilen) for (const zelle of zeile) if (typeof zelle === "string" && mail.test(zelle)) throw new ExportFehler(`PII-Prüfung: E-Mail-Adresse in ${d.name}`);

  const dictionary = csv(
    ["file", "field", "type", "nullable", "enum_or_unit", "definition", "privacy_class"],
    dateien.flatMap((d) => d.felder.map((f) => [d.name, f.name, f.typ, f.nullable, f.einheit ?? "", f.definition, f.klasse])),
  );
  const kpis = csv(
    ["kpi", "formula", "numerator", "denominator", "population", "time_logic", "filter_semantics", "version"],
    [
      ["net_cash_in", "sum(net payments) + sum(net refunds/lost chargebacks, negative)", "net amounts", "", "transaction", "transaction date", "closer = sales credit", "1"],
      ["new_contract_volume", "sum(gross_contract) of orders excl. live", "gross_contract", "", "order", "order date", "upgrade counts only the add-on order", "1"],
      ["new_customers", "distinct contacts with first successful mentoring payment", "contacts", "", "contact", "first payment date", "", "1"],
      ["booked_calls", "distinct booking_id (reschedule = same)", "bookings", "", "booking", "first booking date", "", "1"],
      ["show_up_operational", "held / (held + no_show)", "held", "held + no_show", "call version", "scheduled date", "cancelled pre-call excluded", "1"],
      ["show_up_scheduled", "held / (held + no_show + cancelled_pre_call)", "held", "held + no_show + cancelled", "call version", "scheduled date", "", "1"],
      ["close_rate_30d", "new paying customers within 30 days / held first calls", "customers", "first held calls (non-customers)", "contact", "call cohort, 30 d window (60 d additional)", "late conversions back-filled", "1"],
      ["free_to_paid", "mentoring customers within window / unlocked free participants", "customers", "unlocked (excl. legacy accounts)", "free participant", "unlock cohort, 30/60 d", "closer filter not applicable", "1"],
      ["live_mrr_net", "sum(net monthly value) of active paid 99 € subscriptions", "net", "", "subscription", "current", "trialing/past_due and included mentoring access excluded", "1"],
      ["commission", "15 % of actually received net per payment, rounding remainder on last planned instalment, negative entries for refunds/lost chargebacks", "", "", "payment", "payment date", "credit = closer of held call (pending approval)", "1"],
    ],
  );

  const optionen = auswahl
    .filter((q) => ["trading_stand", "ziel", "investition"].includes(q.id))
    .map((q) => `- ${q.id}: ${q.options.map((o, i) => `${q.id}_${i + 1} = ${o}`).join("; ")}`)
    .join("\n");
  const zr = zeitraumText(z);
  const readme = `# Capital Circle — Datenexport für die Analyse

- Exportversion: ${EXPORT_VERSION} · Schema: ${SCHEMA_VERSION}
- Erstellt: ${jetzt.toISOString()} (UTC)
- Zeitraum: ${zr.von ? `${zr.von} bis ${zr.bis} (UTC, bis exklusive)` : "gesamt"}
- Zeitstempel: ISO-8601 in UTC; Darstellung im Unternehmen: Europe/Berlin
- Währung: EUR, Dezimalpunkt; Beträge mit zwei Nachkommastellen
- Pseudonymisierung: HMAC-SHA-256 mit getrennt verwahrtem Schlüssel (nicht in dieser Datei). Pseudonymisierung ist keine Anonymisierung.
- Ausgeschlossen: Namen, E-Mails, Telefonnummern, Freitexte (Notizen, „größte Schwierigkeit", Free-Bewerbungsantworten), Karten- und Bankdaten.

## Zeitsemantik je Datei
Ereignisse, Zahlungen, Anfragen, Sitzungen: Zeitpunkt im Zeitraum. Orders: Kauf im Zeitraum **oder** Zahlung im Zeitraum (Fremdschlüssel). Calls: Termin oder Buchung im Zeitraum. leads.csv: alle in den übrigen Dateien vorkommenden Kontakte plus im Zeitraum angelegte. Raten: alle Raten der exportierten Orders (spätere Fälligkeiten enthalten). Kohortenkennzahlen (Close Rate, Free→Paid) ziehen spätere Käufe nach.

## Antwortkategorien
${optionen}

## Consent-Abdeckung
Server-bestätigte Vorgänge (Bewerbung, Buchung, Call, Order, Zahlung) unabhängig von Analytics-Consent. Sitzungsdaten der Verkaufsseite ohne Consent-Kennzeichnung je Sitzung — Qualität „partial". Rechtsgrundlage je Trackingkategorie ist offen (Prüfpunkt T-05).

## Bekannte Lücken
- video_retention_5s.csv und video_paths_pseudonymous.csv sind leer: VSL-Tiefenmessung ist Phase P1.
- sessions_pages.csv nur für die Verkaufsseite /; /call und /training ohne Seitenmessung. Sitzungen sind nicht mit Kontakten verknüpft.
- Attribution: nur erste bekannte Quelle/Kanal; last_non_direct wird nicht erfasst.
- Bewerbung geöffnet/begonnen (Client) fehlt; nur serverbestätigte Absendungen.
- Kosten nur Stripe-Gebühren; keine weiteren genehmigten Kostenkategorien, kein Deckungsbeitrag.
- Steuer: wo Stripe keine Steuer lieferte, 19 % inklusive als Ersatz (tax_source = fallback_19_inkl). Steuerregime nicht von der Steuerberatung freigegeben (T-07).
- Closer-Credit-Regel (Closer des geführten Calls) wartet auf Freigabe (T-09); Provisionsformel auf Vertragsbestätigung (T-06).
- Keine zentrale contact_id (T-01): Kontakt = E-Mail; Gerätewechsel ohne Identifikation bleiben getrennt.
`;

  const zipDateien: ZipDatei[] = dateien.map((d) => ({ name: d.name, daten: dateiBytes(d) }));
  zipDateien.push({ name: "data_dictionary.csv", daten: enc.encode(dictionary) });
  zipDateien.push({ name: "kpi_definitions.csv", daten: enc.encode(kpis) });
  zipDateien.push({ name: "README.md", daten: enc.encode(readme) });
  const manifest = csv(
    ["file", "row_count", "sha256", "schema_version", "min_time_utc", "max_time_utc", "note"],
    zipDateien.map((zd) => {
      const d = dateien.find((x) => x.name === zd.name);
      const { min, max } = d ? minMax(d) : { min: "", max: "" };
      const rows = d ? d.zeilen.length : zd.name.endsWith(".csv") ? new TextDecoder().decode(zd.daten).split("\r\n").length - 2 : "";
      return [zd.name, rows, sha256(zd.daten), SCHEMA_VERSION, min, max, d?.hinweis ?? ""];
    }),
  );
  zipDateien.push({ name: "manifest.csv", daten: enc.encode(manifest) });

  // Zeilenzahl gegen den geschriebenen Inhalt (CRLF-Zeilen ohne Kopf; Felder mit Zeilenumbruch sind ausgeschlossen).
  for (const d of dateien) {
    const text = new TextDecoder().decode(zipDateien.find((x) => x.name === d.name)!.daten);
    if (!/"[^"]*\n/.test(text) && text.split("\r\n").length - 2 !== d.zeilen.length) throw new ExportFehler(`Zeilenzahl von ${d.name} weicht ab`);
  }
  const tag = jetzt.toISOString().slice(0, 10);
  return { zip: packeUndPruefe(zipDateien), dateiname: `capital-circle-analyse-${tag}.zip` };
}
