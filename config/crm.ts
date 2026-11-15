/**
 * CRM der Closer (`/crm`, Migration 112) — Phasen, Verlustgründe, Quellen,
 * Anrufergebnisse und Angebote an einer Stelle. Entscheidungen Simon 07.11.2026:
 * eigener Bereich, alle sehen alle Kontakte (mit Filtern), jeder darf
 * umverteilen, Zuweisung nach festen Call-Blöcken, Umsatz je Closer.
 */

export const PHASEN = [
  { id: "neu", label: "Neu", text: "Noch kein Kontakt" },
  { id: "kontaktiert", label: "Kontaktiert", text: "Angerufen oder angeschrieben" },
  { id: "termin", label: "Termin gebucht", text: "Analysegespräch steht" },
  { id: "no_show", label: "No-Show", text: "Nicht erschienen" },
  { id: "gespraech", label: "Gespräch geführt", text: "Entscheidung offen" },
  { id: "angebot", label: "Angebot", text: "Kassenlink raus" },
  { id: "spaeter", label: "Später", text: "Wiedervorlage vereinbart" },
  { id: "gewonnen", label: "Gewonnen", text: "Gekauft" },
  { id: "verloren", label: "Verloren", text: "Mit Grund abgeschlossen" },
] as const;

export type Phase = (typeof PHASEN)[number]["id"];
export const PHASE_IDS = PHASEN.map((p) => p.id) as Phase[];
export const phaseLabel = Object.fromEntries(PHASEN.map((p) => [p.id, p.label])) as Record<Phase, string>;

/** Offene Phasen — die Pipeline zeigt sie als Spalten, „Gewonnen"/„Verloren" als Abschluss. */
export const OFFENE_PHASEN: Phase[] = ["neu", "kontaktiert", "termin", "no_show", "gespraech", "angebot", "spaeter"];

/**
 * Reihenfolge für automatische Übergänge: Die Synchronisation schiebt nur
 * vorwärts (ein gebuchter Termin hebt „Kontaktiert" auf „Termin", nie zurück).
 */
export const PHASE_RANG: Record<Phase, number> = {
  neu: 0,
  kontaktiert: 1,
  spaeter: 1,
  no_show: 2,
  termin: 3,
  gespraech: 4,
  angebot: 5,
  verloren: 6,
  gewonnen: 7,
};

/** Vorschlag Claude, 07.11.2026 — im Board wählbar, Freitext dazu möglich. */
export const VERLUSTGRUENDE = [
  { id: "budget", label: "Kein Budget / zu teuer" },
  { id: "kein_interesse", label: "Kein Interesse mehr" },
  { id: "nicht_erreicht", label: "Nicht erreichbar" },
  { id: "zeitpunkt", label: "Zeitpunkt passt nicht" },
  { id: "nicht_geeignet", label: "Passt nicht (Ausgangslage, Erwartung)" },
  { id: "vertrauen", label: "Skepsis / kein Vertrauen" },
  { id: "konkurrenz", label: "Anderes Angebot gewählt" },
  { id: "partner", label: "Partner/Familie dagegen" },
  { id: "no_show", label: "Wiederholt nicht erschienen" },
  { id: "sonstiges", label: "Sonstiges" },
] as const;
export type Verlustgrund = (typeof VERLUSTGRUENDE)[number]["id"];

/** Woher ein Kontakt kommt (`crm_kontakte.quelle` / `quellen`). */
export const QUELLEN = {
  call_funnel: "Call-Funnel (/call)",
  termin_direct: "Direkt-Termin (/termin)",
  discord_funnel: "Discord-Funnel",
  training: "Free Training (Analysegespräch)",
  bewerbung: "Free-Bewerbung (Kontaktwunsch)",
  ht_apply: "HT-Bewerbung (/apply)",
  manuell: "Manuell angelegt",
} as const;
export type Quelle = keyof typeof QUELLEN;

/** Quellen des neuen Funnels — der Standardfilter der Kontaktliste (Entscheidung Simon). */
export const NEUER_FUNNEL: Quelle[] = ["call_funnel", "training", "bewerbung"];

export const ANRUF_ERGEBNISSE = [
  { id: "erreicht", label: "Erreicht" },
  { id: "nicht_erreicht", label: "Nicht erreicht" },
  { id: "mailbox", label: "Mailbox" },
  { id: "rueckruf", label: "Rückruf vereinbart" },
  { id: "termin_vereinbart", label: "Termin vereinbart" },
] as const;

/** Die Angebote im Closing (Umsatz je Closer). Preise aus `config/mentoring.ts`. */
export const ANGEBOTE = [
  { produkt: "main", label: "Main Mentoring (3.000 €)" },
  { produkt: "premium", label: "Premium Mentoring (5.000 €)" },
  { produkt: "ausbildung", label: "Ausbildung (799 €)" },
] as const;

