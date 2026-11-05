/**
 * Inhalte der Call-Funnel-Seite `/call` (Board von Emre, 17.10.2026).
 *
 * Eine Datei für alle Texte der Seite, wie bei `config/landing-membership.ts`:
 * Überschriften, Case Studies und Hinweise ändern sich, ohne dass sich das
 * Layout ändert — dafür soll niemand eine Komponente anfassen müssen.
 *
 * Aufbau der Seite (Reihenfolge hier = Reihenfolge dort):
 *   1. Hero mit VSL („Schritt 1 von 2")
 *   2. Strategie-Gespräch („Schritt 2 von 2"): Fragebogen und Calendly im Modal
 *   3. Case Studies
 *   4. Kundenergebnisse (belegte Auszahlungen aus `landing-membership.ts`)
 *   5. Abschluss mit demselben Knopf
 *
 * ── Schreibregeln für diese Datei ───────────────────────────────────────────
 *
 * - **Keine erfundenen Zahlen, keine Gewinnversprechen.** Was hier steht, muss
 *   sich belegen lassen. Beträge nennen nur die Case Studies und die
 *   Nachweis-Wand, und dort stehen sie neben dem Bild, das sie zeigt.
 * - Du-Ansprache, Deutsch. Der Coach heißt Emre; die Gespräche führt das
 *   Team (Closer), deshalb verspricht kein Text ein Gespräch „mit Emre".
 * - `{…}` in einem Text markiert ein Akzentwort: In Überschriften wird es
 *   Gold hell, in Case-Study-Titeln eine Zahl in Gold hell mit tabellarischen
 *   Ziffern (siehe `mitAkzent` in `components/landing/call/call-ui.tsx`).
 */

/* ─── Seite & Vorschau ──────────────────────────────────────────────────── */

export const meta = {
  title: "Kostenloses Strategie-Gespräch · Capital Circle",
  description:
    "Du kennst die Konzepte, aber dir fehlt ein klarer Prozess? Schau das Video und buch dein kostenloses Strategie-Gespräch mit dem Capital Circle Team.",
  shareTitle: "Kostenloses Strategie-Gespräch · Capital Circle",
  shareDescription:
    "Schau das Video und finde im kostenlosen Strategie-Gespräch heraus, was zwischen dir und konstanten Ergebnissen steht.",
  /** Vorschaubild für geteilte Links — dasselbe wie `/termin`; steht im Matcher von `proxy.ts` unter den Ausnahmen. */
  shareImage: "/termin-og.jpg",
  shareImageAlt: "Capital Circle: kostenloses Strategie-Gespräch",
} as const;

/** Hauptaktion — öffnet das Buchungs-Modal; steht unter dem Video, in Schritt 2 und am Ende der Seite. */
export const ctaLabel = "Kostenloses Strategie-Gespräch sichern";

/* ─── 1 Hero ────────────────────────────────────────────────────────────── */

export const hero = {
  /**
   * Laufzeile ganz oben. Nur Aussagen, die stimmen: Das Gespräch kostet
   * nichts, die Termine im Kalender sind begrenzt, die Auszahlungen sind
   * weiter unten belegt.
   */
  laufzeile: [
    "Begrenzte Termine pro Woche",
    "Kostenloses Strategie-Gespräch",
    "Unverbindlich",
    "1:1 per Video-Call",
    "Belegte Auszahlungen unserer Mitglieder",
    "Für Trader, die Konstanz statt Glückstreffer wollen",
  ],
  /** Knopf am Rand der Laufzeile (WCAG 2.2.2: Bewegtes muss sich anhalten lassen, auch per Touch). */
  laufzeileAnhalten: "Laufband anhalten",
  laufzeileFortsetzen: "Laufband fortsetzen",
  headline: "Du kennst die Konzepte. Dir fehlt der {Prozess}, der dich {konstant} macht.",
  subline:
    "Im kostenlosen Strategie-Gespräch schauen wir uns an, warum auf deine guten Phasen immer wieder schlechte folgen und welcher klare Ablauf aus Analyse, Entry, Risiko und Review das bei dir ändert.",
  /** Über dem Video. Ohne Video (`NEXT_PUBLIC_CALL_VIDEO_URL` leer) entfällt die Zeile samt Hinweis. */
  schritt: "Schritt 1 von 2: Video ansehen",
  /** Unter dem Video, über der Hauptaktion. */
  videoHinweis: "Am besten mit Ton und bis zum Ende. Danach weißt du genau, worum es im Gespräch geht.",
  /** Linktext hinter `garantie.kurz` (nur sichtbar, wenn die Garantie freigegeben ist). */
  garantieLink: "Garantiebedingungen",
} as const;

