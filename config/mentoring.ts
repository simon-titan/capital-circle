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
 * Wo sich das Board widersprach, gelten die Detailblätter (Entscheidung Simon,
 * 17.10.2026): Live-Zugang 3 Monate (Ausbildung) bzw. 12 Monate (Main,
 * Premium); Gruppencall Main 4, Premium 12 Monate; WhatsApp-Support je 4 Monate.
 *
 * ── Was davon die Plattform durchsetzt ──────────────────────────────────────
 *
 * Nur zwei Dinge: Die Plattform (Institut, Kurse, Journal) ist dauerhaft offen,
 * der Live-Bereich (Live-Sessions und Analysen) bis `profiles.live_bis`.
 * Gruppencall, WhatsApp-Support und Privatstunden organisiert das Team; sie
 * stehen hier, weil Kassenseite und Bestätigungsmail sie nennen müssen
 * (§ 312f BGB: Vertragsinhalt auf dauerhaftem Datenträger).
 *
 * ── Raten ───────────────────────────────────────────────────────────────────
 *
 * Zinsloser Zahlungsaufschub, **kein Aufschlag**. Mit Aufschlag entstünden die
 * Pflichten eines Teilzahlungsgeschäfts (§ 506 BGB, Art. 247 EGBGB) — wer hier
 * einen Aufschlag einbaut, ändert die Rechtslage und nicht nur eine Zahl.
 * Eine Rate ist der Gesamtpreis geteilt durch die Anzahl. **Angeboten werden
 * nur Ratenzahlen, die glatt in Cent aufgehen** (`erlaubteRaten`): 5.000 € in
 * drei Raten wären 3 × 1.666,66 € = 4.999,98 €, und „zusammen 4.999,98 €" unter
 * einem Preis von 5.000 € wirkt auf der Kasse schlampig. Den Restcent auf eine
 * Rate zu legen hieße zwei Preise je Abo und einen Sonderweg durch Webhook,
 * Mail und Admin. Premium gibt es deshalb in 1, 2 oder 4 Raten. Technisch ein
 * Monatsabo über einen Subscription Schedule, der nach der letzten Rate von
 * selbst endet (`lib/stripe/webhooks/mentoring.ts`).
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
  enthalten: Leistung[];
  nichtEnthalten: Leistung[];
}

const DAUERHAFT: Leistung[] = [
  { text: "Dauerhafter Zugang zur Plattform", dauerhaft: true },
  { text: "Dauerhafter Zugang zu allen Kursinhalten", detail: "Auch neue Kursvideos sind dauerhaft enthalten.", dauerhaft: true },
  { text: "Dauerhafter Zugang zum Trading Journal", dauerhaft: true },
];

function liveZugang(monate: number): Leistung {
  return { text: `${monate} Monate Live-Zugang`, detail: "Live Trading, Daily Bias und Trade Recaps" };
}

const GRUPPENCALL_ZEIT = "Montag, 18:00–19:30 Uhr";
const WHATSAPP_ZEIT = "Montag bis Sonntag, 20:00–21:00 Uhr, Feiertage ausgenommen";

export const PRODUKTE: Record<KassenProdukt, ProduktDefinition> = {
  ausbildung: {
    id: "ausbildung",
    name: "Ausbildung",
    preisCents: 59_900,
    maxRaten: 2,
    liveMonate: 3,
    enthalten: [...DAUERHAFT, liveZugang(3)],
    nichtEnthalten: [
      { text: "Kein zusätzlicher exklusiver Gruppencall" },
      { text: "Kein WhatsApp-Support" },
      { text: "Keine Privatstunden" },
    ],
  },
  main: {
    id: "main",
    name: "Main Mentoring",
    preisCents: 300_000,
    maxRaten: 4,
    liveMonate: 12,
    enthalten: [
      ...DAUERHAFT,
      liveZugang(12),
      { text: "4 Monate exklusiver Gruppencall", detail: GRUPPENCALL_ZEIT },
      { text: "4 Monate WhatsApp-Support", detail: WHATSAPP_ZEIT },
    ],
    nichtEnthalten: [{ text: "Keine Privatstunden" }],
  },
  premium: {
    id: "premium",
    name: "Premium Mentoring",
    preisCents: 500_000,
    maxRaten: 4,
    liveMonate: 12,
    enthalten: [
      ...DAUERHAFT,
      liveZugang(12),
      { text: "12 Monate exklusiver Gruppencall", detail: GRUPPENCALL_ZEIT },
      { text: "4 Monate WhatsApp-Support", detail: WHATSAPP_ZEIT },
      { text: "12 Privatstunden mit Emre", detail: "je 60 Minuten" },
    ],
    nichtEnthalten: [],
  },
  live: {
    id: "live",
    name: "Live-Trading-Abo",
    preisCents: 9_900,
    maxRaten: 1,
    liveMonate: null,
    enthalten: [{ text: "Live Trading, Daily Bias und Trade Recaps", detail: "monatlich kündbar" }],
    nichtEnthalten: [],
  },
};

export function istKassenProdukt(wert: unknown): wert is KassenProdukt {
  return typeof wert === "string" && (KASSEN_PRODUKTE as readonly string[]).includes(wert);
}

/** Eine Rate in Cent: Gesamtpreis durch Anzahl, auf den Cent abgerundet. */
export function rateCents(gesamtCents: number, raten: number): number {
  return Math.floor(gesamtCents / Math.max(1, raten));
}

/** Was bei dieser Zahlweise insgesamt fällig wird (Raten × Anzahl). */
export function sollCents(gesamtCents: number, raten: number): number {
  return raten > 1 ? rateCents(gesamtCents, raten) * raten : gesamtCents;
}

/**
 * Erlaubte Ratenzahlen eines Produkts, z. B. [1, 2, 4]: bis `maxRaten`, aber
 * nur, wo der Preis glatt in Cent aufgeht (siehe Kopfkommentar, „Raten").
 */
export function erlaubteRaten(produkt: KassenProdukt): number[] {
  const { maxRaten, preisCents } = PRODUKTE[produkt];
  return Array.from({ length: maxRaten }, (_, i) => i + 1).filter((n) => preisCents % n === 0);
}

export function euro(cents: number): string {
  return `${(cents / 100).toLocaleString("de-DE", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })} €`;
}

/** „3.000 €" bzw. „4 × 750 € (zusammen 3.000 €)". */
export function zahlweiseText(gesamtCents: number, raten: number): string {
  if (raten <= 1) return `${euro(gesamtCents)} einmalig`;
  return `${raten} Monatsraten à ${euro(rateCents(gesamtCents, raten))} (zusammen ${euro(sollCents(gesamtCents, raten))})`;
}

/** Wie lange ein Kassenlink gilt, wenn der Closer nichts anderes wählt. */
export const KASSENLINK_GUELTIG_TAGE = 7;

/** Closer, die im Admin zur Auswahl stehen (gleiche Slugs wie `discord_leads.closer`). */
export const CLOSER_AUSWAHL = [
  { id: "kevin", name: "Kevin" },
  { id: "simon", name: "Simon" },
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
    "Du hast an mindestens 80 % der Gruppencalls in deinem Betreuungszeitraum teilgenommen.",
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
