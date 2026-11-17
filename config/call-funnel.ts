/**
 * Inhalte der Call-Funnel-Seite `/call` (Board von Emre, 17.10.2026).
 *
 * Eine Datei für alle Texte der Seite, wie bei `config/landing-membership.ts`:
 * Überschriften, Case Studies und Hinweise ändern sich, ohne dass sich das
 * Layout ändert — dafür soll niemand eine Komponente anfassen müssen.
 *
 * Aufbau der Seite nach Emres Feedback (08.11.2026):
 *   1. Hero: Headline, Unterzeile, VSL, Hauptaktion, „100 % kostenlos & unverbindlich"
 *   2. Brief „Ein persönliches Wort von Emre." (`emreBrief`)
 *   3. Member Wins: Case Studies, Auszahlungen (`ErgebnisseSection`), Bewertungen
 *   4. Abschluss mit demselben Knopf
 *
 * Die Sektion „Das Gespräch" (Schritt 2 von 2) ist raus. Jede Hauptaktion
 * öffnet dasselbe Buchungs-Modal mit Fragebogen und Calendly.
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
  title: "Kostenloses Analysegespräch · Capital Circle",
  description:
    "Du kennst die Konzepte, aber dir fehlt ein klarer Prozess? Schau das Video und buch dein kostenloses Analysegespräch mit dem Capital Circle Team.",
  shareTitle: "Kostenloses Analysegespräch · Capital Circle",
  shareDescription:
    "Schau das Video und finde im kostenlosen Analysegespräch heraus, was zwischen dir und konstanten Ergebnissen steht.",
  /** Vorschaubild für geteilte Links — dasselbe wie `/termin`; steht im Matcher von `proxy.ts` unter den Ausnahmen. */
  shareImage: "/termin-og.jpg",
  shareImageAlt: "Capital Circle: kostenloses Analysegespräch",
} as const;

/**
 * Das VSL („NEUES PHUNNEL VIDEO.mp4“, Emre 16.11.2026, 8:29 min, getauscht am
 * 17.11.2026; Vorgänger „main phunnel video .mp4“ `cc9b479e…` und davor
 * „1o1 landingpage.mp4“ `801c1831…`, beide noch in Stream) aus Cloudflare Stream,
 * **unsigniert** (öffentliche, statische Seite — ein Token liefe ab). Wie
 * `landingVideo` in `config/training.ts` fest hier statt nur als Umgebungs-
 * variable: So läuft es in jedem Deployment, auch in Vorschauen.
 * **Nur die Vorgabe:** Getauscht wird im Admin (Funnel- & Kursvideos → Funnel-Videos,
 * `lib/funnel-videos.ts`); die Auswahl dort hat Vorrang.
 */
export const callVideo = {
  uid: "d51192dbcaa0cde21ce09f773bc020b5",
  /** Standbild-Zeitpunkt für das Poster (Sekunden). */
  posterSekunde: 10,
} as const;

/** Hauptaktion — öffnet das Buchungs-Modal; steht unter dem Video, unter dem Brief und am Ende der Seite. */
export const ctaLabel = "Jetzt Analysegespräch anfragen";

/* ─── 1 Hero ────────────────────────────────────────────────────────────── */

export const hero = {
  /** Zeile unter jeder Hauptaktion und in der mobilen Aktionsleiste — nur Aussagen, die stimmen. */
  vertrauen: ["100 % kostenlos & unverbindlich"],
  /** Hauptaktion in der Kopfleiste (kurz, passt neben die Wortmarke). */
  ctaKurz: "Gespräch anfragen",
  headline: "Du investierst Zeit, Geld und Energie ins Trading. Doch die {Ergebnisse bleiben aus.}",
  subline:
    "Entwickle einen Handelsansatz, bei dem du genau weißt, wann du handelst, warum du handelst und wann du draußen bleibst.",
  /** Linktext hinter `garantie.kurz` (nur sichtbar, wenn die Garantie freigegeben ist). */
  garantieLink: "Garantiebedingungen",
} as const;

/* ─── 2 Brief von Emre ──────────────────────────────────────────────────── */

/**
 * „Ein persönliches Wort von Emre." — Wortlaut aus Emres Vorlage (Papier mit
 * Reißzwecke, 07.11.2026), als echter Text nachgebaut in
 * `components/landing/call/EmreBrief.tsx`. Jeder Absatz ist eine Liste von
 * Teilen; `fett: true` setzt einen Teil fett, genau an den Stellen der Vorlage.
 */
export type BriefTeil = { text: string; fett?: boolean };

