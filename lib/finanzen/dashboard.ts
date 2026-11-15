import type { SupabaseClient } from "@supabase/supabase-js";
import { ALLE_FRAGEN } from "@/config/discord-funnel-questions";
import { CALL_GRUENDE, OFFENE_PHASEN, PIPELINE_STATUS_LABEL, VERLUSTGRUENDE, pipelineStatus, type CallOutcome, type Phase, type PipelineStatus } from "@/config/crm";
import { closerFuerTermin, type TeamMitglied } from "@/lib/crm/zuweisung";
import { plusMonate } from "@/lib/mentoring/zugang";
import { quote } from "./geld";
import {
  closeRate,
  freeZuPaid,
  gebuchteCalls,
  leadQualitaet,
  liveAboMrr,
  neueKunden,
  showUp,
  vertragsNetto,
  vertragsvolumen,
  zahlungseingang,
  type CallZeile,
  type FreischaltungZeile,
  type GeldZeile,
  type Kennzahl,
  type LeadZeile,
  type LiveAboZeile,
  type OrderZeile,
  type Qualitaet,
} from "./kpi";
import { berlinTag, imZeitraum, type Zeitraum, type ZeitraumWahl } from "./zeit";

/**
 * Daten des Auswertungs-Dashboards (`/admin/auswertung`, Tracking-Playbook 12).
 * Lädt die Rohdaten mit dem Service-Client, normalisiert sie, wendet die Filter
 * an und rechnet mit den reinen Funktionen aus `kpi.ts`.
 *
 * Filtersemantik (Playbook 3.1, 12.1):
 * - **Closer**: Geld, Orders, Neukunden und Provision nach Verkaufs-Credit
 *   (`mentoring_kauf.credit_*`); Calls nach dem Closer des Calls (wer ihn auf
 *   „geführt" gesetzt hat, sonst Call-Block/Gastgeber, sonst CRM-Closer);
 *   Pipeline und Follow-ups nach aktuellem CRM-Closer. **Nicht anwendbar** auf
 *   anonyme Besucher (Verkaufsseite), die Free-Kohorte vor einer Zuweisung und
 *   das Live-Abo-MRR.
 * - **Funnel**: erste bekannte Quelle des Kontakts — Free (Training,
 *   Free-Bewerbung) oder Main (/call, /termin, Discord). Ohne CRM-Kontakt
 *   „unbekannt", nur in „Alle".
 * - **Leadquelle**: Kanal des Kontakts (UTM bei der Registrierung), fehlend =
 *   `unknown`, nie „direkt".
 * - **Produkt**: Orders, Zahlungen, Neukunden, Provision. Nicht auf Calls.
 *
 * Mengen sind für die aktuelle Unternehmensgröße bemessen (alles in einem Zug
 * laden, im Speicher filtern) — Playbook 1.2: kein Data-Warehouse als Selbstzweck.
 */

type DB = SupabaseClient;
type Roh = Record<string, unknown>;
const norm = (e: unknown) => (typeof e === "string" ? e.trim().toLowerCase() : "");
const MENTORING = new Set(["ausbildung", "main", "premium"]);
const FUNNEL_FREE = new Set(["training", "bewerbung"]);
const FUNNEL_MAIN = new Set(["call_funnel", "termin_direct", "discord_funnel"]);

export type DashboardFilter = {
  wahl: ZeitraumWahl;
  zeitraum: Zeitraum;
  funnel: "alle" | "free" | "main";
  quelle: string; // "alle" | Kanal | "unknown"
  produkt: "alle" | "main" | "premium" | "ausbildung" | "live";
  closer: string; // "all" | "unassigned" | user_id
};

export type Karte = Kennzahl & {
  id: string;
  titel: string;
  format: "geld" | "quote" | "zahl";
  definition: string;
  population: string;
  zeitlogik: string;
  nichtAnwendbar: string[];
  zusatz?: { label: string; wert: number | null; format: "geld" | "quote" | "zahl" }[];
};

async function lade(db: DB, tabelle: string, spalten = "*", limit = 20000): Promise<{ zeilen: Roh[]; fehlt: boolean }> {
  const { data, error } = await db.from(tabelle).select(spalten).limit(limit);
  if (error) {
    const fehlt = /does not exist|schema cache|Could not find/i.test(error.message);
    if (!fehlt) console.error(`[auswertung] ${tabelle}:`, error.message);
    return { zeilen: [], fehlt };
  }
  return { zeilen: (data ?? []) as unknown as Roh[], fehlt: false };
}

export type Rohdaten = Awaited<ReturnType<typeof ladeRohdaten>>;

