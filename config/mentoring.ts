/**
 * Mentoring-Programme — Produkte, Laufzeiten, Raten, Garantie.
 *
 * ── Woher das kommt ─────────────────────────────────────────────────────────
 *
 * Funnel-Board von Emre (17.10.2026, „Capital Circle — zukünftige Struktur"):
 * drei Angebote, verkauft im Closing-Call, bezahlt über einen Kassenlink, den
 * der Closer im Admin anlegt (`/admin/kassenlinks`). Dazu das Anschlussangebot
 * Live-Trading-Abo für 99 €/Monat.
 *
 * Leistungen seit 08.11.2026 nach Emres „Tracking & Finanzen Playbook 1.0"
 * (Kapitel 2.2): Ausbildung 1 Monat Live und 1 Monat Journal, kein Live-Archiv.
 * **Main/Premium seit 20.11.2026 (Entscheidung Simon, Mentoringvertrag):
 * Laufzeit regulär 3 Monate** — Live-Trading, Live-Archiv und WhatsApp je 3 Monate
 * (vorher 12/12/4), Kurs und Journal dauerhaft. 1:1 mit Emre in den 3 Monaten:
 * Main 4 × 60 Min, Premium nach Bedarf ohne Obergrenze, mindestens 12 × 60 Min
 * (Takt legen Kunde und Emre gemeinsam fest). Ungenutzte Termine verfallen.
 * **Es gibt keine exklusiven Gruppencalls mehr.** Wer vorher gekauft hat, behält, was in seiner
 * Kaufbestätigung steht (Migration 113 setzt `archiv_bis` für Bestandskonten).
 *
 * ── Plattform als kostenlose Zugabe (seit 19.11.2026, Vorgabe des Anwalts) ──
 *
 * Wegen des Fernunterrichtsschutzgesetzes (BGH, 12.06.2025, III ZR 109/24)
 * verkaufen Main und Premium **die persönliche Betreuung** (Live-Trading,
 * Live-Archiv, WhatsApp, 1:1 mit Emre). Plattform, Kurse und Trading Journal
 * gibt es **kostenlos dazu** — sie sind nicht Gegenstand des Preises. So steht
 * es in `enthalten` (`zugabe: true`, Betreuung zuerst), auf der Kassenseite
 * („Kostenlos dazu") und im Mentoringvertrag. Wer hier Texte ändert, hält
 * diese Einordnung: Kurse nie als das Gekaufte darstellen. Die Ausbildung ist
 * (noch) nicht umgestellt.
 *
 * ── Was davon die Plattform durchsetzt ──────────────────────────────────────
 *
 * Plattform und Kurse dauerhaft. Journal bis `profiles.journal_bis` (leer =
 * dauerhaft), Live-Bereich (Analysen, Daily Bias) bis `live_bis`, Live-Archiv
 * (Aufzeichnungen) bis `archiv_bis` — `lib/mentoring/zugang.ts`.
 * WhatsApp-Support und 1:1-Termine organisiert das Team; sie stehen hier, weil
 * Kassenseite und Bestätigungsmail sie nennen müssen (§ 312f BGB: Vertragsinhalt
 * auf dauerhaftem Datenträger).
 *
 * ── Raten ───────────────────────────────────────────────────────────────────
 *
 * Zinsloser Zahlungsaufschub, **kein Aufschlag**. Mit Aufschlag entstünden die
 * Pflichten eines Teilzahlungsgeschäfts (§ 506 BGB, Art. 247 EGBGB) — wer hier
 * einen Aufschlag einbaut, ändert die Rechtslage und nicht nur eine Zahl.
 * Eine Rate ist der Gesamtpreis geteilt durch die Anzahl, auf den Cent
 * abgerundet; **der Restcent kommt auf die erste Rate** (seit 07.11.2026, E-Mail-
 * Playbook 1.0: Premium bis sechs Raten, 5.000 € / 6 = 1 × 833,35 € + 5 × 833,33 €).
 * Damit geht jede Ratenzahl bis `maxRaten` und die Summe ist immer der Preis.
 * Technisch ein Monatsabo über einen Subscription Schedule: Phase 1 die erste
 * Rate (heute, an der Kasse), Phase 2 die übrigen zum Regelbetrag, danach endet
 * er von selbst (`lib/stripe/webhooks/mentoring.ts`).
 */

