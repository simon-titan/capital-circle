import { TEAM_POSTFACH } from "@/config/team";
import { daysFromToday } from "@/lib/dashboard-time";

/**
 * Der Stand eines Whop-Umzüglers, wie ihn die Plattform selbst anzeigt.
 *
 * ── Warum diese Datei getrennt von `kreis.ts` und `ablauf.ts` steht ─────────
 *
 * Die beiden Nachbarn laufen ausschliesslich auf dem Server: `kreis.ts` zieht
 * den Service-Client, `ablauf.ts` schreibt. Was hier steht, muss dagegen auch
 * im Browser laufen, denn Hinweisband und Dashboard-Karte entscheiden dort,
 * ob sie erscheinen. Deshalb hat diese Datei **keine Abhängigkeit auf Supabase
 * und keine auf `config/whop-umzug.ts`** — letzteres zöge die komplette
 * Verkaufsseiten-Konfiguration samt Kampagnentexten in das Plattform-Bundle.
 *
 * Die gemeinsame Sprache liegt trotzdem hier und nicht dreimal verteilt:
 * `ZAHLENDE_STATI`, `EIGENE_STUFEN` und `tageBis` werden von `kreis.ts` und
 * `ablauf.ts` von hier importiert. Wer „zahlt bei uns" umdefiniert, ändert
 * damit Versand, Nachtlauf und Anzeige in einem Zug. Genau das war vorher
 * nicht so: dieselbe Status-Liste stand in beiden Dateien als Kopie.
 */

/** Abos, die als „zahlt bei uns" gelten. Alles andere bringt kein Geld. */
export const ZAHLENDE_STATI: ReadonlySet<string> = new Set(["active", "trialing", "past_due"]);

/** Stufen, die für sich schon Zugang bedeuten (Lifetime legt kein Abo an). */
export const EIGENE_STUFEN: ReadonlySet<string> = new Set([
  "monthly",
  "quarterly",
  "yearly",
  "lifetime",
  "ht_1on1",
]);

/**
 * Ab wie vielen Tagen Restlaufzeit der Ton deutlicher wird.
 *
 * Sieben statt der fünf aus `ERINNERUNG_VORLAUF_TAGE`: Die Mail ist ein
 * einmaliges Ereignis und darf deshalb spät kommen, das Band steht auf jeder
 * Seite. Es soll zwei Tage **vor** der Erinnerungsmail lauter werden, damit
 * niemand die Mail als erste Warnung erlebt.
 */
export const DRINGEND_AB_TAGE = 7;

/** Wohin der Knopf führt. Eine Stelle, damit Band und Karte nie auseinanderlaufen. */
export const UMZUG_CTA_HREF = "/einstellungen/abonnement";

/** Ganze Tage von jetzt bis zum Zeitpunkt. Negativ heisst: schon vorbei. */
export function tageBis(iso: string | null, jetzt = Date.now()): number | null {
  if (!iso) return null;
  const ziel = new Date(iso).getTime();
  if (Number.isNaN(ziel)) return null;
  return Math.ceil((ziel - jetzt) / 86_400_000);
}

