/**
 * Die Zeitfarbe für alles, was im Dashboard an einem Termin hängt — einmal
 * abgeleitet, damit „Heute live“ und „Nächste Termine“ nicht auseinanderlaufen.
 *
 * Grün heißt: läuft gerade. Bernstein heißt: gleich. Alles Weitere bleibt ruhig
 * in Gold bzw. Grau. Die Wärme ist der Glut-Ton der Streak-Flamme und laut
 * DESIGN.md die einzige erlaubte Ausnahme neben Grün/Rot — ein zweites Gelb
 * gäbe es damit nicht, sondern dieselbe Glut an einer zweiten Stelle.
 */

/**
 * Drei Stunden vor dem Start wird ein Termin warm.
 *
 * Es ist dieselbe Schwelle, ab der die Karte den Tag durch den Countdown
 * ersetzt („In 28 Minuten“ statt „Heute“): Näher dran ist ein Termin etwas,
 * worum man den Nachmittag herumbaut, davor nur eine Zeile im Kalender. Zwei
 * getrennte Grenzen für Wortlaut und Farbe würden genau das auseinanderziehen,
 * was zusammengehört — deshalb springen beide an dieser Konstante.
 */
export const BALD_SCHWELLE_MINUTEN = 180;

/** Glut-Ton der Streak-Flamme (DESIGN.md → Semantic). */
export const GLUT = "#ffb454";

/** Weiche Glut für Flächen und Ringe — dieselbe Familie, nicht deckend. */
export const GLUT_WEICH = "rgba(255, 140, 60, 0.55)";

/**
 * Rohwerte für die Zeitfarbe. Beide Zahlen rechnet der Server beim Rendern
 * aus (`app/(platform)/dashboard/page.tsx`) und schickt sie fertig mit: Die
 * Karten sind Client-Komponenten, und ein `Date.now()` in ihnen liefert beim
 * ersten Render garantiert eine andere Minute als der Server — genau das ist
 * ein Hydration-Mismatch.
 */
export type ZeitBezug = {
  /** Der Termin hat begonnen und ist noch nicht vorbei. */
  laeuft: boolean;
  /** Minuten bis zum Start; null, sobald er läuft. */
  minutesUntilStart: number | null;
};

export type ZeitTon = "live" | "bald" | "ruhig";

export function zeitTon({ laeuft, minutesUntilStart }: ZeitBezug): ZeitTon {
  if (laeuft) return "live";
  if (minutesUntilStart != null && minutesUntilStart <= BALD_SCHWELLE_MINUTEN) return "bald";
  return "ruhig";
}

/**
 * Farbe zum Ton. Was „ruhig“ heißt, entscheidet die Karte selbst — im Live-Punkt
 * ist das Gold hell, in der Terminliste die Farbe des Events aus dem Admin.
 */
export function zeitTonFarbe(ton: ZeitTon, ruhig: string): string {
  if (ton === "live") return "var(--cc-success)";
  if (ton === "bald") return GLUT;
  return ruhig;
}
