/**
 * Widerrufsfunktion (§ 356a BGB) — Typen, Wortlaute und Formate, die
 * Formular, API-Route, Mails und Admin-Liste gemeinsam brauchen.
 *
 * Bewusst ohne Server-Importe: Das Formular (Client-Komponente) zieht diese
 * Datei ebenfalls. Was hier steht, sieht der Verbraucher auf der
 * Bestätigungsseite und in der Eingangsbestätigung — beide müssen dieselben
 * Worte benutzen, sonst bestätigt die Mail etwas anderes als die Seite.
 *
 * Datums- und E-Mail-Helfer kommen aus dem Kündigungsbutton
 * (`lib/kuendigung/shared.ts`): dieselbe Zeitzone, dasselbe Eingangsformat,
 * dieselbe E-Mail-Prüfung — zwei gesetzliche Buttons, eine Sprache.
 */

import { anbieter } from "@/config/legal";
import { formatEingang, formatTag, GRENZEN as KUENDIGUNG_GRENZEN, istGueltigeEmail } from "@/lib/kuendigung/shared";

export { formatEingang, formatTag, istGueltigeEmail };

/**
 * Betreiber-Postfach für Widerrufe: Empfänger der Benachrichtigung, Reply-To
 * der Eingangsbestätigung und Kontaktadresse auf der Seite.
 */
export const BETREIBER_EMAIL = anbieter.email;

/** Beschriftungen, die § 356a Abs. 1 und 3 BGB vorgeben — an einer Stelle. */
export const BESCHRIFTUNG = {
  /** Die Widerrufsfunktion selbst (Fußzeile, Seitentitel). */
  funktion: "Vertrag widerrufen",
  /** Die Bestätigungsfunktion (der Absende-Knopf). */
  bestaetigen: "Widerruf bestätigen",
} as const;

/**
 * Der Erklärungssatz. Er steht über dem Knopf, wandert wortgleich in die
 * Datenbank (`widerrufe.erklaerung`) und in die Eingangsbestätigung — damit
 * belegt ist, **was** erklärt wurde, nicht nur, dass etwas ankam.
 * Angelehnt an das Muster-Widerrufsformular (Anlage 2 zu Art. 246a § 1
 * Abs. 2 Satz 1 Nr. 1 EGBGB).
 */
export const ERKLAERUNG = `Hiermit widerrufe ich den von mir mit ${anbieter.marke} (${anbieter.name}) geschlossenen Vertrag.`;

export type WiderrufsStatus = "eingegangen" | "manuell_pruefen" | "erledigt";

export const STATUS_LABEL: Record<WiderrufsStatus, string> = {
  eingegangen: "Eingegangen",
  manuell_pruefen: "Manuell prüfen",
  erledigt: "Erledigt",
};

/** Grenzen der Freitextfelder — Formular und Route prüfen gegen dieselben Werte. */
export const GRENZEN = {
  nameMin: KUENDIGUNG_GRENZEN.nameMin,
  nameMax: KUENDIGUNG_GRENZEN.nameMax,
  emailMax: KUENDIGUNG_GRENZEN.emailMax,
  vertragMax: 300,
  notizMax: 1000,
} as const;

/** Kurze, vorlesbare Eingangsnummer aus der UUID (`W-3F9A2C1B`). */
export function referenzAus(id: string): string {
  return `W-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/**
 * Tage, die der Unternehmer nach Zugang des Widerrufs für die Rückzahlung hat
 * (§ 357 Abs. 1 BGB, § 355 Abs. 3 Satz 2 BGB).
 */
export const ERSTATTUNG_TAGE = 14;

/** Spätester Tag der Rückzahlung, gerechnet ab Eingang des Widerrufs. */
export function erstattungFaelligBis(eingegangenAm: string): string {
  const d = new Date(eingegangenAm);
  d.setUTCDate(d.getUTCDate() + ERSTATTUNG_TAGE);
  return d.toISOString();
}

/**
 * Der Beleg, den die Route zurückgibt und die Bestätigungsseite anzeigt.
 * Deckt § 356a Abs. 4 BGB ab: Inhalt der Widerrufserklärung nach Abs. 2
 * (Erklärung, Name, Vertrag, Bestätigungsweg) sowie Datum und Uhrzeit des
 * Eingangs.
 *
 * Enthält bewusst **keine** Auskunft über gefundene Konten oder Verträge —
 * außer der Vertragsbezeichnung, die ein eingeloggter Verbraucher auf der
 * Seite selbst gesehen und mit dem Absenden bestätigt hat. Sonst verriete die
 * öffentliche Seite jedem, der eine E-Mail-Adresse kennt, ob dahinter ein
 * bezahlter Vertrag steckt.
 */
export interface WiderrufsBeleg {
  referenz: string;
  eingegangenAm: string;
  erklaerung: string;
  name: string;
  email: string;
  /** Nur bei eingeloggtem Absender: der Vertrag, der auf der Seite stand. */
  vertragBezeichnung: string | null;
  vertragAngabe: string | null;
  bestaetigungEmail: string;
  /** Ging die Eingangsbestätigung an `bestaetigungEmail` raus? */
  bestaetigungVersendet: boolean;
}

/** Die Zeilen „Inhalt deines Widerrufs" — Seite und Mail zeigen dieselben. */
export function belegZeilen(beleg: WiderrufsBeleg): [string, string][] {
  const e = formatEingang(beleg.eingegangenAm);
  return [
    ["Eingangsnummer", beleg.referenz],
    ["Eingegangen am", e.komplett],
    ["Erklärung", beleg.erklaerung],
    ["Name", beleg.name],
    ["E-Mail-Adresse des Kontos bzw. beim Kauf", beleg.email],
    ...(beleg.vertragBezeichnung ? ([["Vertrag", beleg.vertragBezeichnung]] as [string, string][]) : []),
    ["Angaben zum Vertrag", beleg.vertragAngabe ?? "—"],
    ["Eingangsbestätigung an", beleg.bestaetigungEmail],
  ];
}

/**
 * „Wie es weitergeht" — derselbe Text auf der Seite und in der Mail.
 *
 * Verspricht nichts, was erst der Betreiber entscheidet (Höhe einer
 * Erstattung, Wertersatz, Ende des Zugangs), und hält auch nichts zurück:
 * kein Halteangebot, keine Rückfrage, kein „Bist du sicher?".
 */
export function weiterText(): string {
  return (
    "Wir bearbeiten deinen Widerruf und melden uns per E-Mail bei dir — zum Ende deines Zugangs und zu " +
    "bereits geleisteten Zahlungen. Was mit ihnen geschieht, richtet sich nach der Widerrufsbelehrung; eine " +
    "Rückzahlung erhältst du über das Zahlungsmittel, mit dem du bezahlt hast. Für die Frist zählt der oben " +
    "genannte Zeitpunkt, zu dem du den Widerruf abgeschickt hast."
  );
}

/** Tarifnamen wie im Konto (`components/billing/format.ts`). */
export const PLAN_LABEL: Record<string, string> = {
  monthly: "Mitgliedschaft · Monatlich",
  quarterly: "Mitgliedschaft · Vierteljährlich",
  yearly: "Mitgliedschaft · Jährlich",
  lifetime: "Lifetime",
  ht_1on1: "1:1-Mentoring",
};