export const emreBrief = {
  titel: "Ein persönliches Wort von Emre.",
  absaetze: [
    [
      { text: "Ich habe Jahre damit verbracht, die Märkte zu verstehen und meinen eigenen Handelsansatz zu entwickeln. Dabei habe ich eines gelernt: " },
      { text: "Eine Strategie allein bringt dich nicht weiter, wenn du nicht weißt, warum du handelst.", fett: true },
    ],
    [{ text: "Ich habe Capital Circle nicht gegründet, damit du meine Trades kopierst oder einfach nur weitere Videos konsumierst." }],
    [
      {
        text: "Ich möchte dir zeigen, wie ich Märkte analysiere, Entscheidungen treffe und Risiken kontrolliere. Gemeinsam arbeiten wir daran, einen klaren Handelsprozess zu entwickeln, den du eigenständig und immer wieder anwenden kannst.",
      },
    ],
    [
      {
        text: "Dabei geht es nicht darum, noch mehr Strategien zu sammeln. Es geht darum, deine Fehler zu erkennen, bessere Entscheidungen zu treffen und genau zu verstehen, was du am Markt tust.",
      },
    ],
    [
      {
        text: "Du sollst nicht länger auf den nächsten guten Trade hoffen. Du sollst wissen, worauf du wartest, wann du handelst und wann du bewusst nichts tust.",
      },
    ],
    [
      {
        text: "Ich werde dir keine schnellen Gewinne versprechen. Was du von mir bekommst, ist meine Erfahrung, ein klarer Ausbildungsweg und ehrliches, persönliches Feedback – auch dann, wenn es unbequem ist.",
      },
    ],
    [{ text: "Mein Ziel ist nicht, dass du dauerhaft von mir abhängig bist. Mein Ziel ist, dass du lernst, eigenständig zu handeln." }],
    [{ text: "Du entscheidest, ob du weiter ausprobierst oder anfängst, gezielt an deinem Trading zu arbeiten." }],
    [{ text: "Wenn du bereit bist, diesen Schritt zu gehen, dann nutze die Chance und bewirb dich für Capital Circle.", fett: true }],
  ] as readonly (readonly BriefTeil[])[],
  unterschrift: "— Emre",
} as const;

/* ─── Buchungs-Modal ────────────────────────────────────────────────────── */

export const buchung = {
  /** Texte im Buchungs-Modal (der Schlüssel heißt aus Gewohnheit noch `karte`). */
  karte: {
    /** Name des Dialogs für Screenreader. */
    modalTitel: "Kostenloses Analysegespräch anfragen",
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
    // Seit 07.11.2026 gelten Emres Fragen wörtlich (auch die Investitionsfrage mit ihrer Einleitung).
    fragen: {} as Record<string, string>,
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

    gebuchtTitel: "Dein Analysegespräch ist gebucht.",
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

/* ─── 3 Member Wins ─────────────────────────────────────────────────────── */

/**
 * Kopf des ganzen Blocks „Member Wins": steht über den Case Studies; darunter
 * folgen die Auszahlungen (`ErgebnisseSection`, Texte aus
 * `config/landing-membership.ts`) und die Bewertungen (`ReviewSection`).
 */
export const memberWins = {
  eyebrow: "Member Wins",
  headline: "Ergebnisse unserer {Mitglieder}.",
  text: "Case Studies, belegte Auszahlungen und Bewertungen von Tradern, die mit unserer Methodik arbeiten. Klick auf eine Karte, um den Nachweis groß zu sehen.",
} as const;

/* ─── Case Studies ──────────────────────────────────────────────────────── */

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

/** Unter den Case Studies: Einordnung (der Weg zu allen Nachweisen steht unter den Auszahlungen). */
export const ergebnisseKopf = {
  hinweis: "Ergebnisse nicht typisch · Individuelle Ergebnisse variieren · Trading birgt Verlustrisiken",
} as const;

/* ─── 4 Abschluss ───────────────────────────────────────────────────────── */

export const abschluss = {
  headline: "Du hast genug Zeit investiert. {Jetzt ist es Zeit, gezielt voranzukommen.}",
  text: "Lass uns gemeinsam herausfinden, was dich im Trading zurückhält und wie wir gezielt daran arbeiten können.",
} as const;

/* ─── Fußzeile ──────────────────────────────────────────────────────────── */

export const fusszeile =
  "Mit dem Absenden deiner Angaben stimmst du unserer Datenschutzerklärung zu. Trading und der Handel mit Finanzinstrumenten sind mit erheblichen Verlustrisiken verbunden und können zum Totalverlust führen. Die gezeigten Ergebnisse sind nicht typisch, individuelle Ergebnisse variieren. Frühere Ergebnisse sind keine Garantie für zukünftige Gewinne. Capital Circle bietet Ausbildung, keine Anlageberatung und keine Signale.";