export async function ladeRohdaten(db: DB) {
  const [buchungen, provisionen, disputes, liveAbos, kaeufe, raten, termine, kontakte, ergebnisse, team, zugang, bewerbungen, tLeads, dLeads, funnelTage] =
    await Promise.all([
      lade(db, "finanz_buchung"),
      lade(db, "provision"),
      lade(db, "finanz_dispute"),
      lade(db, "finanz_live_abo"),
      lade(db, "mentoring_kauf"),
      lade(db, "mentoring_rate"),
      lade(db, "termine", "id, vorgang, lead_art, email, start_am, created_at, status, berater_email, gesetzt_von, gefuehrt_am, vorgaenger_id, abgesagt_am, no_show_am"),
      lade(db, "crm_kontakte", "id, email, name, quelle, quellen, kanal, closer_id, phase, verlust_grund, wiedervorlage_am, verloren_am, created_at, user_id"),
      lade(db, "crm_call_ergebnis"),
      lade(db, "crm_team"),
      lade(db, "training_zugang", "user_id, freigeschaltet_am, gestartet_am, aus_bestand"),
      lade(db, "training_bewerbungen", "id, user_id, email, status, eingereicht_am, adresse_bestaetigt_am, geprueft_am, kanal"),
      lade(db, "training_leads", "id, email, answers, fragen_am, created_at, kanal"),
      lade(db, "discord_leads", "id, email, answers, questions_completed_at, created_at, source_origin, utm_source"),
      lade(db, "funnel_tage", "tag, pfad, sitzungen, sitzungen_mit_klick, kassen, scroll_50, scroll_75, sichtbare_ms_summe"),
    ]);
  return { buchungen, provisionen, disputes, liveAbos, kaeufe, raten, termine, kontakte, ergebnisse, team, zugang, bewerbungen, tLeads, dLeads, funnelTage };
}