/** Ein Datum, wie es im Band steht. Immer deutsche Zeit. */
export function datumLangDe(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Die drei Tonlagen des Hinweises. */
export type UmzugStufe = "ruhig" | "dringend" | "beendet";

export interface UmzugStand {
  stufe: UmzugStufe;
  /** Ende des bei Whop bezahlten Zeitraums (`profiles.access_until`). */
  zugangBis: string;
  /** Kalendertage bis dahin (Europe/Berlin). 0 = heute, negativ = vorbei. */
  tageRest: number;
  /** „04. Oktober 2026" */
  datum: string;
}

/** Was die Anzeige über das Konto wissen muss. Alles davon steht im Profil. */
export interface UmzugProfil {
  whopUmzugAm: string | null;
  accessUntil: string | null;
  isPaid: boolean;
  membershipTier: string | null;
  /** Status des jüngsten Abos aus `subscriptions`, `null` = keins vorhanden. */
  aboStatus: string | null;
}

/**
 * Hat diese Person bei uns abgeschlossen?
 *
 * Doppelt geprüft, mit derselben Begründung wie in `lib/whop-umzug/ablauf.ts`:
 * Ein Lifetime-Kauf legt kein Abo an, und ein Abo, dessen Webhook noch
 * unterwegs ist, hat die Stufe noch nicht gesetzt. Für die Anzeige zählt
 * besonders die zweite Hälfte: Wer gerade eben gekauft hat, darf das Band
 * nicht noch einmal sehen, auch nicht für eine Minute.
 */
export function hatBeiUnsAbgeschlossen(p: {
  membershipTier: string | null;
  aboStatus: string | null;
}): boolean {
  if (p.aboStatus && ZAHLENDE_STATI.has(p.aboStatus)) return true;
  return EIGENE_STUFEN.has(p.membershipTier ?? "free");
}

/**
 * Der Stand für Band und Karte, oder `null`, wenn nichts anzuzeigen ist.
 *
 * Die Reihenfolge der Ausschlüsse ist der Inhalt der Funktion:
 *
 *   1. **Nicht aus dem Umzug, kein Hinweis.** `whop_umzug_am` ist das einzige
 *      Merkmal (Migration 100), kein geratenes Muster aus Stufe und Datum.
 *   2. **Abgeschlossen, kein Hinweis.** Sonst erzählte das Band jemandem, sein
 *      Zugang ende, der gerade bezahlt hat.
 *   3. **Ohne Datum kein Hinweis.** Der ganze Text besteht aus dem Stichtag;
 *      ohne `access_until` gibt es nichts zu sagen. Dieselbe Regel wie in
 *      `faelligeStufe()` für den Versand.
 *
 * Danach entscheidet die Restlaufzeit. Kalendertage, nicht 24-Stunden-Blöcke:
 * Wer am Abend liest „endet heute", meint den Kalendertag. Der Übergang nach
 * `beendet` hängt dagegen am echten Zeitpunkt bzw. an `is_paid` und nicht am
 * Kalender, denn das ist der Zustand, den der Nachtlauf herstellt.
 */
export function berechneUmzugStand(p: UmzugProfil, jetzt: Date = new Date()): UmzugStand | null {
  if (!p.whopUmzugAm) return null;
  if (hatBeiUnsAbgeschlossen(p)) return null;
  if (!p.accessUntil) return null;

  const ziel = new Date(p.accessUntil);
  if (Number.isNaN(ziel.getTime())) return null;

  const tageRest = daysFromToday(ziel, jetzt);
  const datum = datumLangDe(p.accessUntil);
  const basis = { zugangBis: p.accessUntil, tageRest, datum };

  // Zugang weg oder Zeitpunkt vorbei: Das Band zeigt ab hier den Weg zurück.
  if (!p.isPaid || ziel.getTime() <= jetzt.getTime()) return { ...basis, stufe: "beendet" };
  if (tageRest <= DRINGEND_AB_TAGE) return { ...basis, stufe: "dringend" };
  return { ...basis, stufe: "ruhig" };
}

/** Der fertige Wortlaut. Band und Karte lesen denselben. */
export interface UmzugAnzeige {
  stufe: UmzugStufe;
  /** Blickfang über dem Satz: „Noch 12 Tage", „Endet morgen", „Zugang ruht". */
  frist: string;
  /** Der Satz mit dem Stichtag. */
  titel: string;
  /** Was danach passiert, in zwei bis drei Sätzen. */
  text: string;
  /** Beschriftung des Knopfes. */
  cta: string;
  /** Die Antwort auf „Warum sehe ich das?". */
  erklaerung: string;
}

/**
 * Wortlaut je Stufe.
 *
 * Das Band nennt den Umzug nur so weit, wie es für die Handlung nötig ist; die
 * Vorgeschichte (Whop kündigen, keine Zahlungsmethode bei uns) steht in der
 * Erklärung, die sich auf Wunsch aufklappt. Ein Band, das die ganze Geschichte
 * erzählt, liest niemand zu Ende.
 */
export function umzugAnzeige(stand: UmzugStand): UmzugAnzeige {
  const { datum, tageRest } = stand;
  const erklaerung =
    `Du bist im September 2026 mit uns von Whop auf diese Plattform umgezogen. Den Zeitraum, den du bei ` +
    `Whop bezahlt hast, haben wir übernommen, er endet am ${datum}. Ein Abo oder eine Zahlungsmethode liegt ` +
    `bei uns nicht vor, dein Whop-Abo läuft hier nicht weiter. Kündige es bitte selbst bei Whop, sonst bucht ` +
    `Whop am Verlängerungstag erneut ab. Fragen beantworten wir unter ${TEAM_POSTFACH}.`;

  if (stand.stufe === "beendet") {
    return {
      stufe: "beendet",
      frist: "Zugang ruht",
      titel:
        tageRest <= 0
          ? `Dein Zugang aus dem Whop-Umzug ist am ${datum} abgelaufen.`
          : "Dein Zugang aus dem Whop-Umzug ruht zurzeit.",
      text:
        "Institut, Analysen, Live-Sessions und die Mitgliederkanäle sind zu. Dein Konto und dein Fortschritt " +
        "sind gespeichert, ein Paket bei uns schaltet alles wieder frei.",
      cta: "Zugang wieder freischalten",
      erklaerung,
    };
  }

  if (stand.stufe === "dringend") {
    const frist = tageRest <= 0 ? "Endet heute" : tageRest === 1 ? "Endet morgen" : `Nur noch ${tageRest} Tage`;
    const titel =
      tageRest <= 0
        ? `Dein Zugang endet heute, am ${datum}.`
        : tageRest === 1
          ? `Dein Zugang endet morgen, am ${datum}.`
          : `Dein Zugang endet am ${datum}.`;
    return {
      stufe: "dringend",
      frist,
      titel,
      text:
        "Er stammt aus dem Umzug von Whop, ein Abo liegt bei uns nicht vor. Ohne ein Paket ruhen danach " +
        "Institut, Analysen, Live-Sessions und die Mitgliederkanäle. Dein Konto und dein Fortschritt bleiben " +
        "gespeichert.",
      cta: "Mitgliedschaft abschließen",
      erklaerung,
    };
  }

  return {
    stufe: "ruhig",
    frist: `Noch ${tageRest} Tage`,
    titel: `Dein Zugang läuft bis zum ${datum}.`,
    text:
      "Er stammt aus dem Umzug von Whop und endet an diesem Tag. Eine Zahlungsmethode liegt bei uns nicht vor, " +
      "such dir also in Ruhe ein Paket aus. Dein Fortschritt bleibt dabei erhalten.",
    cta: "Mitgliedschaft abschließen",
    erklaerung,
  };
}
