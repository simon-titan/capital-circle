/**
 * Kündigungsbutton (§ 312k BGB) — Typen, Beschriftungen und Formate, die
 * Formular, API-Route, Mails und Admin-Liste gemeinsam brauchen.
 *
 * Bewusst ohne Server-Importe: Das Formular (Client-Komponente) zieht diese
 * Datei ebenfalls. Was hier steht, sieht der Kunde auf der Bestätigungsseite
 * und in der Mail — beide müssen dieselben Worte benutzen, sonst bestätigt die
 * Mail etwas anderes als die Seite.
 */

/**
 * Betreiber-Postfach für Kündigungen: Empfänger der Benachrichtigung,
 * Reply-To der Bestätigungsmail und Kontaktadresse auf der Seite.
 *
 * Vorläufig als Konstante hier. Parallel entsteht `config/legal.ts` mit den
 * Impressumsangaben — beim Zusammenführen gehört die Adresse dorthin, damit
 * Impressum, Rechtstexte und dieser Weg aus einer Quelle lesen.
 */
export const BETREIBER_EMAIL = "contact@capitalcircletrading.com";

export type KuendigungsArt = "ordentlich" | "ausserordentlich";
export type ZeitpunktArt = "naechstmoeglich" | "datum";

export type KuendigungsStatus = "eingegangen" | "ausgefuehrt" | "manuell_pruefen" | "kein_vertrag" | "erledigt";

export const ART_LABEL: Record<KuendigungsArt, string> = {
  ordentlich: "Ordentliche Kündigung",
  ausserordentlich: "Außerordentliche Kündigung (aus wichtigem Grund)",
};

export const STATUS_LABEL: Record<KuendigungsStatus, string> = {
  eingegangen: "Eingegangen",
  ausgefuehrt: "Ausgeführt",
  manuell_pruefen: "Manuell prüfen",
  kein_vertrag: "Kein Vertrag gefunden",
  erledigt: "Erledigt",
};

/** Tarifnamen wie in `components/billing/format.ts` — dieselben Worte wie im Konto. */
export const PLAN_LABEL: Record<string, string> = {
  monthly: "Mitgliedschaft · Monatlich",
  quarterly: "Mitgliedschaft · Vierteljährlich",
  yearly: "Mitgliedschaft · Jährlich",
  lifetime: "Lifetime",
  ht_1on1: "1:1-Mentoring",
};

/** Tarif im Satz („Wir haben deine monatliche Mitgliedschaft gekündigt"). */
const PLAN_IM_SATZ: Record<string, string> = {
  monthly: "monatliche Mitgliedschaft",
  quarterly: "vierteljährliche Mitgliedschaft",
  yearly: "jährliche Mitgliedschaft",
};

/** Grenzen der Freitextfelder — Formular und Route prüfen gegen dieselben Werte. */
export const GRENZEN = {
  nameMin: 2,
  nameMax: 120,
  emailMax: 254,
  grundMin: 10,
  grundMax: 2000,
  vertragMax: 200,
} as const;

/**
 * Bewusst enger als RFC 5322: keine Kommas, Klammern, spitzen Klammern oder
 * Anführungszeichen. Solche Adressen sind in der Praxis nie echt, würden aber
 * Mail-Header und PostgREST-Filter unnötig kompliziert machen.
 */