/* ─── 2 Strategie-Gespräch buchen ───────────────────────────────────────── */

export const buchung = {
  /** Nur mit Video — ohne Schritt 1 wäre „Schritt 2 von 2" eine Frage ohne Antwort. */
  schritt: "Schritt 2 von 2: Strategie-Gespräch buchen",
  headline: "Finde heraus, was zwischen dir und {konstanten Ergebnissen} steht.",
  text: "Sechs kurze Fragen, dann wählst du direkt deinen Termin. Dauert keine zwei Minuten und sorgt dafür, dass wir im Gespräch sofort bei deinem Trading sind statt beim Smalltalk.",
  /** „Im Gespräch klären wir …" — drei Punkte neben bzw. über der Karte. */
  punkteTitel: "Im Gespräch klären wir",
  punkte: [
    "wo dein Trading gerade steht, ehrlich und ohne Schönreden",
    "was dich bisher Konstanz kostet: Overtrading, Regelbrüche, Emotionen oder ein fehlender Prozess",
    "ob Capital Circle dich weiterbringt. Und wenn nicht, sagen wir dir das.",
  ],

  /** Texte im Buchungs-Modal (der Schlüssel heißt aus Gewohnheit noch `karte`). */
  karte: {
    /** Name des Dialogs für Screenreader. */
    modalTitel: "Kostenloses Strategie-Gespräch buchen",
    /** Kopfzeile des Modals je Schritt. */
    labelKontakt: "Deine Daten",
    labelFragen: "Kurze Einordnung",
    labelKalender: "Termin wählen",
    labelGebucht: "Gebucht",
    weiter: "Weiter",
    /** Letzte Frage: Der Klick lädt zugleich Calendly (Einwilligung, siehe `kalenderEinwilligung`). */
    abschicken: "Weiter zum Kalender",
    speichert: "Wird gespeichert …",
    zurueck: "← Zurück",

    /** Kontaktfelder: sichtbare Beschriftung, Fehler je Feld. */
    felder: {
      name: { label: "Name", placeholder: "Vor- und Nachname", fehler: "Bitte trag deinen Namen ein." },
      email: {
        label: "E-Mail-Adresse",
        placeholder: "du@beispiel.de",
        fehler: "Bitte prüf deine E-Mail-Adresse, an sie geht die Terminbestätigung.",
      },
      phone: {
        label: "Telefonnummer",
        placeholder: "+49 …",
        fehler: "Bitte trag deine Telefonnummer ein.",
        /** Warum wir sie brauchen — deckt sich mit der Datenschutzerklärung („um dich zu kontaktieren"). */
        hinweis: "Nur für dein Gespräch: Ändert sich etwas am Termin, erreichen wir dich so.",
      },
    },
    /**
     * Fragetexte nur für `/call`, Schlüssel = Fragen-id aus
     * `config/discord-funnel-questions.ts`. Die Antwortoptionen bleiben dort
     * (die API prüft gegen sie), `/termin` behält seine Texte.
     *
     * `budget`: „Wie viel bist du bereit **heute** zu investieren?" direkt nach
     * „kostenloses Gespräch" liest sich wie die Verkaufsfalle, die die Seite
     * gerade ausgeschlossen hat.
     */
    fragen: {
      budget: "Welches Budget könntest du für deine Trading-Ausbildung einplanen?",
    } as Record<string, string>,
    fehlerAuswahl: "Bitte wähle eine Option.",
    fehlerServer: "Deine Angaben konnten nicht gespeichert werden. Bitte versuch es noch einmal.",
    fehlerVerbindung: "Verbindungsfehler. Bitte versuch es noch einmal.",

    /**
     * Steht im letzten Frageschritt über „Weiter zum Kalender" und ersetzt dort
     * den Zwei-Klick-Platzhalter von `CalendlyZweiKlick`: Der Klick auf den
     * Knopf ist die Einwilligung. Die Datenschutzerklärung beschreibt genau
     * diesen Ablauf (Abschnitt „Terminbuchung mit Calendly").
     */
    kalenderEinwilligung:
      "Mit „Weiter zum Kalender“ lädst du den Terminkalender von Calendly (USA). Dabei gehen deine IP-Adresse, dein Vorname und deine E-Mail-Adresse an Calendly, und Calendly kann Cookies setzen.",
    kalenderTitel: "Fast geschafft. Wähl jetzt deinen Termin.",
    kalenderText: "Alle freien Termine stehen im Kalender. Die Bestätigung mit dem Link zum Gespräch kommt per E-Mail.",

    gebuchtTitel: "Dein Strategie-Gespräch ist gebucht.",
    /** Endet mit dem, was als Nächstes passiert, nicht mit einer Ermahnung. */
    gebuchtText:
      "Die Bestätigung mit dem Link zum Gespräch ist gleich in deinem Postfach. Passt der Termin doch nicht, kannst du ihn über die Mail verschieben. Wir freuen uns auf dich.",

    /** Knöpfe auf der Seite nach der Buchung (öffnen die Bestätigung). */
    gebuchtKnopf: "Dein Gespräch ist gebucht",
    schliessen: "Schließen",

    /** Ohne konfigurierte Calendly-URL (sollte nicht vorkommen, es gibt einen Rückfall). */
    keinKalender: "Die Terminbuchung ist gerade nicht verfügbar. Bitte versuch es später noch einmal.",
  },
} as const;

