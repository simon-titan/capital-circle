import { steuerFallback19Inkl, quote } from "./geld";
import { imZeitraum, plusTage, type Zeitraum } from "./zeit";

/**
 * KPI-Rechnung des Dashboards (Tracking-Playbook 9.3, 11, 12.2) — reine
 * Funktionen über normalisierte Zeilen (Tests: `kpi.test.ts`, mit den
 * Rechentests aus QA-Kapitel 4). Laden und Filtern passiert in
 * `lib/finanzen/dashboard.ts`; hier steht nur die Definition.
 *
 * Grundregeln: keine Population → `null` („No Data"), nie 0 %. Quoten bleiben
 * intern ungerundet. Geld in ganzen Cent. Identität eines Kunden = E-Mail in
 * Kleinbuchstaben (zentrale contact_id fehlt, Prüfpunkt T-01; das CRM führt
 * einen Kontakt je E-Mail).
 */

export type Qualitaet = "complete" | "partial" | "unknown";

export type Kennzahl = {
  wert: number | null;
  zaehler: number;
  nenner: number | null;
  qualitaet: Qualitaet;
  hinweis?: string;
};

export type TerminStatus = "gebucht" | "umgebucht" | "abgesagt_kunde" | "abgesagt_team" | "gefuehrt" | "no_show";

export type CallZeile = {
  id: string;
  vorgang: string;
  email: string;
  startAm: string;
  erstelltAm: string;
  status: TerminStatus | string;
  closerId: string | null;
};

export type GeldZeile = {
  id: string;
  art: "zahlung" | "erstattung" | "chargeback";
  email: string | null;
  kaufId: string | null;
  produkt: string | null;
  bruttoCents: number;
  steuerCents: number;
  nettoCents: number;
  gebuehrCents: number | null;
  gebuchtAm: string;
  closerId: string | null;
  steuerQuelle: string;
};

export type OrderZeile = {
  id: string;
  email: string | null;
  produkt: string;
  /** Vertragsvolumen brutto (`soll_cents`, beim Upgrade schon ohne Anrechnung). */
  bruttoCents: number;
  /** Netto aus der tatsächlichen Steuer der Zahlungen, sonst null. */
  nettoCents: number | null;
  gekauftAm: string;
  upgradeVon: string | null;
  closerId: string | null;
  status: string;
};

export type FreischaltungZeile = { userId: string; email: string | null; freigeschaltetAm: string };

export type LiveAboZeile = {
  id: string;
  status: string;
  bruttoMonatCents: number | null;
  /** Netto-Normalwert aus der letzten bezahlten Rechnung, sonst null. */
  nettoMonatCents: number | null;
};

const MENTORING = new Set(["ausbildung", "main", "premium"]);
const norm = (e: string | null | undefined) => (e ? e.trim().toLowerCase() : "");

/* ─── Calls ─────────────────────────────────────────────────────────────── */

/** Gebuchte Calls: eindeutige Gesprächsvorgänge, deren erste Buchung im Zeitraum liegt. Umbuchung = derselbe Vorgang. */
export function gebuchteCalls(calls: CallZeile[], z: Zeitraum): Kennzahl {
  const erste = new Map<string, string>();
  for (const c of calls) {
    const alt = erste.get(c.vorgang);
    if (!alt || c.erstelltAm < alt) erste.set(c.vorgang, c.erstelltAm);
  }
  let n = 0;
  for (const am of erste.values()) if (imZeitraum(am, z)) n++;
  return { wert: n, zaehler: n, nenner: null, qualitaet: "complete" };
}

export type ShowUp = {
  held: number;
  noShow: number;
  abgesagt: number;
  operational: Kennzahl;
  scheduled: Kennzahl;
};

/**
 * Show-up je Terminversion mit Beginn im Zeitraum. Operational = held / (held
 * + no_show), vorab abgesagte Termine separat; scheduled = held / (held +
 * no_show + vorab abgesagt). Umgebuchte Versionen und noch offene Termine
 * zählen in keinem Nenner.
 */