export type MentoringProdukt = "ausbildung" | "main" | "premium";
export type KassenProdukt = MentoringProdukt | "live";

export const MENTORING_PRODUKTE: readonly MentoringProdukt[] = ["ausbildung", "main", "premium"] as const;
export const KASSEN_PRODUKTE: readonly KassenProdukt[] = ["ausbildung", "main", "premium", "live"] as const;

export interface Leistung {
  /** Kurzer Satz, wie er auf der Kassenseite und in der Mail steht. */
  text: string;
  /** Optionaler Zusatz in der zweiten Zeile (Zeiten, Einschränkungen). */
  detail?: string;
  /**
   * Bleibt nach dem Kauf für immer (Plattform, Kurse, Journal). Die Kassenseite
   * trennt danach „Dauerhaft" von „Live und Betreuung" — in einer gemischten
   * Liste sah man nicht, was nach Ablauf der Betreuung bleibt.
   */
  dauerhaft?: boolean;
  /**
   * Kostenlose Zugabe, nicht Gegenstand des Preises (Main/Premium: Plattform, Kurse,
   * Journal). Die Kassenseite zeigt sie unter „Kostenlos dazu" nach der Betreuung.
   */
  zugabe?: boolean;
}

export interface ProduktDefinition {
  id: KassenProdukt;
  name: string;
  /** Gesamtpreis in Cent (Live-Abo: Monatspreis). */
  preisCents: number;
  /** Höchstzahl Monatsraten (1 = nur Einmalzahlung). */
  maxRaten: number;
  /** Monate Live-Zugang ab Kauf; beim Live-Abo bestimmt der Abrechnungszeitraum. */
  liveMonate: number | null;
  /** Monate Live-Archiv (Aufzeichnungen) ab Kauf; `0` = nicht enthalten. */
  archivMonate: number;
  /** Monate Trading Journal ab Kauf; `null` = dauerhaft, `0` = nicht enthalten. */
  journalMonate: number | null;
  enthalten: Leistung[];
  nichtEnthalten: Leistung[];
}

const PLATTFORM_DAUERHAFT: Leistung[] = [
  { text: "Dauerhafter Zugang zur Plattform", dauerhaft: true },
  { text: "Dauerhafter Zugang zu allen Kursinhalten", detail: "Auch neue Kursvideos sind dauerhaft enthalten.", dauerhaft: true },
];
/** Main/Premium: Plattform, Kurse und Journal als kostenlose Zugabe (siehe Kopf der Datei). */
const ZUGABE_PLATTFORM: Leistung[] = [
  {
    text: "Kostenlos dazu: dauerhafter Zugang zur Plattform und zu allen Kursinhalten",
    detail: "Auch neue Kursvideos sind enthalten. Nicht Teil des Preises.",
    dauerhaft: true,
    zugabe: true,
  },
  { text: "Kostenlos dazu: dauerhafter Zugang zum Trading Journal", dauerhaft: true, zugabe: true },
];

const LIVE_DETAIL = "Live-Trading 3× pro Woche, Daily Bias und Trade Recaps";
const WHATSAPP_ZEIT = "Montag bis Sonntag, 20:00–21:00 Uhr, Feiertage ausgenommen";
const EINS_ZU_EINS_DETAIL = "je 60 Minuten, innerhalb der 3 Monate; nicht genutzte Termine verfallen";
const EINS_ZU_EINS_PREMIUM =
  "Anzahl und Takt legst du mit Emre gemeinsam fest, keine Obergrenze; mindestens 12 × 60 Minuten in den 3 Monaten";

/** Anrechnung der Ausbildung beim Upgrade auf Main oder Premium (Tracking-Playbook 2.3). */
export const UPGRADE_ANRECHNUNG_CENTS = 49_900;