/* ─── 3 Case Studies ────────────────────────────────────────────────────── */

export interface CaseStudy {
  /** Was der Fall zeigt. `{…}` hebt eine Zahl hervor, z. B. „Zahlt sich {15.000$} aus". */
  titel: string;
  /** Vorname des Mitglieds (optional). */
  name?: string;
  /**
   * Video-Testimonial (HLS-Manifest oder MP4). Ist es gesetzt, wird die Karte
   * zur Videokarte und spielt per Klick im `GlassVideoPlayer` — mit Ton, also
   * ohne Autoplay.
   */
  videoUrl?: string;
  /** Standbild der Videokarte (z. B. Cloudflare-Stream-Thumbnail). */
  poster?: string;
  /** Bild-Nachweis für Karten ohne Video (öffnet sich groß per Klick). */
  bild?: string;
}

export const caseStudiesKopf = {
  eyebrow: "Case Studies",
  headline: "Trader, die ihren {Prozess} gefunden haben.",
  text: "Mitglieder, die mit unserer Methodik arbeiten. Klick auf eine Karte, um den Nachweis groß zu sehen.",
} as const;

/**
 * Die Video-Testimonials kommen später (Stand 17.10.2026). Bis dahin stehen
 * hier die vier Fälle aus `components/landing/CasesSection.tsx` mit denselben
 * Texten und Bildern. Ein leeres Array blendet die ganze Sektion aus.
 *
 * Neue Videokarte: `{ titel, name, videoUrl, poster }` — `bild` weglassen.
 */
export const caseStudies: CaseStudy[] = [
  { name: "Driton", titel: "Besteht seine erste Challenge in {3 Tagen}", bild: "/cases/driton.png" },
  { name: "Halil", titel: "Lässt sich {15.000$} auszahlen, mit unserer Trading-Methodik", bild: "/cases/halil.png" },
  { name: "Yücel", titel: "Lässt sich in 7 Tagen {7.000$} auszahlen", bild: "/cases/yuecel.png" },
  { name: "Dominik", titel: "Lässt sich {1.250$} auszahlen", bild: "/cases/dominik.png" },
];