export function showUp(calls: CallZeile[], z: Zeitraum): ShowUp {
  let held = 0;
  let noShow = 0;
  let abgesagt = 0;
  for (const c of calls) {
    if (!imZeitraum(c.startAm, z)) continue;
    if (c.status === "gefuehrt") held++;
    else if (c.status === "no_show") noShow++;
    else if (c.status === "abgesagt_kunde" || c.status === "abgesagt_team") abgesagt++;
  }
  const op = held + noShow;
  const sch = held + noShow + abgesagt;
  return {
    held,
    noShow,
    abgesagt,
    operational: { wert: quote(held, op), zaehler: held, nenner: op, qualitaet: "complete" },
    scheduled: { wert: quote(held, sch), zaehler: held, nenner: sch, qualitaet: "complete" },
  };
}

/** Erste erfolgreiche Mentoring-Zahlung je Kunde (E-Mail) — „Neukunde ab erster Zahlung". */
export function ersteZahlungJeKunde(geld: GeldZeile[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const g of geld) {
    if (g.art !== "zahlung" || !g.produkt || !MENTORING.has(g.produkt)) continue;
    const e = norm(g.email);
    if (!e) continue;
    const alt = m.get(e);
    if (!alt || g.gebuchtAm < alt) m.set(e, g.gebuchtAm);
  }
  return m;
}

/**
 * Close Rate der Call-Kohorte: Erstgespräche (erster geführter Call je Kontakt)
 * mit Beginn im Zeitraum; Zähler = davon Neukunden mit erster erfolgreicher
 * Zahlung bis `fensterTage` nach dem Call. Wer schon vorher gezahlt hatte, ist
 * kein Neukunde und gehört nicht in die Kohorte (Upgrade-Gespräche).
 * `partial`, solange das Fenster eines Kohortenmitglieds noch läuft —
 * verspätete Käufe werden nachgezogen (QA-Karte 23).
 */
export function closeRate(calls: CallZeile[], geld: GeldZeile[], z: Zeitraum, fensterTage: number, jetzt: Date): Kennzahl {
  const erstgespraech = new Map<string, string>();
  for (const c of calls) {
    if (c.status !== "gefuehrt") continue;
    const e = norm(c.email);
    const alt = erstgespraech.get(e);
    if (!alt || c.startAm < alt) erstgespraech.set(e, c.startAm);
  }
  const ersteZahlung = ersteZahlungJeKunde(geld);
  let kohorte = 0;
  let kunden = 0;
  let offen = false;
  for (const [email, start] of erstgespraech) {
    if (!imZeitraum(start, z)) continue;
    const zahlung = ersteZahlung.get(email);
    if (zahlung && zahlung < start) continue;
    kohorte++;
    const ende = plusTage(start, fensterTage);
    if (ende.getTime() > jetzt.getTime()) offen = true;
    if (zahlung && new Date(zahlung).getTime() <= ende.getTime()) kunden++;
  }
  return {
    wert: quote(kunden, kohorte),
    zaehler: kunden,
    nenner: kohorte,
    qualitaet: offen ? "partial" : "complete",
    ...(offen ? { hinweis: "Fenster läuft noch für Teile der Kohorte" } : {}),
  };
}

/**
 * Free → Paid: zahlende Mentoringkunden aus der Free-Freischaltungskohorte
 * (Freischaltung im Zeitraum) mit erster Zahlung bis `fensterTage` danach.
 */
export function freeZuPaid(frei: FreischaltungZeile[], geld: GeldZeile[], z: Zeitraum, fensterTage: number, jetzt: Date): Kennzahl {
  const ersteZahlung = ersteZahlungJeKunde(geld);
  let kohorte = 0;
  let kunden = 0;
  let offen = false;
  const gesehen = new Set<string>();
  for (const f of frei) {
    if (!imZeitraum(f.freigeschaltetAm, z)) continue;
    const e = norm(f.email) || f.userId;
    if (gesehen.has(e)) continue;
    gesehen.add(e);
    const zahlung = ersteZahlung.get(e);
    if (zahlung && zahlung < f.freigeschaltetAm) continue;
    kohorte++;
    const ende = plusTage(f.freigeschaltetAm, fensterTage);
    if (ende.getTime() > jetzt.getTime()) offen = true;
    if (zahlung && new Date(zahlung).getTime() <= ende.getTime()) kunden++;
  }
  return { wert: quote(kunden, kohorte), zaehler: kunden, nenner: kohorte, qualitaet: offen ? "partial" : "complete" };
}