export const PRODUKTE: Record<KassenProdukt, ProduktDefinition> = {
  ausbildung: {
    id: "ausbildung",
    name: "Ausbildung",
    // 799 € seit 07.11.2026 (E-Mail-Playbook 1.0, Entscheidung Simon); vorher 599 €.
    preisCents: 79_900,
    maxRaten: 2,
    // Seit 08.11.2026 (Tracking-Playbook 2.2): 1 Monat Live und Journal; vorher 3 Monate Live, Journal dauerhaft.
    liveMonate: 1,
    archivMonate: 0,
    journalMonate: 1,
    enthalten: [
      ...PLATTFORM_DAUERHAFT,
      { text: "1 Monat Trading Journal" },
      { text: "1 Monat Live-Zugang", detail: LIVE_DETAIL },
    ],
    nichtEnthalten: [
      { text: "Kein Zugang zum Live-Archiv (Aufzeichnungen)" },
      { text: "Kein WhatsApp-Support" },
      { text: "Keine 1:1-Termine mit Emre" },
    ],
  },
  main: {
    id: "main",
    name: "Main Mentoring",
    preisCents: 300_000,
    // Bis sechs Raten seit 08.11.2026 (Tracking-Playbook 2.2), vorher vier.
    maxRaten: 6,
    // 3 Monate seit 20.11.2026 (Mentoringvertrag), vorher 12.
    liveMonate: 3,
    archivMonate: 3,
    journalMonate: null,
    enthalten: [
      { text: "4 × 60 Minuten 1:1 mit Emre", detail: EINS_ZU_EINS_DETAIL },
      { text: "3 Monate Live-Zugang und Live-Archiv", detail: LIVE_DETAIL },
      { text: "3 Monate WhatsApp-Support", detail: WHATSAPP_ZEIT },
      ...ZUGABE_PLATTFORM,
    ],
    nichtEnthalten: [],
  },
  premium: {
    id: "premium",
    name: "Premium Mentoring",
    preisCents: 500_000,
    // Bis sechs Raten seit 07.11.2026 (E-Mail-Playbook 1.0); Restcent auf Rate 1.
    maxRaten: 6,
    // 3 Monate seit 20.11.2026 (Mentoringvertrag), vorher 12.
    liveMonate: 3,
    archivMonate: 3,
    journalMonate: null,
    enthalten: [
      { text: "1:1 mit Emre nach Bedarf", detail: EINS_ZU_EINS_PREMIUM },
      { text: "3 Monate Live-Zugang und Live-Archiv", detail: LIVE_DETAIL },
      { text: "3 Monate WhatsApp-Support", detail: WHATSAPP_ZEIT },
      ...ZUGABE_PLATTFORM,
    ],
    nichtEnthalten: [],
  },
  live: {
    id: "live",
    name: "Live-Trading-Abo",
    preisCents: 9_900,
    maxRaten: 1,
    liveMonate: null,
    archivMonate: 0,
    journalMonate: 0,
    enthalten: [{ text: LIVE_DETAIL, detail: "monatlich kündbar" }],
    nichtEnthalten: [
      { text: "Kein Live-Archiv, kein Trading Journal" },
      { text: "Kein WhatsApp-Support, keine 1:1-Termine" },
    ],
  },
};

export function istKassenProdukt(wert: unknown): wert is KassenProdukt {
  return typeof wert === "string" && (KASSEN_PRODUKTE as readonly string[]).includes(wert);
}

/** Eine (Regel-)Rate in Cent: Gesamtpreis durch Anzahl, auf den Cent abgerundet. */
export function rateCents(gesamtCents: number, raten: number): number {
  return Math.floor(gesamtCents / Math.max(1, raten));
}

/** Die erste Rate trägt den Restcent: Gesamt − (Anzahl − 1) × Regelrate. */
export function ersteRateCents(gesamtCents: number, raten: number): number {
  if (raten <= 1) return gesamtCents;
  return gesamtCents - rateCents(gesamtCents, raten) * (raten - 1);
}