/* ─── 4 Kundenergebnisse ────────────────────────────────────────────────── */

/**
 * Die Wand selbst kommt aus `auszahlungenCommunity` und `auszahlungenEmre` in
 * `config/landing-membership.ts` — dieselben Nachweise wie auf `/ergebnisse`.
 * Hier stehen nur die Texte drumherum. Bestandene Challenges stehen bewusst
 * nicht auf dieser Seite: Eine Kontogröße ist keine Auszahlung (siehe AGENTS.md,
 * Eintrag „Bestandene Challenges").
 */
export const ergebnisseKopf = {
  eyebrow: "Kundenergebnisse",
  headline: "Auszahlungen, die du {nachprüfen} kannst.",
  text: "Jeder Nachweis zeigt Geld, das geflossen ist: Überweisung, Payout-Mail oder Payout-Zertifikat. Klick auf einen Nachweis, um ihn groß zu sehen.",
  blockCommunity: {
    titel: "Aus der Community",
    hinweis: "Nachweise von Mitgliedern, geteilt im Discord. Unverändert, so wie sie dort gepostet wurden.",
  },
  blockEmre: {
    titel: "Emres Auszahlungen",
    hinweis: "Payout-Zertifikate von Apex Trader Funding und Lucid Trading, ausgestellt auf Emre Kopal.",
  },
  hinweis: "Ergebnisse nicht typisch · Individuelle Ergebnisse variieren · Trading birgt Verlustrisiken",
  alleLink: { label: "Alle Nachweise ansehen", href: "/ergebnisse" },
} as const;

/**
 * Auswahl für die Wand auf `/call`, nach Bildpfad — alle übrigen stehen auf
 * `/ergebnisse` (Link unter der Wand). Zwanzig Kacheln hintereinander ließen
 * sich nicht mehr lesen, nur noch scrollen.
 *
 * Community: sechs Belege, möglichst verschiedene Prop-Firmen. **Nicht** dabei
 * sind die Apex-Auszahlung über 15.000 $ und die Topstep-Auszahlung über
 * 1.250 €: Sie stehen schon als Case Study von Halil bzw. Dominik eine
 * Sektion höher. Emre: dieselben drei wie auf der Verkaufsseite
 * (`auszahlungenEmreLanding`).
 */
export const ergebnisseAuswahl = {
  community: [
    "/nachweise/member-tradingpit-2026-04-13.jpg",
    "/nachweise/member-topstep-2026-08-28.jpg",
    "/nachweise/member-lucid-2026-08-06.jpg",
    "/nachweise/member-tradingpit-2026-09-09.jpg",
    "/nachweise/member-iqcapital-2026-08-31.jpg",
    "/nachweise/member-lucid-2026-08-25.jpg",
  ],
} as const;

/* ─── 5 Abschluss ───────────────────────────────────────────────────────── */

export const abschluss = {
  pill: "Begrenzte Termine pro Woche",
  headline: "Das Strategie-Gespräch ist {kostenlos}.",
  text: "Du gehst mit einer klaren Einschätzung raus, wo dein Trading steht und was dein nächster Schritt ist. Egal, ob du danach mit uns arbeitest oder nicht.",
} as const;

/* ─── Fußzeile ──────────────────────────────────────────────────────────── */

export const fusszeile =
  "Mit dem Absenden deiner Angaben stimmst du unserer Datenschutzerklärung zu. Trading und der Handel mit Finanzinstrumenten sind mit erheblichen Verlustrisiken verbunden und können zum Totalverlust führen. Die gezeigten Ergebnisse sind nicht typisch, individuelle Ergebnisse variieren. Frühere Ergebnisse sind keine Garantie für zukünftige Gewinne. Capital Circle bietet Ausbildung, keine Anlageberatung und keine Signale.";