/* ─── Geld ──────────────────────────────────────────────────────────────── */

export type Geldsumme = { bruttoCents: number; steuerCents: number; nettoCents: number; anzahl: number; fallback: number };

function summe(zeilen: GeldZeile[]): Geldsumme {
  const s: Geldsumme = { bruttoCents: 0, steuerCents: 0, nettoCents: 0, anzahl: 0, fallback: 0 };
  for (const g of zeilen) {
    s.bruttoCents += g.bruttoCents;
    s.steuerCents += g.steuerCents;
    s.nettoCents += g.nettoCents;
    s.anzahl++;
    if (g.steuerQuelle !== "stripe" && g.steuerQuelle !== "stripe_anteilig") s.fallback++;
  }
  return s;
}

/**
 * Zahlungseingang im Transaktionszeitraum: Zahlungen, Erstattungen,
 * verlorene Chargebacks und die Netto-Summe daraus. Payouts sind kein Umsatz
 * und stehen gar nicht im Ledger.
 */
export function zahlungseingang(geld: GeldZeile[], z: Zeitraum) {
  const im = geld.filter((g) => imZeitraum(g.gebuchtAm, z));
  const zahlungen = summe(im.filter((g) => g.art === "zahlung"));
  const erstattungen = summe(im.filter((g) => g.art === "erstattung"));
  const chargebacks = summe(im.filter((g) => g.art === "chargeback"));
  const netto = zahlungen.nettoCents + erstattungen.nettoCents + chargebacks.nettoCents;
  const gebuehren = im.reduce((s, g) => s + (g.gebuehrCents ?? 0), 0);
  const ohneGebuehr = im.filter((g) => g.art === "zahlung" && g.gebuehrCents == null).length;
  const fallback = zahlungen.fallback + erstattungen.fallback + chargebacks.fallback;
  return {
    zahlungen,
    erstattungen,
    chargebacks,
    nettoCents: netto,
    bruttoCents: zahlungen.bruttoCents + erstattungen.bruttoCents + chargebacks.bruttoCents,
    gebuehrenCents: gebuehren,
    ohneGebuehr,
    qualitaet: (fallback > 0 ? "partial" : "complete") as Qualitaet,
  };
}

/** Neue Kunden: eindeutige Kunden mit **erster** erfolgreicher Mentoring-Zahlung im Zeitraum. */
export function neueKunden(geld: GeldZeile[], z: Zeitraum): Kennzahl {
  let n = 0;
  for (const am of ersteZahlungJeKunde(geld).values()) if (imZeitraum(am, z)) n++;
  return { wert: n, zaehler: n, nenner: null, qualitaet: "complete" };
}

/**
 * Neues Vertragsvolumen: Orders (ohne Live-Abo) im Orderzeitraum. Ein Upgrade
 * zählt nur mit seinem Zusatzauftrag (2.501 € statt 3.000 €); die Ausbildung
 * wird nicht erneut gezählt. Netto aus der tatsächlichen Steuer der Zahlungen,
 * ohne Zahlung 19 % inklusive als gekennzeichneter Ersatz.
 */
export function vertragsvolumen(orders: OrderZeile[], z: Zeitraum) {
  let brutto = 0;
  let netto = 0;
  let anzahl = 0;
  let geschaetzt = 0;
  for (const o of orders) {
    if (o.produkt === "live" || !imZeitraum(o.gekauftAm, z)) continue;
    anzahl++;
    brutto += o.bruttoCents;
    if (o.nettoCents != null) netto += o.nettoCents;
    else {
      netto += steuerFallback19Inkl(o.bruttoCents).nettoCents;
      geschaetzt++;
    }
  }
  return { bruttoCents: brutto, nettoCents: netto, anzahl, geschaetzt, qualitaet: (geschaetzt ? "partial" : "complete") as Qualitaet };
}