/** Was bei dieser Zahlweise insgesamt fällig wird — immer der Preis (Restcent auf Rate 1). */
// `raten` bleibt in der Signatur: Alle Aufrufer übergeben sie, und vor dem 07.11.2026 hing die Summe daran.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function sollCents(gesamtCents: number, raten: number): number {
  return gesamtCents;
}

/** Erlaubte Ratenzahlen eines Produkts: 1 bis `maxRaten`. */
export function erlaubteRaten(produkt: KassenProdukt): number[] {
  return Array.from({ length: PRODUKTE[produkt].maxRaten }, (_, i) => i + 1);
}

export function euro(cents: number): string {
  return `${(cents / 100).toLocaleString("de-DE", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })} €`;
}

/** „3.000 € einmalig", „4 Monatsraten à 750 € (zusammen 3.000 €)" bzw. mit Restcent auf Rate 1. */
export function zahlweiseText(gesamtCents: number, raten: number): string {
  if (raten <= 1) return `${euro(gesamtCents)} einmalig`;
  return `${ratenText(gesamtCents, raten)} (zusammen ${euro(gesamtCents)})`;
}

/** „4 Monatsraten à 750 €" bzw. „6 Monatsraten: 1 × 833,35 €, danach 5 × 833,33 €". */
export function ratenText(gesamtCents: number, raten: number): string {
  const rate = rateCents(gesamtCents, raten);
  const erste = ersteRateCents(gesamtCents, raten);
  if (erste === rate) return `${raten} Monatsraten à ${euro(rate)}`;
  return `${raten} Monatsraten: 1 × ${euro(erste)}, danach ${raten - 1} × ${euro(rate)}`;
}

/** Wie lange ein Kassenlink gilt, wenn der Closer nichts anderes wählt. */
export const KASSENLINK_GUELTIG_TAGE = 7;

/** Closer, die im Admin zur Auswahl stehen (gleiche Slugs wie `discord_leads.closer`). */
export const CLOSER_AUSWAHL = [
  { id: "kevin", name: "Kevin" },
  { id: "simon", name: "Simon" },
  { id: "daniel", name: "Daniel" },
] as const;

/* ─── Garantie ──────────────────────────────────────────────────────────── */

/**
 * Auszahlungs-Garantie — Stand 20.11.2026, deckungsgleich mit Abschnitt 7 des
 * Mentoringvertrags (`D:\CAPITAL-CIRCLE\VERTRAEGE\quelle\mentoringvertrag.html`,
 * außerhalb des Repos). Entscheidung Simon: strenge Bedingungen, alle zusammen;
 * **Rechtsfolge ist nur kostenlose Weiterbetreuung: keine Auszahlung nach den 3 Monaten
 * → jeweils weitere 3 Monate im selben Umfang, ohne Höchstzahl, bis zur ersten
 * Auszahlung — nie eine Erstattung.** Die Verlängerung setzt das Team von Hand
 * (`live_bis`, `archiv_bis`); der Webhook kennt sie nicht.
 * Das Funnel-Board vom 17.10. („volle Erstattung") gilt damit nicht mehr.
 *
 * **`freigegeben` steht auf `false`, bis Emre und der Anwalt abgenommen haben.**
 * Solange zeigen weder die Funnel-Seite noch die Kassenseite den Garantiesatz,
 * und `/garantie` antwortet mit 404. Werbung darf nie „Geld zurück" sagen — der
 * Vertrag schließt das aus, und eine Garantie, die mehr verspricht als der
 * Vertrag hält, ist irreführend (§ 5 UWG).
 *
 * Wer hier etwas ändert, ändert den Vertrag mit (und umgekehrt).
 */
