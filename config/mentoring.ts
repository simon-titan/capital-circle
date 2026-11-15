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
 * (Kapitel 2.2, verbindlich, Entscheidung Simon): Ausbildung 1 Monat Live und
 * 1 Monat Journal, kein Live-Archiv; Main/Premium Kurs und Journal dauerhaft,
 * Live-Trading und Live-Archiv 12 Monate, WhatsApp 4 Monate, 4 bzw. 12 × 60 Min
 * 1:1 mit Emre in den ersten 4 Monaten (ungenutzte verfallen). **Es gibt keine
 * exklusiven Gruppencalls mehr.** Wer vorher gekauft hat, behält, was in seiner
 * Kaufbestätigung steht (Migration 113 setzt `archiv_bis` für Bestandskonten).
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
const JOURNAL_DAUERHAFT: Leistung = { text: "Dauerhafter Zugang zum Trading Journal", dauerhaft: true };

const LIVE_DETAIL = "Live-Trading 3× pro Woche, Daily Bias und Trade Recaps";
const WHATSAPP_ZEIT = "Montag bis Sonntag, 20:00–21:00 Uhr, Feiertage ausgenommen";
const EINS_ZU_EINS_DETAIL = "je 60 Minuten, innerhalb der ersten 4 Monate; nicht genutzte Termine verfallen";

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
    liveMonate: 12,
    archivMonate: 12,
    journalMonate: null,
    enthalten: [
      ...PLATTFORM_DAUERHAFT,
      JOURNAL_DAUERHAFT,
      { text: "12 Monate Live-Zugang und Live-Archiv", detail: LIVE_DETAIL },
      { text: "4 Monate WhatsApp-Support", detail: WHATSAPP_ZEIT },
      { text: "4 × 60 Minuten 1:1 mit Emre", detail: EINS_ZU_EINS_DETAIL },
    ],
    nichtEnthalten: [],
  },
  premium: {
    id: "premium",
    name: "Premium Mentoring",
    preisCents: 500_000,
    // Bis sechs Raten seit 07.11.2026 (E-Mail-Playbook 1.0); Restcent auf Rate 1.
    maxRaten: 6,
    liveMonate: 12,
    archivMonate: 12,
    journalMonate: null,
    enthalten: [
      ...PLATTFORM_DAUERHAFT,
      JOURNAL_DAUERHAFT,
      { text: "12 Monate Live-Zugang und Live-Archiv", detail: LIVE_DETAIL },
      { text: "4 Monate WhatsApp-Support", detail: WHATSAPP_ZEIT },
      { text: "12 × 60 Minuten 1:1 mit Emre", detail: EINS_ZU_EINS_DETAIL },
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
 * Auszahlungs-Garantie nach Vorbild des Funnel-Boards („Keine Auszahlung →
 * volle Erstattung gemäß schriftlicher Erstattungsrichtlinie").
 *
 * **`freigegeben` steht auf `false`, bis Emre die Bedingungen abgenommen hat.**
 * Solange zeigen weder die Funnel-Seite noch die Kassenseite den Garantiesatz,
 * und `/garantie` antwortet mit 404. Eine Garantie ohne veröffentlichte
 * Bedingungen wäre ein Versprechen ohne Grenzen — und Werbung mit einem
 * Erfolgsversprechen, das sich nicht einlösen lässt (§ 5 UWG).
 *
 * Die Bedingungen unten sind ein **Entwurf** (Vorschlag Claude, 17.10.2026),
 * nicht anwaltlich geprüft. Wer sie ändert, ändert den Text der Seite.
 */
export const garantie = {
  freigegeben: false,
  /** Für welche Programme sie gilt. */
  produkte: ["main", "premium"] as MentoringProdukt[],
  kurz: "Keine Auszahlung? Dann bekommst du dein Geld zurück, nach unseren schriftlichen Garantiebedingungen.",
  titel: "Auszahlungs-Garantie",
  einleitung:
    "Wenn du das Programm so umsetzt, wie wir es dir zeigen, und trotzdem innerhalb von 12 Monaten keine einzige Auszahlung von einer Prop-Firma erhältst, erstatten wir dir den vollen Kaufpreis.",
  bedingungen: [
    "Die Garantie gilt für das Main Mentoring und das Premium Mentoring, nicht für die Ausbildung und nicht für das Live-Trading-Abo.",
    "Du hast alle Module des Kursbereichs innerhalb von 60 Tagen nach dem Kauf abgeschlossen.",
    "Du hast an mindestens 80 % der Live-Trading-Sessions in deinem Betreuungszeitraum teilgenommen.",
    "Du hast jeden Trade im Trading Journal der Plattform dokumentiert, mit Screenshot und Begründung.",
    "Du hast im Garantiezeitraum mindestens drei Prop-Firm-Challenges nach unserem Risiko-Plan gehandelt und keine Regel der jeweiligen Prop-Firma verletzt.",
    "Der Kaufpreis ist vollständig bezahlt (bei Ratenzahlung: alle Raten).",
    "Du stellst den Antrag spätestens 30 Tage nach Ablauf der 12 Monate schriftlich über das Kontaktformular.",
  ],
  ablauf:
    "Wir prüfen den Antrag anhand deines Journals, der Teilnahmelisten und der Unterlagen deiner Prop-Firmen. Ist alles erfüllt, überweisen wir den Kaufpreis innerhalb von 14 Tagen zurück. Mit der Erstattung endet dein Zugang zur Plattform.",
  hinweis:
    "Trading ist mit erheblichen Verlustrisiken verbunden. Die Garantie ist kein Gewinnversprechen; sie begrenzt dein Risiko auf den Kaufpreis des Programms, nicht auf deine Trading-Verluste oder Challenge-Gebühren.",
} as const;