/** Ab wann ein No-Show-Anruf fällig ist (Playbook: +15 Minuten). */
export const NO_SHOW_ANRUF_MINUTEN = 15;

/* ─── Ergebnis-Maske nach dem Gespräch (Tracking-Playbook 9.2, Migration 114) ── */

/**
 * Pflichtfelder nach einem geführten Call. Die Werte sind die des Playbooks
 * (Export, Auswertung); das CRM zeigt die deutschen Labels. Gespeichert
 * versioniert in `crm_call_ergebnis` — jede Änderung eine neue Zeile.
 */
export const CALL_OUTCOMES = [
  { id: "won_payment_pending", label: "Zusage, Zahlung offen" },
  { id: "open_decision", label: "Entscheidung offen" },
  { id: "lost", label: "Verloren" },
  { id: "unqualified", label: "Nicht qualifiziert" },
  { id: "no_show", label: "Nicht erschienen" },
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number]["id"];

export const CALL_PRODUKTE = [
  { id: "main", label: "Main Mentoring" },
  { id: "premium", label: "Premium Mentoring" },
  { id: "ausbildung", label: "Ausbildung (799 €)" },
  { id: "none", label: "Kein Produkt" },
] as const;
export type CallProdukt = (typeof CALL_PRODUKTE)[number]["id"];

export const CALL_GRUENDE = [
  { id: "budget", label: "Budget" },
  { id: "timing", label: "Zeitpunkt" },
  { id: "trust", label: "Vertrauen" },
  { id: "consideration", label: "Bedenkzeit" },
  { id: "fit", label: "Passt nicht" },
  { id: "other", label: "Sonstiges" },
] as const;
export type CallGrund = (typeof CALL_GRUENDE)[number]["id"];

/** Follow-up Pflicht: bei offener Entscheidung immer, bei Zusage ohne Zahlung in der Regel (hier: Pflicht). */
export function followUpPflicht(o: CallOutcome): boolean {
  return o === "open_decision" || o === "won_payment_pending";
}

/** Grund Pflicht: bei Verlust, fehlender Qualifikation und offener Entscheidung. */
export function grundPflicht(o: CallOutcome): boolean {
  return o === "lost" || o === "unqualified" || o === "open_decision";
}

/**
 * Ein Ergebnis zieht die CRM-Phase nach — **eine** Abbildung auf das bestehende
 * Phasenmodell, kein zweites paralleles Modell.
 */
export const OUTCOME_ZU_PHASE: Record<CallOutcome, Phase> = {
  won_payment_pending: "angebot",
  open_decision: "gespraech",
  lost: "verloren",
  unqualified: "verloren",
  no_show: "no_show",
};

/** Verlustgrund im CRM zu einem Ergebnisgrund (für „Verloren"). */
export function verlustgrundAus(o: CallOutcome, g: CallGrund | null): Verlustgrund {
  if (o === "unqualified" || g === "fit") return "nicht_geeignet";
  if (g === "budget") return "budget";
  if (g === "timing") return "zeitpunkt";
  if (g === "trust") return "vertrauen";
  return "sonstiges";
}

/**
 * Statusbegriffe der Sales-Pipeline (Tracking-Playbook 4.3) — für Auswertung und
 * Export aus Phase, letztem Ergebnis und Kauf abgeleitet. Das CRM arbeitet weiter
 * mit seinen Phasen.
 */
export type PipelineStatus =
  | "application_submitted"
  | "calendar_pending"
  | "booked"
  | "no_show"
  | "held"
  | "open_decision"
  | "won_payment_pending"
  | "customer_paid"
  | "lost"
  | "unqualified";

export function pipelineStatus(p: { phase: Phase | string; verlustGrund: string | null; letztesOutcome: CallOutcome | null }): PipelineStatus {
  switch (p.phase) {
    case "neu":
    case "kontaktiert":
      return "calendar_pending";
    case "termin":
      return "booked";
    case "no_show":
      return "no_show";
    case "gespraech":
    case "spaeter":
      return p.letztesOutcome === "won_payment_pending" ? "won_payment_pending" : p.letztesOutcome ? "open_decision" : "held";
    case "angebot":
      return "won_payment_pending";
    case "gewonnen":
      return "customer_paid";
    case "verloren":
      return p.letztesOutcome === "unqualified" || p.verlustGrund === "nicht_geeignet" ? "unqualified" : "lost";
    default:
      return "application_submitted";
  }
}

export const PIPELINE_STATUS_LABEL: Record<PipelineStatus, string> = {
  application_submitted: "Bewerbung eingegangen",
  calendar_pending: "Ohne Termin",
  booked: "Termin gebucht",
  no_show: "No-Show",
  held: "Geführt, ohne Ergebnis",
  open_decision: "Entscheidung offen",
  won_payment_pending: "Zusage, Zahlung offen",
  customer_paid: "Kunde (bezahlt)",
  lost: "Verloren",
  unqualified: "Nicht qualifiziert",
};