const EMAIL_MUSTER = /^[^\s@,;<>()"]+@[^\s@,;<>()"]+\.[^\s@,;<>()"]+$/;

export function istGueltigeEmail(wert: string): boolean {
  return wert.length <= GRENZEN.emailMax && EMAIL_MUSTER.test(wert);
}

/** Heutiges Datum in Deutschland als `YYYY-MM-DD` — Untergrenze für den Wunschtermin. */
export function heuteBerlin(jetzt: Date = new Date()): string {
  // `sv-SE` formatiert ISO-artig (2026-09-19), die Zeitzone macht daraus den deutschen Kalendertag.
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(jetzt);
}

/** ISO-Zeitpunkt → Kalendertag in Deutschland (`YYYY-MM-DD`). */
export function tagBerlin(iso: string): string {
  return heuteBerlin(new Date(iso));
}

/**
 * Eingangszeitpunkt so, wie er dem Kunden genannt wird: deutsches Datum,
 * Uhrzeit mit Sekunden und Zeitzone (MEZ/MESZ). Der Server läuft in UTC —
 * ohne feste Zeitzone stünde in der Mail eine Uhrzeit, die zwei Stunden
 * neben der auf der Seite liegt.
 */
export function formatEingang(iso: string): { datum: string; uhrzeit: string; komplett: string } {
  const d = new Date(iso);
  const datum = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
  const zeitTeile = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).formatToParts(d);
  const zone = zeitTeile.find((t) => t.type === "timeZoneName")?.value ?? "";
  const uhr = zeitTeile
    .filter((t) => t.type === "hour" || t.type === "minute" || t.type === "second" || t.type === "literal")
    .map((t) => t.value)
    .join("")
    .replace(/[\s,]+$/, "")
    .trim();
  const uhrzeit = `${uhr} Uhr${zone ? ` (${zone})` : ""}`;
  return { datum, uhrzeit, komplett: `${datum} um ${uhrzeit}` };
}