export function berechneDashboard(roh: Rohdaten, f: DashboardFilter, jetzt = new Date()) {
  const z = f.zeitraum;
  const team = roh.team.zeilen as unknown as TeamMitglied[];
  const teamName = (id: string | null) => (id ? (team.find((t) => t.user_id === id)?.name ?? "Unbekannt") : "Nicht zugewiesen");

  /* ── Kontakte: Funnel, Kanal, Closer je E-Mail ── */
  type K = { id: string; email: string; name: string | null; quelle: string; kanal: string; closerId: string | null; phase: string; verlustGrund: string | null; wiedervorlage: string | null; verlorenAm: string | null; createdAt: string };
  const kontakte = new Map<string, K>();
  for (const k of roh.kontakte.zeilen) {
    const e = norm(k.email);
    if (!e) continue;
    kontakte.set(e, {
      id: String(k.id),
      email: e,
      name: (k.name as string | null) ?? null,
      quelle: String(k.quelle ?? ""),
      kanal: norm(k.kanal) || "unknown",
      closerId: (k.closer_id as string | null) ?? null,
      phase: String(k.phase ?? "neu"),
      verlustGrund: (k.verlust_grund as string | null) ?? null,
      wiedervorlage: (k.wiedervorlage_am as string | null) ?? null,
      verlorenAm: (k.verloren_am as string | null) ?? null,
      createdAt: String(k.created_at ?? ""),
    });
  }
  const funnelVon = (email: string | null): "free" | "main" | "unbekannt" => {
    const k = email ? kontakte.get(norm(email)) : undefined;
    if (!k) return "unbekannt";
    if (FUNNEL_FREE.has(k.quelle)) return "free";
    if (FUNNEL_MAIN.has(k.quelle)) return "main";
    return "unbekannt";
  };
  const kanalVon = (email: string | null) => (email ? kontakte.get(norm(email))?.kanal : undefined) ?? "unknown";
  const passtKontakt = (email: string | null) =>
    (f.funnel === "alle" || funnelVon(email) === f.funnel) && (f.quelle === "alle" || kanalVon(email) === f.quelle);
  const passtCloser = (closerId: string | null) =>
    f.closer === "all" || (f.closer === "unassigned" ? !closerId : closerId === f.closer);
  const passtProdukt = (p: string | null) => f.produkt === "alle" || p === f.produkt;

  /* ── Orders und Credit ── */
  const kaufJe = new Map<string, Roh>();
  for (const k of roh.kaeufe.zeilen) kaufJe.set(String(k.id), k);
  const creditVon = (kaufId: string | null): string | null => {
    const k = kaufId ? kaufJe.get(kaufId) : undefined;
    if (!k) return null;
    if (k.credit_regel) return (k.credit_closer_id as string | null) ?? null;
    // Ohne eingefrorenen Credit (Nachtrag noch nicht gelaufen): Kassenlink-Closer als Näherung.
    return team.find((t) => t.kuerzel === k.closer)?.user_id ?? null;
  };

  /* ── Geld ── */
  const geldAlle: GeldZeile[] = roh.buchungen.zeilen
    .filter((b) => b.status === "gebucht")
    .map((b) => {
      const kaufId = (b.kauf_id as string | null) ?? null;
      return {
        id: String(b.id),
        art: b.art as GeldZeile["art"],
        email: (b.email as string | null) ?? ((kaufId ? kaufJe.get(kaufId)?.email : null) as string | null) ?? null,
        kaufId,
        produkt: (b.produkt as string | null) ?? null,
        bruttoCents: Number(b.brutto_cents),
        steuerCents: Number(b.steuer_cents),
        nettoCents: Number(b.netto_cents),
        gebuehrCents: b.gebuehr_cents == null ? null : Number(b.gebuehr_cents),
        gebuchtAm: String(b.gebucht_am),
        closerId: creditVon(kaufId),
        steuerQuelle: String(b.steuer_quelle),
      };
    });
  const geld = geldAlle.filter((g) => passtKontakt(g.email) && passtCloser(g.closerId) && passtProdukt(g.produkt));

  const zahlungenJeKauf = new Map<string, { bruttoCents: number; nettoCents: number }[]>();
  for (const g of geldAlle) if (g.art === "zahlung" && g.kaufId) zahlungenJeKauf.set(g.kaufId, [...(zahlungenJeKauf.get(g.kaufId) ?? []), g]);

  const ordersAlle: OrderZeile[] = roh.kaeufe.zeilen.map((k) => {
    const id = String(k.id);
    const brutto = Number(k.soll_cents ?? 0);
    return {
      id,
      email: (k.email as string | null) ?? null,
      produkt: String(k.produkt),
      bruttoCents: brutto,
      nettoCents: vertragsNetto(brutto, zahlungenJeKauf.get(id) ?? []),
      gekauftAm: String(k.gekauft_am),
      upgradeVon: (k.upgrade_von_kauf_id as string | null) ?? null,
      closerId: creditVon(id),
      status: String(k.status),
    };
  });
  const orders = ordersAlle.filter((o) => passtKontakt(o.email) && passtCloser(o.closerId) && passtProdukt(o.produkt));

  /* ── Calls ── */
  const callCloser = (t: Roh): string | null => {
    const setzer = t.gesetzt_von ? team.find((m) => m.user_id === t.gesetzt_von) : undefined;
    if (setzer && (t.status === "gefuehrt" || t.status === "no_show")) return setzer.user_id;
    const c = closerFuerTermin(team, new Date(String(t.start_am)), (t.berater_email as string | null) ?? null);
    return c?.user_id ?? kontakte.get(norm(t.email))?.closerId ?? null;
  };
  const callsAlle: CallZeile[] = roh.termine.zeilen.map((t) => ({
    id: String(t.id),
    vorgang: String(t.vorgang),
    email: norm(t.email),
    startAm: String(t.start_am),
    erstelltAm: String(t.created_at),
    status: String(t.status),
    closerId: callCloser(t),
  }));
  const calls = callsAlle.filter((c) => passtKontakt(c.email) && passtCloser(c.closerId));

  /* ── Free-Kohorte ── */
  const mailJeUser = new Map<string, string>();
  for (const b of roh.bewerbungen.zeilen) if (b.user_id && b.email) mailJeUser.set(String(b.user_id), norm(b.email));
  for (const k of roh.kaeufe.zeilen) if (k.user_id && k.email && !mailJeUser.has(String(k.user_id))) mailJeUser.set(String(k.user_id), norm(k.email));
  for (const k of roh.kontakte.zeilen) if (k.user_id && k.email && !mailJeUser.has(String(k.user_id))) mailJeUser.set(String(k.user_id), norm(k.email));
  const freischaltungen: FreischaltungZeile[] = roh.zugang.zeilen
    .filter((x) => !x.aus_bestand)
    .map((x) => ({ userId: String(x.user_id), email: mailJeUser.get(String(x.user_id)) ?? null, freigeschaltetAm: String(x.freigeschaltet_am) }))
    .filter((x) => f.quelle === "alle" || kanalVon(x.email) === f.quelle);

  /* ── Live-Abos ── */
  const letzteLiveNetto = new Map<string, number>();
  for (const b of [...roh.buchungen.zeilen].sort((a, c) => String(a.gebucht_am).localeCompare(String(c.gebucht_am)))) {
    if (b.art === "zahlung" && b.produkt === "live" && b.stripe_subscription_id) letzteLiveNetto.set(String(b.stripe_subscription_id), Number(b.netto_cents));
  }
  const abos: LiveAboZeile[] = roh.liveAbos.zeilen.map((a) => ({
    id: String(a.stripe_subscription_id),
    status: String(a.status),
    bruttoMonatCents: a.preis_brutto_cents == null ? null : Number(a.preis_brutto_cents),
    nettoMonatCents: letzteLiveNetto.get(String(a.stripe_subscription_id)) ?? null,
  }));

  /* ── Karten (Playbook 12.2) ── */
  const eingang = zahlungseingang(geld, z);
  const volumen = vertragsvolumen(orders, z);
  const su = showUp(calls, z);
  const close30 = closeRate(calls, geldAlle.filter((g) => passtProdukt(g.produkt)), z, 30, jetzt);
  const close60 = closeRate(calls, geldAlle.filter((g) => passtProdukt(g.produkt)), z, 60, jetzt);
  const f2p30 = freeZuPaid(freischaltungen, geldAlle.filter((g) => passtProdukt(g.produkt)), z, 30, jetzt);
  const f2p60 = freeZuPaid(freischaltungen, geldAlle.filter((g) => passtProdukt(g.produkt)), z, 60, jetzt);
  const mrr = liveAboMrr(abos);
  const nk = neueKunden(geld, z);
  const gebucht = gebuchteCalls(calls, z);

  const naCalls = f.produkt !== "alle" ? ["Produkt"] : [];
  const karten: Karte[] = [
    {
      id: "netto",
      titel: "Netto-Zahlungseingänge",
      format: "geld",
      wert: eingang.nettoCents,
      zaehler: eingang.nettoCents,
      nenner: null,
      qualitaet: eingang.qualitaet,
      hinweis: eingang.qualitaet === "partial" ? "Steuer teils per 19-%-Ersatz" : undefined,
      definition: "Erfolgreiche Nettozahlungen minus Netto-Erstattungen und verlorene Chargebacks; Netto = Brutto − tatsächliche USt laut Stripe.",
      population: "Transaktion",
      zeitlogik: "Transaktionszeitraum (Zahlungs-/Erstattungsdatum)",
      nichtAnwendbar: [],
      zusatz: [
        { label: "Brutto", wert: eingang.bruttoCents, format: "geld" },
        { label: "Erstattungen (netto)", wert: eingang.erstattungen.nettoCents, format: "geld" },
      ],
    },
    {
      id: "vertrag",
      titel: "Neues Vertragsvolumen",
      format: "geld",
      wert: volumen.bruttoCents,
      zaehler: volumen.anzahl,
      nenner: null,
      qualitaet: volumen.qualitaet,
      definition: "Summe neuer Orders (ohne Live-Abo); Upgrade nur mit Zusatzauftrag (z. B. 2.501 €). Brutto, Netto daneben.",
      population: "Order",
      zeitlogik: "Orderzeitraum (Kaufdatum)",
      nichtAnwendbar: [],
      zusatz: [
        { label: "Netto", wert: volumen.nettoCents, format: "geld" },
        { label: "Orders", wert: volumen.anzahl, format: "zahl" },
      ],
    },
    {
      id: "kunden",
      titel: "Neue Kunden",
      format: "zahl",
      ...nk,
      definition: "Eindeutige Kunden (E-Mail) mit erster erfolgreicher Mentoring-Zahlung im Zeitraum.",
      population: "Kontakt",
      zeitlogik: "Datum der ersten Zahlung",
      nichtAnwendbar: [],
    },
    {
      id: "calls",
      titel: "Gebuchte Calls",
      format: "zahl",
      ...gebucht,
      definition: "Eindeutige Gesprächsvorgänge mit bestätigter Buchung; eine Umbuchung zählt nicht neu.",
      population: "Buchungsvorgang",
      zeitlogik: "Datum der ersten Buchung",
      nichtAnwendbar: naCalls,
    },
    {
      id: "showup",
      titel: "Show-up Rate",
      format: "quote",
      ...su.operational,
      definition: "Operational: held / (held + no_show). Vorab abgesagte Termine separat.",
      population: "Terminversion",
      zeitlogik: "Terminbeginn im Zeitraum",
      nichtAnwendbar: naCalls,
      zusatz: [
        { label: "Scheduled (inkl. Absagen)", wert: su.scheduled.wert, format: "quote" },
        { label: "Vorab abgesagt", wert: su.abgesagt, format: "zahl" },
      ],
    },
    {
      id: "close",
      titel: "Close Rate",
      format: "quote",
      ...close30,
      definition: "Zahlende Neukunden / geführte Erstgespräche der Call-Kohorte; Zahlung binnen 30 Tagen nach dem Call (60 Tage als Zusatzsicht).",
      population: "Erstgespräch (Kontakt)",
      zeitlogik: "Kohorte nach Call-Datum, Fenster 30/60 Tage",
      nichtAnwendbar: [],
      zusatz: [{ label: "60 Tage", wert: close60.wert, format: "quote" }],
    },
    {
      id: "free",
      titel: "Free → Paid",
      format: "quote",
      ...f2p30,
      definition: "Zahlende Mentoringkunden aus der Free-Freischaltungskohorte / freigeschaltete Free-Teilnehmer (ohne Bestandskonten); Fenster 30 Tage, 60 als Zusatz.",
      population: "Free-Teilnehmer",
      zeitlogik: "Kohorte nach Freischaltung, Fenster 30/60 Tage",
      nichtAnwendbar: [...(f.closer !== "all" ? ["Closer"] : []), ...(f.funnel !== "alle" ? ["Funnel"] : [])],
      zusatz: [{ label: "60 Tage", wert: f2p60.wert, format: "quote" }],
    },
    {
      id: "mrr",
      titel: "Live-Abo-MRR",
      format: "geld",
      ...mrr,
      definition: "Netto-Monatswert aktiv bezahlter 99-€-Live-Abos; Probezeit, past_due und in Programmen enthaltene Live-Zugänge zählen nicht.",
      population: "Abo",
      zeitlogik: "Stand jetzt",
      nichtAnwendbar: ["Zeitraum", ...(f.closer !== "all" ? ["Closer"] : []), ...(f.funnel !== "alle" ? ["Funnel"] : []), ...(f.quelle !== "alle" ? ["Leadquelle"] : [])],
      zusatz: [{ label: "Aktive Abos", wert: mrr.aktiv, format: "zahl" }],
    },
  ];

  /* ── Ergebnisse (letzte Version je Termin) ── */
  const ergebnisJe = new Map<string, Roh>();
  for (const e of [...roh.ergebnisse.zeilen].sort((a, b) => Number(a.version) - Number(b.version))) ergebnisJe.set(String(e.termin_id), e);
  const letztesOutcomeJeKontakt = new Map<string, CallOutcome>();
  for (const t of [...roh.termine.zeilen].sort((a, b) => String(a.start_am).localeCompare(String(b.start_am)))) {
    const e = ergebnisJe.get(String(t.id));
    if (e) letztesOutcomeJeKontakt.set(norm(t.email), e.outcome as CallOutcome);
  }

  /* ── Vertrieb ── */
  const kontaktListe = [...kontakte.values()].filter((k) => passtKontakt(k.email) && passtCloser(k.closerId));
  const pipeline = new Map<PipelineStatus, number>();
  for (const k of kontaktListe) {
    const s = pipelineStatus({ phase: k.phase as Phase, verlustGrund: k.verlustGrund, letztesOutcome: letztesOutcomeJeKontakt.get(k.email) ?? null });
    pipeline.set(s, (pipeline.get(s) ?? 0) + 1);
  }

  const provisionen = roh.provisionen.zeilen.map((p) => ({
    id: String(p.id),
    kaufId: (p.kauf_id as string | null) ?? null,
    closerId: (p.closer_id as string | null) ?? null,
    art: String(p.art),
    betragCents: Number(p.betrag_cents),
    basisNettoCents: Number(p.basis_netto_cents),
    status: String(p.status),
    periode: String(p.periode),
    entstandenAm: String(p.entstanden_am),
    ausgezahltAm: (p.ausgezahlt_am as string | null) ?? null,
    auszahlungRef: (p.auszahlung_ref as string | null) ?? null,
    produkt: ((p.kauf_id ? kaufJe.get(String(p.kauf_id))?.produkt : null) as string | null) ?? null,
    email: ((p.kauf_id ? kaufJe.get(String(p.kauf_id))?.email : null) as string | null) ?? null,
  }));
  const provImFilter = provisionen.filter((p) => passtCloser(p.closerId) && passtProdukt(p.produkt) && passtKontakt(p.email));

  const closerIds: (string | null)[] = [...team.map((t) => t.user_id), null];
  const closerZeilen = closerIds
    .filter((id) => f.closer === "all" || (f.closer === "unassigned" ? id === null : id === f.closer))
    .map((id) => {
      const cs = callsAlle.filter((c) => c.closerId === id && passtKontakt(c.email));
      const s = showUp(cs, z);
      const cr = closeRate(cs, geldAlle, z, 30, jetzt);
      const os = ordersAlle.filter((o) => o.closerId === id && o.produkt !== "live" && passtKontakt(o.email) && passtProdukt(o.produkt) && imZeitraum(o.gekauftAm, z));
      const gs = geldAlle.filter((g) => g.closerId === id && passtKontakt(g.email) && passtProdukt(g.produkt));
      const ps = provisionen.filter((p) => p.closerId === id && passtProdukt(p.produkt) && imZeitraum(p.entstandenAm, z));
      return {
        closerId: id,
        name: teamName(id),
        gebucht: gebuchteCalls(cs, z).zaehler,
        held: s.held,
        noShow: s.noShow,
        showUp: s.operational.wert,
        closeRate: cr.wert,
        closeZaehler: cr.zaehler,
        closeNenner: cr.nenner,
        orders: os.length,
        verkaufBruttoCents: os.reduce((x, o) => x + o.bruttoCents, 0),
        zahlungNettoCents: zahlungseingang(gs, z).nettoCents,
        provisionCents: ps.reduce((x, p) => x + p.betragCents, 0),
        provisionOffenCents: ps.filter((p) => p.status === "accrued" || p.status === "approved").reduce((x, p) => x + p.betragCents, 0),
        provisionAusgezahltCents: ps.filter((p) => p.status === "paid").reduce((x, p) => x + p.betragCents, 0),
      };
    })
    .filter((r) => r.closerId !== null || r.gebucht + r.orders + r.held > 0 || f.closer === "unassigned");

  // Verlustgründe aus der Ergebnis-Maske (Playbook-Werte) und aus dem CRM.
  const gruende = new Map<string, number>();
  for (const [terminId, e] of ergebnisJe) {
    if (e.outcome !== "lost" && e.outcome !== "unqualified") continue;
    const t = roh.termine.zeilen.find((x) => String(x.id) === terminId);
    if (!t || !imZeitraum(String(e.am), z) || !passtKontakt(norm(t.email))) continue;
    const c = callsAlle.find((x) => x.id === terminId);
    if (!passtCloser(c?.closerId ?? null)) continue;
    const g = String(e.outcome === "unqualified" && !e.grund ? "fit" : (e.grund ?? "other"));
    gruende.set(g, (gruende.get(g) ?? 0) + 1);
  }
  const crmGruende = new Map<string, number>();
  for (const k of kontaktListe) if (k.phase === "verloren" && imZeitraum(k.verlorenAm, z)) crmGruende.set(k.verlustGrund ?? "sonstiges", (crmGruende.get(k.verlustGrund ?? "sonstiges") ?? 0) + 1);

  // Leadqualität je Antwortkategorie (Lead-Kohorte: Antworten im Zeitraum).
  const auswahl = ALLE_FRAGEN.filter((q) => q.typ !== "freitext" && q.options.length);
  const leads: LeadZeile[] = [];
  for (const l of [...roh.dLeads.zeilen, ...roh.tLeads.zeilen]) {
    const am = String(l.questions_completed_at ?? l.fragen_am ?? l.created_at ?? "");
    const email = norm(l.email);
    if (!email || !imZeitraum(am, z) || !passtKontakt(email)) continue;
    if (f.closer !== "all" && !passtCloser(kontakte.get(email)?.closerId ?? null)) continue;
    const a = (l.answers ?? {}) as Record<string, unknown>;
    const kategorien: Record<string, string> = {};
    for (const q of auswahl) {
      const v = a[q.id];
      if (typeof v === "string" && q.options.includes(v)) kategorien[q.question] = v;
    }
    if (Object.keys(kategorien).length) leads.push({ email, kategorien });
  }
  const lq = leadQualitaet(leads, callsAlle, geldAlle).sort((a, b) => a.frage.localeCompare(b.frage) || b.leads - a.leads);

  const ueberfaellig = kontaktListe
    .filter((k) => OFFENE_PHASEN.includes(k.phase as Phase) && k.wiedervorlage && new Date(k.wiedervorlage).getTime() < jetzt.getTime())
    .sort((a, b) => String(a.wiedervorlage).localeCompare(String(b.wiedervorlage)))
    .map((k) => ({ kontaktId: k.id, name: k.name ?? k.email, closer: teamName(k.closerId), phase: k.phase, faelligAm: k.wiedervorlage }));

  /* ── Finanzen ── */
  const disputes = roh.disputes.zeilen.filter((d) => {
    const kaufId = (d.kauf_id as string | null) ?? null;
    const email = (kaufId ? kaufJe.get(kaufId)?.email : null) as string | null;
    return imZeitraum(String(d.eroeffnet_am), z) && passtCloser(creditVon(kaufId)) && passtKontakt(email) && passtProdukt((kaufId ? kaufJe.get(kaufId)?.produkt : null) as string | null);
  });
  const dSum = (s: string) => disputes.filter((d) => d.status === s).reduce((x, d) => x + Number(d.betrag_cents), 0);

  // Offene Raten: Ratenkäufe, die noch laufen — Soll minus bezahlte Raten; überfällig = Fälligkeit verstrichen, Rate fehlt.
  const ratenJeKauf = new Map<string, Roh[]>();
  for (const r of roh.raten.zeilen) ratenJeKauf.set(String(r.kauf_id), [...(ratenJeKauf.get(String(r.kauf_id)) ?? []), r]);
  let offenCents = 0;
  let ueberfaelligCents = 0;
  let offeneRaten = 0;
  let ueberfaelligeRaten = 0;
  for (const k of roh.kaeufe.zeilen) {
    if (k.zahlweise !== "raten" || k.status !== "aktiv") continue;
    const id = String(k.id);
    if (!passtCloser(creditVon(id)) || !passtKontakt((k.email as string | null) ?? null) || !passtProdukt(String(k.produkt))) continue;
    const gesamt = Number(k.raten_gesamt ?? 0);
    const rs = ratenJeKauf.get(id) ?? [];
    const bezahlt = rs.reduce((s, r) => s + Number(r.betrag_cents), 0);
    const soll = Number(k.soll_cents ?? 0);
    const regel = Number(k.raten_betrag_cents ?? 0);
    offenCents += Math.max(0, soll - bezahlt);
    offeneRaten += Math.max(0, gesamt - rs.length);
    let faellig = 0;
    for (let n = 1; n <= gesamt; n++) if (plusMonate(new Date(String(k.gekauft_am)), n - 1).getTime() + 3 * 86_400_000 < jetzt.getTime()) faellig = n;
    const fehlt = Math.max(0, faellig - rs.length);
    ueberfaelligeRaten += fehlt;
    ueberfaelligCents += fehlt * regel;
  }

  const provSumme = (st: string[]) => provImFilter.filter((p) => st.includes(p.status) && imZeitraum(p.entstandenAm, z)).reduce((s, p) => s + p.betragCents, 0);
  const provJeCloser = closerIds
    .filter((id) => id !== null)
    .map((id) => {
      const ps = provisionen.filter((p) => p.closerId === id);
      return {
        closerId: id,
        name: teamName(id),
        offenCents: ps.filter((p) => p.status === "accrued").reduce((s, p) => s + p.betragCents, 0),
        freigegebenCents: ps.filter((p) => p.status === "approved").reduce((s, p) => s + p.betragCents, 0),
        ausgezahltCents: ps.filter((p) => p.status === "paid").reduce((s, p) => s + p.betragCents, 0),
      };
    });

  const liveImZeitraum = roh.liveAbos.zeilen;
  const beendet = liveImZeitraum.filter((a) => a.beendet_am && imZeitraum(String(a.beendet_am), z)).length;
  const aktivZuBeginn = z
    ? liveImZeitraum.filter((a) => a.begonnen_am && new Date(String(a.begonnen_am)) < z.von && (!a.beendet_am || new Date(String(a.beendet_am)) >= z.von) && a.status !== "trialing").length
    : null;

  /* ── Datenqualität (Playbook 13) ── */
  const heldOhneErgebnis = roh.ergebnisse.fehlt
    ? null
    : callsAlle.filter((c) => c.status === "gefuehrt" && !ergebnisJe.has(c.id) && imZeitraum(c.startAm, z) && passtCloser(c.closerId)).length;
  const kaufOhneZahlung = roh.buchungen.fehlt
    ? null
    : roh.kaeufe.zeilen.filter((k) => k.produkt !== "live" && !zahlungenJeKauf.has(String(k.id)) && k.status !== "erstattet").length;
  const warnungen = [
    { id: "migration", anzahl: roh.buchungen.fehlt ? 1 : 0, text: "Migration 114 ist noch nicht eingespielt — Ledger, Provision und Ergebnis-Maske fehlen." },
    { id: "quarantaene", anzahl: roh.buchungen.zeilen.filter((b) => b.status === "quarantaene").length, text: "Zahlungen in Quarantäne (ohne zuordenbaren Kauf) — zählen nirgends mit." },
    { id: "held_ohne_ergebnis", anzahl: heldOhneErgebnis ?? 0, text: "Geführte Calls ohne Ergebnis-Maske (Closer-Aufgabe offen)." },
    { id: "ohne_closer", anzahl: ordersAlle.filter((o) => MENTORING.has(o.produkt) && imZeitraum(o.gekauftAm, z) && !o.closerId).length, text: "Verkäufe ohne Closer (unassigned) im Zeitraum." },
    { id: "kauf_ohne_zahlung", anzahl: kaufOhneZahlung ?? 0, text: "Käufe ohne Zahlung im Ledger — Nachtrag unter Finanzen ausführen." },
    { id: "steuer_fallback", anzahl: roh.buchungen.zeilen.filter((b) => b.steuer_quelle === "fallback_19_inkl").length, text: "Buchungen mit 19-%-Ersatzsteuer statt Stripe-Steuer." },
    { id: "ohne_gebuehr", anzahl: eingang.ohneGebuehr, text: "Zahlungen ohne Stripe-Gebühr (Balance-Transaktion nicht lesbar)." },
    { id: "ohne_credit", anzahl: roh.kaeufe.zeilen.filter((k) => MENTORING.has(String(k.produkt)) && !k.credit_regel).length, text: "Käufe ohne eingefrorenen Verkaufs-Credit — Nachtrag ausführen." },
  ].filter((w) => w.anzahl > 0);

  /* ── Funnel (teilweise, P1 fehlt) ── */
  const tage = roh.funnelTage.zeilen.filter((t) => t.pfad === "/" && imZeitraum(`${String(t.tag)}T12:00:00Z`, z));
  const seite = tage.reduce<{ sitzungen: number; mitKlick: number; kassen: number; scroll50: number; scroll75: number; ms: number }>(
    (s, t) => ({
      sitzungen: s.sitzungen + Number(t.sitzungen),
      mitKlick: s.mitKlick + Number(t.sitzungen_mit_klick),
      kassen: s.kassen + Number(t.kassen),
      scroll50: s.scroll50 + Number(t.scroll_50),
      scroll75: s.scroll75 + Number(t.scroll_75),
      ms: s.ms + Number(t.sichtbare_ms_summe),
    }),
    { sitzungen: 0, mitKlick: 0, kassen: 0, scroll50: 0, scroll75: 0, ms: 0 },
  );
  const bew = roh.bewerbungen.zeilen.filter((b) => imZeitraum(String(b.eingereicht_am), z) && (f.quelle === "alle" || (norm(b.kanal) || "unknown") === f.quelle));
  const frei = roh.zugang.zeilen.filter((x) => !x.aus_bestand && imZeitraum(String(x.freigeschaltet_am), z));
  const freiMails = new Set(frei.map((x) => mailJeUser.get(String(x.user_id))).filter(Boolean) as string[]);
  const anfragenTraining = roh.tLeads.zeilen.filter((l) => imZeitraum(String(l.fragen_am ?? ""), z) && (f.quelle === "alle" || kanalVon(norm(l.email)) === f.quelle)).length;
  const anfragenMain = roh.dLeads.zeilen.filter((l) => imZeitraum(String(l.questions_completed_at ?? ""), z) && (f.quelle === "alle" || kanalVon(norm(l.email)) === f.quelle)).length;
  const callsArt = (art: string) => {
    const ids = new Set(roh.termine.zeilen.filter((t) => t.lead_art === art).map((t) => String(t.id)));
    const cs = callsAlle.filter((c) => ids.has(c.id) && (f.quelle === "alle" || kanalVon(c.email) === f.quelle));
    return { gebucht: gebuchteCalls(cs, z).zaehler, held: showUp(cs, z).held };
  };
  const kundenNachFunnel = (fu: "free" | "main") => {
    let n = 0;
    const erste = new Map<string, string>();
    for (const g of geldAlle) if (g.art === "zahlung" && g.produkt && MENTORING.has(g.produkt) && g.email) {
      const e = norm(g.email);
      if (!erste.has(e) || g.gebuchtAm < erste.get(e)!) erste.set(e, g.gebuchtAm);
    }
    for (const [e, am] of erste) if (imZeitraum(am, z) && funnelVon(e) === fu && (f.quelle === "alle" || kanalVon(e) === f.quelle)) n++;
    return n;
  };

  // Umsatz nach erster bekannter Quelle (Kanal) — last_non_direct wird nicht erfasst.
  const umsatzNachQuelle = new Map<string, number>();
  for (const g of geld) if (imZeitraum(g.gebuchtAm, z)) umsatzNachQuelle.set(kanalVon(g.email), (umsatzNachQuelle.get(kanalVon(g.email)) ?? 0) + g.nettoCents);

  const letzteBuchung = roh.buchungen.zeilen.reduce<string | null>((m, b) => (!m || String(b.eingegangen_am) > m ? String(b.eingegangen_am) : m), null);

  return {
    stand: { erzeugtAm: jetzt.toISOString(), letzteBuchungAm: letzteBuchung, migration114: !roh.buchungen.fehlt, heute: berlinTag(jetzt) },
    filter: { ...f, zeitraum: z ? { von: z.von.toISOString(), bis: z.bis.toISOString() } : null },
    team: team.map((t) => ({ id: t.user_id, name: t.name, kuerzel: t.kuerzel, aktiv: t.aktiv })),
    kanaele: [...new Set([...kontakte.values()].map((k) => k.kanal))].sort(),
    karten,
    uebersicht: {
      trichter: [
        { stufe: "Gesprächsanfragen (Fragebogen fertig)", wert: anfragenTraining + anfragenMain },
        { stufe: "Gebuchte Calls", wert: gebucht.zaehler },
        { stufe: "Geführte Calls", wert: su.held },
        { stufe: "Neue Kunden", wert: nk.zaehler },
      ],
      umsatzNachQuelle: [...umsatzNachQuelle.entries()].map(([quelle, nettoCents]) => ({ quelle, nettoCents })).sort((a, b) => b.nettoCents - a.nettoCents),
      warnungen,
    },
    funnel: {
      qualitaet: "partial" as Qualitaet,
      verkaufsseite: tage.length
        ? { ...seite, ctaRate: quote(seite.mitKlick, seite.sitzungen), kassenRate: quote(seite.kassen, seite.sitzungen), sichtbarSek: seite.sitzungen ? Math.round(seite.ms / seite.sitzungen / 1000) : null }
        : null,
      free: {
        bewerbungen: bew.length,
        bestaetigt: bew.filter((b) => b.adresse_bestaetigt_am).length,
        angenommen: bew.filter((b) => b.status === "angenommen").length,
        abgelehnt: bew.filter((b) => b.status === "abgelehnt").length,
        offen: bew.filter((b) => b.status === "offen").length,
        freigeschaltet: frei.length,
        gestartet: frei.filter((x) => x.gestartet_am).length,
        anfragen: anfragenTraining,
        ...callsArt("training"),
        kunden: kundenNachFunnel("free"),
        freiMitKauf: [...freiMails].filter((e) => geldAlle.some((g) => g.art === "zahlung" && norm(g.email) === e && g.produkt && MENTORING.has(g.produkt))).length,
      },
      main: { anfragen: anfragenMain, ...callsArt("discord"), kunden: kundenNachFunnel("main") },
      luecken: [
        "VSL-Messung (Start, Abdeckung, 5-Sekunden-Retention, Versionen) ist P1 und noch nicht gebaut.",
        "Besucher, Seitenzeit und Scrolltiefe nur für die Verkaufsseite / (Kaufweg-Messung, Migration 101); /call und /training ohne Seitenmessung.",
        "Bewerbung geöffnet/begonnen (Client-Events) wird nicht erfasst — nur serverbestätigte Bewerbungen.",
        "Attribution: nur Kanal bei Registrierung bzw. utm_source am Lead (≈ first known); last_non_direct und attribution_confidence fehlen.",
        "Closer-Filter ist auf diese Funnelzahlen nicht anwendbar (vor Zuweisung, anonyme Besucher).",
      ],
    },
    vertrieb: {
      pipeline: (Object.keys(PIPELINE_STATUS_LABEL) as PipelineStatus[]).map((s) => ({ status: s, label: PIPELINE_STATUS_LABEL[s], anzahl: pipeline.get(s) ?? 0 })),
      closer: closerZeilen,
      verlustgruende: [...gruende.entries()].map(([g, n]) => ({ grund: g, label: CALL_GRUENDE.find((x) => x.id === g)?.label ?? g, anzahl: n })).sort((a, b) => b.anzahl - a.anzahl),
      crmVerlustgruende: [...crmGruende.entries()].map(([g, n]) => ({ grund: g, label: VERLUSTGRUENDE.find((x) => x.id === g)?.label ?? g, anzahl: n })).sort((a, b) => b.anzahl - a.anzahl),
      leadQualitaet: lq,
      ueberfaellig,
      showUp: su,
      close60,
    },
    finanzen: {
      vertrag: volumen,
      eingang,
      chargebacks: {
        offen: disputes.filter((d) => d.status === "opened").length,
        offenCents: dSum("opened"),
        gewonnen: disputes.filter((d) => d.status === "won").length,
        verloren: disputes.filter((d) => d.status === "lost").length,
        verlorenCents: dSum("lost"),
        gebuehrenCents: disputes.reduce((s, d) => s + Number(d.gebuehr_cents ?? 0), 0),
      },
      offeneRaten: { anzahl: offeneRaten, offenCents, ueberfaellig: ueberfaelligeRaten, ueberfaelligCents },
      provision: {
        offenCents: provSumme(["accrued"]),
        freigegebenCents: provSumme(["approved"]),
        ausgezahltCents: provSumme(["paid"]),
        jeCloser: provJeCloser,
        eintraege: provImFilter
          .filter((p) => imZeitraum(p.entstandenAm, z) || p.status !== "paid")
          .sort((a, b) => b.entstandenAm.localeCompare(a.entstandenAm))
          .slice(0, 300)
          .map((p) => ({ ...p, closer: teamName(p.closerId), email: undefined })),
      },
      liveAbo: {
        aktiv: mrr.aktiv,
        mrrCents: mrr.wert,
        mrrQualitaet: mrr.qualitaet,
        probe: abos.filter((a) => a.status === "trialing").length,
        gekuendigt: liveImZeitraum.filter((a) => a.cancel_at_period_end && a.status === "active").length,
        beendetImZeitraum: beendet,
        logoChurn: aktivZuBeginn == null ? null : quote(beendet, aktivZuBeginn),
      },
      quarantaene: roh.buchungen.zeilen.filter((b) => b.status === "quarantaene").length,
    },
  };
}

export type Dashboard = ReturnType<typeof berechneDashboard>;
