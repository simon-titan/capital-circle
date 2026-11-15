/**
 * Ansicht für Free-Mitglieder in der Plattform (Emres Mockup vom 08.11.2026):
 * eigene Seitenleiste (FREE / PREMIUM), eigenes Dashboard und der Trading
 * Blueprint. Free = Konto ohne Inhaltszugang (`hatInhaltsZugang` false).
 * Zahlende sehen weiter ihre gewohnte Navigation und ihr Dashboard.
 *
 * Alle sichtbaren Texte stehen hier; die Logik in den Komponenten.
 */

export const BLUEPRINT_PFAD = "/trading-blueprint";
export const BLUEPRINT_DOWNLOAD_PFAD = "/api/trading-blueprint/download";
export const VITRINE_PFAD = "/ergebnisse";

/* ─── Seitenleiste ──────────────────────────────────────────────────────── */

export const freeNavTexte = {
  kontoTitel: "Free Member",
  kontoText: "Kostenloser Zugriff",
  /** Countdown unter der Konto-Kachel (`ZugangCountdown`, Feedback 14.11.2026). */
  countdownTitel: "Dein Zugang endet in",
  countdownEnde: (datum: string) => `am ${datum}`,
  gruppeFree: "Free",
  gruppePremium: "Premium",
  gesperrt: "Nur für Mitglieder",
} as const;

/* ─── Dashboard ─────────────────────────────────────────────────────────── */

export const freeDashboard = {
  untertitel: "Dein persönlicher Lernbereich.",
  badge: "Free Member",
  ausbildung: {
    label: "Deine Ausbildung",
    titel: "Kostenloses Trading-Training",
    text: "Setze deine Ausbildung dort fort, wo du aufgehört hast.",
    textStart: "Starte mit der ersten Lektion und lege den Grundstein.",
    textFertig: "Du hast alle Lektionen abgeschlossen. Stark.",
    lektionen: (gesehen: number, gesamt: number) => `${gesehen} von ${gesamt} Lektionen`,
    alsNaechstes: "Als nächstes",
    lektion: (n: number) => `Lektion ${n}`,
    fortsetzen: "Ausbildung fortsetzen",
    starten: "Ausbildung starten",
    ansehen: "Training ansehen",
    allesFertig: "Alle Lektionen abgeschlossen",
    /** Bewerbung angenommen, Zugangszeile fehlt noch. */
    wartet: "Deine Freischaltung wird gerade vorbereitet. Sobald sie steht, startest du hier.",
    zugangBeendet: "Zugang beendet",
  },
  blueprint: {
    label: "Dein Trading Blueprint",
    titel: "Entwickle deinen eigenen Tradingplan.",
    text: "Eine praktische Vorlage, die dich bei der Entwicklung eines strukturierten Handelsprozesses unterstützt.",
    herunterladen: "Blueprint herunterladen",
    inKuerze: "Erscheint in Kürze",
    video: "Videoanleitung ansehen",
    /** Gesperrt bis zum Abschluss des kostenlosen Kurses (Feedback 14.11.2026). */
    gesperrt: "Nach dem kostenlosen Kurs freigeschaltet",
    /** Kompakte Karte unter der Videoliste: Erklärung statt Beschreibung, kurzer Knopf. */
    gesperrtErklaerung: "Wird freigeschaltet, sobald du alle Lektionen des kostenlosen Kurses angesehen hast.",
    gesperrtKurz: "Noch gesperrt",
  },
  lernweg: {
    label: "Dein Lernweg",
    stand: (gesehen: number, gesamt: number) => `${gesehen} von ${gesamt} Lektionen abgeschlossen`,
    optional: "Optional",
    gesperrt: "Noch gesperrt",
  },
  vitrine: {
    titel: "Capital Circle Vitrine",
    text: "Entdecke Erfahrungen, Ergebnisse und Einblicke aus unserer Community.",
  },
} as const;

/* ─── Trading Blueprint ─────────────────────────────────────────────────── */

export const blueprintTexte = {
  meta: "Trading Blueprint · Capital Circle",
  titel: "Trading Blueprint",
  untertitel: "Entwickle deinen eigenen Tradingplan.",
  beschreibung:
    "Eine praktische Vorlage, die dich bei der Entwicklung eines strukturierten Handelsprozesses unterstützt: Markt, Setup, Einstieg, Risiko und Nachbereitung, Schritt für Schritt auf deinen Alltag zugeschnitten.",
  punkte: [
    "Deine Regeln für Einstieg, Ausstieg und Risiko an einer Stelle",
    "Ein fester Ablauf vor, während und nach dem Handelstag",
    "Zum Ausdrucken oder digital Ausfüllen",
  ],
  herunterladen: "Blueprint herunterladen",
  inKuerze: "Erscheint in Kürze",
  inKuerzeText: "Wir stellen den Blueprint gerade fertig. Sobald er bereitsteht, kannst du ihn hier herunterladen.",
  videoTitel: "Videoanleitung",
  videoText: "So füllst du den Blueprint aus und arbeitest im Alltag damit.",
  videoNichtVerfuegbar: "Die Videoanleitung ist gerade nicht verfügbar. Bitte versuch es später noch einmal.",
  dateiFehlt: "Der Blueprint ist gerade nicht verfügbar. Bitte versuch es später noch einmal.",
  /** Sperre bis zum Abschluss des kostenlosen Kurses (Feedback 14.11.2026). */
  gesperrtTitel: "Wird nach dem kostenlosen Kurs freigeschaltet",
  gesperrtText: "Schau dir zuerst alle Lektionen des kostenlosen Kurses an. Danach kannst du den Blueprint herunterladen und die Videoanleitung ansehen.",
  gesperrtStand: (gesehen: number, gesamt: number) => `${gesehen} von ${gesamt} Lektionen angesehen`,
  gesperrtKnopf: "Zum kostenlosen Kurs",
} as const;
