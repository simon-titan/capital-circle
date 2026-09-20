import type { UmzugStufe } from "@/lib/whop-umzug/stand";

/**
 * Die Farben des Umzugs-Hinweises, einmal für Band und Dashboard-Karte.
 *
 * Getrennt von beiden Komponenten, damit die Abstufung nach Dringlichkeit an
 * einer Stelle steht: Stünde sie zweimal, sähe der Hinweis auf dem Dashboard
 * irgendwann anders aus als der eine Klick weiter.
 *
 * Rot (`--cc-danger`) trägt nur die letzte Stufe. DESIGN.md erlaubt Rot für
 * Verlust und Überfälligkeit, und das ist ein beendeter Zugang; solange er
 * noch läuft, bleibt der Hinweis in Gold. Ein zweiter Akzentton kommt nicht
 * dazu (The Champagne-on-Graphite Rule).
 */
export interface UmzugTon {
  /** Kante des Bands. */
  rand: string;
  /** Fläche des Bands. */
  flaeche: string;
  /** Punkt vor der Fristzeile. */
  punkt: string;
  /** Schrift der Fristzeile bzw. des Kennzeichens auf der Karte. */
  frist: string;
}

export const UMZUG_TON: Record<UmzugStufe, UmzugTon> = {
  ruhig: {
    rand: "var(--cc-line-strong)",
    flaeche: "rgba(255, 255, 255, 0.02)",
    punkt: "var(--cc-gold)",
    frist: "var(--cc-text-2)",
  },
  dringend: {
    rand: "var(--cc-gold-line)",
    flaeche: "var(--cc-gold-wash)",
    punkt: "var(--cc-gold-light)",
    frist: "var(--cc-gold-light)",
  },
  beendet: {
    rand: "rgba(248, 113, 113, 0.45)",
    flaeche: "rgba(248, 113, 113, 0.07)",
    punkt: "var(--cc-danger)",
    frist: "var(--cc-danger)",
  },
};