/**
 * Vertragsnetto einer Order aus den eigenen Zahlungen: Brutto × (Netto der
 * Zahlungen / Brutto der Zahlungen). Ohne Zahlung null.
 */
export function vertragsNetto(bruttoCents: number, zahlungen: { bruttoCents: number; nettoCents: number }[]): number | null {
  const b = zahlungen.reduce((s, z) => s + z.bruttoCents, 0);
  const n = zahlungen.reduce((s, z) => s + z.nettoCents, 0);
  if (b <= 0) return null;
  if (b === bruttoCents) return n;
  return Math.round((bruttoCents * n) / b);
}

/**
 * Live-Abo-Netto-MRR: nur echte, aktiv bezahlte 99-€-Abos (`active`). Probezeit
 * (Start erst nach dem enthaltenen Live-Zeitraum) und `past_due` zählen nicht;
 * Inklusiv-Zugänge aus Main/Premium stehen nie in dieser Liste.
 */
export function liveAboMrr(abos: LiveAboZeile[]): Kennzahl & { aktiv: number } {
  let mrr = 0;
  let aktiv = 0;
  let geschaetzt = 0;
  for (const a of abos) {
    if (a.status !== "active") continue;
    aktiv++;
    if (a.nettoMonatCents != null) mrr += a.nettoMonatCents;
    else if (a.bruttoMonatCents != null) {
      mrr += steuerFallback19Inkl(a.bruttoMonatCents).nettoCents;
      geschaetzt++;
    } else geschaetzt++;
  }
  return { wert: mrr, zaehler: mrr, nenner: null, aktiv, qualitaet: geschaetzt ? "partial" : "complete" };
}

/* ─── Leadqualität ──────────────────────────────────────────────────────── */

export type LeadZeile = { email: string; kategorien: Record<string, string> };

export type LeadQualitaetZeile = {
  frage: string;
  antwort: string;
  leads: number;
  gebucht: number;
  held: number;
  noShow: number;
  kunden: number;
  showUp: number | null;
  close: number | null;
};

/**
 * Outcome-, Show- und Close-Verteilung je Antwortkategorie (Playbook 9.3) —
 * ohne erfundenen Einzelscore. Ein Lead zählt je Frage einmal.
 */
export function leadQualitaet(leads: LeadZeile[], calls: CallZeile[], geld: GeldZeile[]): LeadQualitaetZeile[] {
  const callsJe = new Map<string, CallZeile[]>();
  for (const c of calls) {
    const e = norm(c.email);
    callsJe.set(e, [...(callsJe.get(e) ?? []), c]);
  }
  const kunden = ersteZahlungJeKunde(geld);
  const zeilen = new Map<string, LeadQualitaetZeile>();
  const gesehen = new Set<string>();
  for (const l of leads) {
    const e = norm(l.email);
    for (const [frage, antwort] of Object.entries(l.kategorien)) {
      const key = `${frage}\u0000${antwort}`;
      if (gesehen.has(`${key}\u0000${e}`)) continue;
      gesehen.add(`${key}\u0000${e}`);
      const z = zeilen.get(key) ?? { frage, antwort, leads: 0, gebucht: 0, held: 0, noShow: 0, kunden: 0, showUp: null, close: null };
      z.leads++;
      const cs = callsJe.get(e) ?? [];
      if (cs.length) z.gebucht++;
      if (cs.some((c) => c.status === "gefuehrt")) z.held++;
      else if (cs.some((c) => c.status === "no_show")) z.noShow++;
      if (kunden.has(e)) z.kunden++;
      zeilen.set(key, z);
    }
  }
  return [...zeilen.values()].map((z) => ({ ...z, showUp: quote(z.held, z.held + z.noShow), close: quote(z.kunden, z.held) }));
}