export const garantie = {
  freigegeben: false,
  /** Für welche Programme sie gilt. */
  produkte: ["main", "premium"] as MentoringProdukt[],
  kurz: "Keine Auszahlung trotz voller Umsetzung? Dann betreuen wir dich kostenlos weiter, bis deine erste Auszahlung da ist, nach unseren schriftlichen Garantiebedingungen.",
  titel: "Auszahlungs-Garantie",
  einleitung:
    "Wenn du das Programm genau so umsetzt, wie wir es mit dir festlegen, und nach den 3 Monaten noch keine Auszahlung von einer Prop-Firma erhalten hast, arbeiten wir kostenlos weiter: jeweils 3 weitere Monate mit 1:1-Terminen, Live-Zugang, Live-Archiv und WhatsApp-Support im selben Umfang wie beim Kauf, so lange, bis deine erste Auszahlung da ist. Eine Erstattung des Preises gibt es nicht.",
  bedingungen: [
    "Die Garantie gilt für das Main Mentoring und das Premium Mentoring, nicht für die Ausbildung und nicht für das Live-Trading-Abo. Alle folgenden Bedingungen müssen zusammen erfüllt sein, in den ersten 3 Monaten und in jeder Verlängerung.",
    "Du hast alle Module des Kursbereichs innerhalb von 60 Tagen ab Zugangsbeginn abgeschlossen.",
    "Du hast live an mindestens 80 % der Live-Trading-Sessions teilgenommen, die im jeweiligen Zeitraum mindestens 24 Stunden vorher im Kalender angekündigt wurden. Maßgeblich ist der Teilnehmerbericht, Aufzeichnungen zählen nicht.",
    "Du hast den ersten 1:1-Termin innerhalb von 30 Tagen und alle 1:1-Termine wahrgenommen, die dir zustehen oder mit dir vereinbart sind.",
    "Du hast jeden Trade auf jedem Konto spätestens am Folgetag im Trading Journal erfasst, mit Screenshot von Einstieg und Ausstieg, Setup und Begründung.",
    "Du hast in den ersten 3 Monaten mindestens drei, in jeder Verlängerung mindestens eine Challenge bei Prop-Firmen aus dem Reiter „Propfirms“ im Mitgliederbereich gehandelt, ausschließlich nach deinem schriftlichen Risiko-Plan und ohne Regelverstoß. Solange du ein bestandenes Konto nach Plan handelst, brauchst du keine neue Challenge.",
    "Du hast ab dem zweiten Monat in jedem Kalendermonat an mindestens 8 Tagen nach dem Risiko-Plan gehandelt.",
    "Du legst die vollständige Kontohistorie aller Trading-Konten im jeweiligen Zeitraum offen, mit allen Mitteilungen der Prop-Firmen.",
    "Du hast alle fälligen Raten pünktlich bezahlt (nie mehr als 7 Tage Verzug) und keine Zahlung zurückgebucht.",
    "Du hast die Geheimhaltungsvereinbarung eingehalten.",
    "Du stellst den Antrag spätestens 14 Tage nach Ablauf der 3 Monate bzw. der Verlängerung schriftlich an contact@capitalcircletrading.com.",
  ],
  ablauf:
    "Als erreicht gilt das Ziel schon, wenn du eine Auszahlung in beliebiger Höhe erhalten hast, ein Konto auszahlungsberechtigt war oder ein Konto wegen eines Regelverstoßes gekündigt wurde. Wir prüfen den Antrag anhand der Plattform, der Teilnehmerlisten und der Unterlagen deiner Prop-Firmen und melden uns innerhalb von 14 Tagen. Ist alles erfüllt, verlängern wir deine Betreuung ab unserer Mitteilung kostenlos um 3 Monate, und das so oft, bis deine erste Auszahlung da ist. Eine Erstattung des Preises, von Challenge-Gebühren oder Trading-Verlusten ist ausgeschlossen. Verbindlich ist der Wortlaut in Abschnitt 7 deines Mentoringvertrags.",
  hinweis:
    "Trading ist mit erheblichen Verlustrisiken verbunden. Die Garantie ist kein Gewinnversprechen; sie gibt dir einen Anspruch auf weitere Betreuung, nicht auf ein bestimmtes Ergebnis.",
} as const;