/** Kalendertag (`YYYY-MM-DD` oder ISO) → „30. September 2026". */
export function formatTag(wert: string | null): string {
  if (!wert) return "—";
  // Reines Datum als Mittag UTC lesen, damit keine Zeitzone den Tag verschiebt.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(wert) ? new Date(`${wert}T12:00:00Z`) : new Date(wert);
  if (Number.isNaN(d.getTime())) return wert;
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Kurze, vorlesbare Eingangsnummer aus der UUID (`K-3F9A2C1B`). */
export function referenzAus(id: string): string {
  return `K-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/** Was mit der Kündigung passiert ist — Grundlage für Seite und Mail. */
export type KuendigungsErgebnis =
  /** Bei Stripe zum Periodenende gekündigt (oder war es schon). */
  | { art: "ausgefuehrt"; plan: string | null; wirksamZum: string; warBereitsGekuendigt: boolean }
  /** Wird von Hand bearbeitet; der Kunde bekommt den Beendigungszeitpunkt gesondert. */
  | { art: "manuell_pruefen"; plan: string | null }
  /** Zur E-Mail gibt es kein laufendes Abo. */
  | { art: "kein_vertrag" }
  /**
   * Neutral: Eingang bestätigt, aber ohne Auskunft über Konto und Vertrag.
   * Für alle, die nicht nachweislich Inhaber des Kontos sind (nicht
   * eingeloggt, Bestätigung an eine fremde Adresse) — sonst verriete die
   * Seite jedem, der eine E-Mail-Adresse kennt, ob dahinter ein bezahltes Abo
   * steckt, welcher Tarif und bis wann. Die Details gehen an die Konto-Adresse.
   */
  | { art: "eingegangen" };

/** Tarif aus dem Ergebnis, falls es einen nennt. */
export function planVon(ergebnis: KuendigungsErgebnis): string | null {
  return ergebnis.art === "ausgefuehrt" || ergebnis.art === "manuell_pruefen" ? ergebnis.plan : null;
}

/**
 * Der Beleg, den die Route zurückgibt und die Bestätigungsseite anzeigt.
 * Deckt § 312k Abs. 4 BGB ab: Inhalt der Erklärung, Datum und Uhrzeit des
 * Zugangs, Zeitpunkt der Beendigung.
 */
export interface KuendigungsBeleg {
  referenz: string;
  eingegangenAm: string;
  art: KuendigungsArt;
  grund: string | null;
  name: string;
  email: string;
  bestaetigungEmail: string;
  vertragAngabe: string | null;
  /** `YYYY-MM-DD` oder null = nächstmöglicher Zeitpunkt. */
  zeitpunktWunsch: string | null;
  ergebnis: KuendigungsErgebnis;
  /** Ging die Bestätigungsmail an `bestaetigungEmail` raus? */
  bestaetigungVersendet: boolean;
}

/** Gewünschter Zeitpunkt in Worten. */
export function zeitpunktText(zeitpunktWunsch: string | null): string {
  return zeitpunktWunsch ? `Zum ${formatTag(zeitpunktWunsch)}` : "Zum nächstmöglichen Zeitpunkt";
}

/**
 * „Was passiert jetzt?" in einem Absatz — derselbe Text auf der Seite und in
 * der Mail. Nennt immer den Zeitpunkt, zu dem der Vertrag enden soll
 * (§ 312k Abs. 4 BGB), auch wenn er noch von Hand bestätigt werden muss.
 */
export function ergebnisText(beleg: Pick<KuendigungsBeleg, "ergebnis" | "zeitpunktWunsch" | "art">): string {
  const e = beleg.ergebnis;
  if (e.art === "ausgefuehrt") {
    const tarif = (e.plan && PLAN_IM_SATZ[e.plan]) || "Mitgliedschaft";
    if (e.warBereitsGekuendigt) {
      return (
        `Deine ${tarif} war bereits gekündigt und endet am ${formatTag(e.wirksamZum)}. ` +
        "Bis dahin bleibt dein Zugang vollständig bestehen, danach wird nichts mehr abgebucht."
      );
    }
    // Wunschtermin vor dem Periodenende: Die ordentliche Kündigung greift
    // trotzdem erst zum Ende der bezahlten Periode — das muss dastehen, sonst
    // liest der Kunde „30. September" und sieht in der Mail den 14. Oktober.
    const frueherGewuenscht =
      beleg.zeitpunktWunsch !== null && beleg.zeitpunktWunsch < tagBerlin(e.wirksamZum)
        ? ` Dein Wunschtermin (${formatTag(beleg.zeitpunktWunsch)}) liegt vor dem Ende der laufenden, bereits ` +
          "bezahlten Abrechnungsperiode; eine ordentliche Kündigung wirkt zu deren Ende."
        : "";
    return (
      `Wir haben deine ${tarif} zum Ende der laufenden Abrechnungsperiode gekündigt. ` +
      `Der Vertrag endet am ${formatTag(e.wirksamZum)}. Bis dahin bleibt dein Zugang vollständig bestehen, ` +
      `danach wird nichts mehr abgebucht.${frueherGewuenscht}`
    );
  }
  if (e.art === "manuell_pruefen") {
    const wann =
      beleg.art === "ausserordentlich"
        ? "Eine außerordentliche Kündigung prüfen wir immer von Hand."
        : "Wir bearbeiten deine Kündigung von Hand.";
    const wunsch = beleg.zeitpunktWunsch
      ? `zum ${formatTag(beleg.zeitpunktWunsch)}`
      : "zum nächstmöglichen Zeitpunkt";
    return (
      `${wann} Dein Vertrag soll ${wunsch} enden. ` +
      "Den genauen Zeitpunkt, zu dem er endet, bestätigen wir dir gesondert per E-Mail."
    );
  }
  if (e.art === "eingegangen") {
    const wunsch = beleg.zeitpunktWunsch
      ? `zum ${formatTag(beleg.zeitpunktWunsch)}`
      : "zum nächstmöglichen Zeitpunkt";
    return (
      `Dein Vertrag soll ${wunsch} enden. Wir ordnen die Kündigung dem Vertrag zu, der zu der angegebenen ` +
      "E-Mail-Adresse gehört, und schicken die Bestätigung mit dem Zeitpunkt, zu dem er endet, an die " +
      "E-Mail-Adresse des Kontos."
    );
  }
  return (
    "Zu dieser E-Mail-Adresse haben wir kein laufendes Abonnement gefunden. Deine Kündigung ist trotzdem " +
    "eingegangen: Wir sehen sie uns an und melden uns, falls wir einen Vertrag zuordnen können — zum Beispiel, " +
    "wenn du mit einer anderen E-Mail-Adresse bezahlt hast."
  );
}
