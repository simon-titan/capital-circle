/**
 * Free-Training-Funnel (Board „Gesamtübersicht – Capital Circle", Entscheidung
 * Simon 02.11.2026). Alles Fachliche und alle Texte an einer Stelle.
 *
 *   /training               öffentliche Landingpage + kostenlose Registrierung
 *   /kostenloses-training   die Trainingsvideos im Mitgliederbereich (+ nächster Schritt)
 *   /programme              „Ausbildung & Mentoring": zwei Karten
 *   /admin/training         eigenes CRM-Board (Registrierungen + Analysegespräche)
 *
 * Kurs und Modul legt Migration 109 mit festen IDs an. Die Videos ordnet der
 * Admin unter `/admin/training/videos` (Trainingsvideos) an; der
 * Player schaltet sie nacheinander frei (90 % gesehen, `lib/module-video.ts`).
 */

export const TRAINING_KURS_ID = "00000000-0000-0000-0000-000000000012";
export const TRAINING_MODUL_ID = "00000000-0000-0000-0000-000000000112";

/**
 * Anzahl der Trainingsvideos (Emres Lieferung vom 04./05.11.2026: fünf Kursvideos,
 * das Einführungsvideo ist Video 1; das Landingpage-Video kam am 06.11. separat).
 * Fehlen welche, zeigt die Seite Platzhalter. Wer die Zahl ändert, ändert auch die
 * `videoPlatzhalter`. Die sichtbaren Texte nennen seit 06.11.2026 bewusst **keine**
 * Videoanzahl mehr (Entscheidung Simon) — die Zahl steht nur noch in Zählern und
 * im Admin-Board.
 */
export const TRAINING_VIDEO_ANZAHL = 5;

export const TRAINING_PFAD = "/training";
export const TRAINING_VIDEOS_PFAD = "/kostenloses-training";
export const PROGRAMME_PFAD = "/programme";

/** Wert für `profiles.funnel_quelle`. */
export const FUNNEL_QUELLE_TRAINING = "training";

/**
 * Die Videos, wie sie der Mitgliederbereich zeigt, solange im Modul noch keine
 * hochgeladen sind (die Landingpage listet sie seit 06.11.2026 nicht mehr).
 * Sonst gelten die Titel aus dem Admin — beide gleich halten.
 */
export const videoPlatzhalter = [
  { titel: "Einführung", untertitel: "Was dich im Training erwartet" },
  { titel: "Grundlagen des Tradings", untertitel: "Charts lesen, Märkte verstehen" },
  { titel: "Auction Market Theory", untertitel: "Warum der Preis dort reagiert, wo er reagiert" },
  { titel: "Dein Tradingansatz", untertitel: "Welche Strategie zu dir und deinem Alltag passt" },
  { titel: "Das System in der Praxis", untertitel: "Echte Setups, echte Ergebnisse" },
] as const;

/**
 * Einführungsvideo auf `/training` (VSL mit Ton, Cloudflare Stream).
 * Bewusst **ohne** signierte Wiedergabe: Die Seite ist öffentlich und statisch,
 * ein Token liefe ab. Darum nie in ein Kursmodul hängen — dort würde die
 * Trainingsvideo-Ansicht es auf „signiert“ stellen und die Landingpage wäre schwarz.
 */
export const landingVideo = {
  /** „free kurs video landingpage.mp4“ (Emre, 06.11.2026, 3:11 min). */
  uid: "97672d9535a8d85f43e3afda3d334e29",
  /** Standbild-Zeitpunkt für das Poster (Sekunden). */
  posterSekunde: 3,
} as const;

/* ─── Herkunft (Board, Spalte 1) ────────────────────────────────────────── */

/** Kanäle, nach denen das Board Registrierungen und Anfragen aufschlüsselt. */
export const KANAELE = ["youtube", "instagram", "tiktok", "podcast", "google", "direkt", "sonstige"] as const;
export type Kanal = (typeof KANAELE)[number];
export const kanalLabel: Record<Kanal, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  podcast: "Podcast",
  google: "Google",
  direkt: "Direkt",
  sonstige: "Sonstige",
};

/* ─── Landingpage /training ─────────────────────────────────────────────── */

export const landing = {
  meta: {
    title: "Kostenloses Training · Capital Circle",
    description:
      "Lerne im kostenlosen Video-Training die Trading-Strategie, mit der wir über 5.000.000 €+ Umsatz erzielt haben.",
  },
  /** Sprungmarken der Kopfleiste (ids der Abschnitte). */
  nav: [
    { id: "ergebnisse", label: "Ergebnisse" },
    { id: "ablauf", label: "Ablauf" },
    { id: "faq", label: "FAQ" },
  ],
  /** Kurzform der Hauptaktion für Kopfleiste und Menü. */
  ctaKurz: "Kostenlos starten",
  /** Unter dem Knopf der mobilen Aktionsleiste. */
  mobilHinweis: ["Kostenlos", "In 2 Minuten registriert"],
  hero: {
    eyebrow: "Kostenloses Training",
    /** `{…}` = Gold-Akzent. */
    /** Geschützter Bindestrich in „Trading‑Strategie“ (U+2011) und Wortverbinder zwischen „€“ und „+“ (U+2060): Dort bricht die Zeile sonst um. */
    headline: "Lerne die Trading‑Strategie, mit der wir über {5.000.000€⁠+ Umsatz} erzielt haben.",
    punkte: [
      "Kostenloses Training",
      "Verifizierte Ergebnisse & Case Studies",
      "Praxisnahe Strategien aus der Realität",
    ],
    cta: "Jetzt kostenlos starten",
  },
  /**
   * Drei Schritte vom ersten Klick bis zur Entscheidung. `marke` steht gesperrt
   * in Gold neben der Nummer, `kurz` unten auf der Karte. Nur Aussagen, die
   * stimmen: Die Registrierung fragt keine Zahlungsdaten ab, und die Videos
   * bleiben im kostenlosen Konto abrufbar (siehe FAQ).
   */
  ablauf: {
    eyebrow: "Ablauf",
    /** Geschützter Bindestrich (U+2011): „Trading-System“ bricht nicht um. */
    headline: "In drei Schritten zu deinem {Trading‑System}.",
    sublines: ["Kein Abo, keine Zahlungsdaten. Du brauchst nur eine E-Mail-Adresse."],
    schritte: [
      {
        marke: "Registrieren",
        titel: "Kostenloses Konto anlegen",
        text: "Name, E-Mail und Passwort, mehr nicht. Ein Klick auf den Link in deiner E-Mail und du bist drin.",
        kurz: "In 2 Minuten erledigt",
      },
      {
        marke: "Lernen",
        titel: "Das Training ansehen",
        text: "Direkt im Mitgliederbereich und in deinem Tempo. Jedes Video baut auf dem vorherigen auf und schaltet das nächste frei.",
        kurz: "Jederzeit wieder abrufbar",
      },
      {
        marke: "Umsetzen",
        titel: "Deinen Weg wählen",
        text: "Mit der Ausbildung selbstständig weiterlernen oder im kostenlosen Analysegespräch klären, ob persönliche Begleitung zu dir passt.",
        kurz: "Du entscheidest",
      },
    ],
  },
  faq: {
    eyebrow: "FAQ",
    headline: "Häufige {Fragen}",
    eintraege: [
      {
        frage: "Ist das Training wirklich kostenlos?",
        antwort: "Ja. Du registrierst dich mit Name und E-Mail und siehst das komplette Training, ohne etwas zu bezahlen.",
      },
      {
        frage: "Für wen ist das Training gedacht?",
        antwort:
          "Für Trader, die die Konzepte kennen, aber noch nicht konstant profitabel sind, und für Einsteiger, die von Anfang an mit einem klaren Prozess arbeiten wollen.",
      },
      {
        frage: "Was passiert nach dem Training?",
        antwort:
          "Du entscheidest selbst: Mit der Ausbildung lernst du eigenständig weiter, oder du buchst ein kostenloses Analysegespräch, wenn du persönliche Begleitung möchtest.",
      },
      {
        frage: "Wie lange habe ich Zugriff auf die Videos?",
        antwort: "Dein kostenloses Konto bleibt bestehen, die Videos kannst du jederzeit wieder ansehen.",
      },
    ],
  },
  /** Zwei Zeilen; `{…}` = Gold-Akzent. */
  abschluss: {
    headline: "Bereit? Worauf wartest du noch.",
    zeile2: "Starte jetzt {KOSTENLOS}!",
  },
} as const;

/* ─── Registrierung ─────────────────────────────────────────────────────── */

export const registrierung = {
  modalTitel: "Kostenlos registrieren",
  headline: "Starte dein kostenloses Training",
  text: "Ein Konto, das komplette Training. Wir schicken dir einen Link, mit dem du deine E-Mail-Adresse bestätigst.",
  felder: {
    name: { label: "Name", placeholder: "Vor- und Nachname", fehler: "Bitte trag deinen Namen ein." },
    email: { label: "E-Mail-Adresse", placeholder: "du@beispiel.de", fehler: "Bitte prüf deine E-Mail-Adresse." },
    passwort: {
      label: "Passwort",
      placeholder: "Mindestens 8 Zeichen",
      fehler: "Dein Passwort braucht mindestens 8 Zeichen.",
    },
  },
  einwilligung: "Mit der Registrierung stimmst du unserer Datenschutzerklärung zu. Wir schicken dir E-Mails zum Training, abmelden kannst du dich jederzeit.",
  knopf: "Kostenlos registrieren",
  laeuft: "Wird angelegt …",
  bestaetigenTitel: "Fast geschafft. Bestätige deine E-Mail-Adresse.",
  bestaetigenText:
    "Wir haben dir gerade einen Link an {email} geschickt. Ein Klick darauf, und du bist direkt bei Video 1. Schau auch im Spam-Ordner nach.",
  schonRegistriert: "Diese E-Mail-Adresse hat schon ein Konto. Melde dich an, dein Training wartet dort auf dich.",
  /** Hinweis auf `/training?fehler=link_abgelaufen` (aus `/auth/confirm`). */
  linkAbgelaufen: {
    titel: "Dein Bestätigungslink ist abgelaufen.",
    text: "Kein Problem: Trag dich einfach noch einmal mit derselben E-Mail-Adresse ein, wir schicken dir sofort einen neuen Link.",
    knopf: "Neuen Link anfordern",
  },
  fehler: {
    turnstile: "Die Sicherheitsprüfung ist fehlgeschlagen. Bitte lade die Seite neu und versuch es noch einmal.",
    zuOft: "Zu viele Versuche. Bitte warte ein paar Minuten.",
    server: "Dein Konto konnte gerade nicht angelegt werden. Bitte versuch es noch einmal.",
  },
} as const;

/* ─── Mitgliederbereich ─────────────────────────────────────────────────── */

export const mitglied = {
  trainingTitel: "Kostenloses Training",
  trainingText: "In diesem Training zeigen wir dir das komplette System.",
  videosFolgen: "Die Videos werden gerade fertiggestellt und erscheinen hier in Kürze.",
  dashboard: {
    titel: "Willkommen bei Capital Circle",
    text: "Starte jetzt mit dem kostenlosen Training und lege den Grundstein für deinen Erfolg.",
    weiter: (n: number) => (n <= 1 ? "Mit Video 1 starten" : `Mit Video ${n} fortfahren`),
    fertig: "Training ansehen",
    naechsterSchritt: "Dein nächster Schritt",
  },
  cta: {
    titel: "Bereit für den nächsten Schritt?",
    text:
      "Wenn du das System für dich umsetzen und persönliche Unterstützung erhalten möchtest, buche jetzt dein kostenloses Analysegespräch.",
    gespraech: "Analysegespräch anfragen",
    oder: "Oder möchtest du erstmal selbstständig weiterlernen?",
    ausbildung: "Zur Ausbildung",
    gesperrt: "Schau dir zuerst das komplette Training an. Danach wählst du hier deinen nächsten Schritt.",
  },
  karten: {
    selbst: { titel: "Selbstständig weiterlernen", text: "Zugriff auf die komplette Ausbildung", knopf: "Mehr erfahren" },
    begleitung: { titel: "Persönliche Begleitung", text: "Individuelle Unterstützung & Betreuung", knopf: "Mehr erfahren" },
  },
} as const;

/* ─── Community & Live (Board, Spalte 9) ────────────────────────────────── */

/**
 * Karte auf dem Free-Dashboard: die nächsten Live-Termine (für alle offen,
 * `/events`) und ein Blick in die Discord-Kanäle — die sind erst mit einem
 * Programm zugänglich, Free sieht sie mit Schloss und dem Weg zu `/programme`.
 * Die Kanalnamen sind Anzeige, keine Verknüpfung; bei Umbenennung hier anpassen.
 */
export const community = {
  liveTitel: "Live-Übersicht",
  liveAlle: "Alle anzeigen",
  liveLeer: "Gerade sind keine Live-Termine geplant.",
  communityTitel: "Community",
  kanaele: [
    { name: "allgemeiner-chat", text: "Austausch mit der Community" },
    { name: "trade-ideen", text: "Analysen & Setups" },
    { name: "ergebnisse", text: "Teile deine Fortschritte" },
    { name: "fragen", text: "Stelle deine Fragen" },
    { name: "team-support", text: "Support vom Team" },
  ],
  gesperrt: "Die Community ist ab der Ausbildung dabei.",
  gesperrtKnopf: "Ausbildung & Mentoring",
} as const;

/* ─── Ausbildung & Mentoring (/programme) ───────────────────────────────── */

export const programme = {
  navLabel: "Ausbildung & Mentoring",
  titel: "Wie möchtest du weiterlernen?",
  ausbildung: {
    titel: "Selbstständig lernen",
    untertitel: "(Ausbildung)",
    text: "Du möchtest die Ausbildung eigenständig durcharbeiten und das Wissen in deinem eigenen Tempo umsetzen.",
    punkte: [
      "Komplette Ausbildung (Kurs)",
      "Journal & Vorlagen",
      "3 Monate Live-Trainings",
      "Daily Bias & Trade-Recaps",
      "Discord Community",
      "Neue Kursvideos (laufend)",
    ],
    preis: "599 €",
    preisZusatz: "einmalig",
    raten: "oder 2 Raten möglich",
    knopf: "Ausbildung starten",
    einmal: "Einmal 599 € zahlen",
    zweiRaten: "2 Raten à 299,50 €",
    hatSchon: "Bereits freigeschaltet",
    hatSchonText: "Die Inhalte der Ausbildung sind in deinem Zugang enthalten.",
    aboHinweis:
      "Dein laufendes Abo endet mit dem Kauf automatisch zum Ende der bezahlten Periode, es wird danach nichts mehr abgebucht.",
  },
  mentoring: {
    titel: "Persönlich begleitet",
    untertitel: "(Mentoring)",
    text: "Du möchtest zusätzlich persönliche Unterstützung bei der Umsetzung erhalten und schneller Ergebnisse erzielen.",
    punkte: [
      "Ausbildung ebenfalls enthalten",
      "12 Monate reguläre Praxisleistungen",
      "4 Monate WhatsApp-Support",
      "Exklusive Gruppencalls",
      "Individuelle Betreuung",
      "Einzelstunden nur im Premium",
    ],
    preis: "Preis wird im Analysegespräch besprochen.",
    knopf: "Analysegespräch anfragen",
  },
  fussnote: "Nach 3 Monaten sind die regulären Praxisleistungen optional für 99 €/Monat buchbar. Kein automatisches Abo.",
  fehler: {
    kasse: "Die Kasse konnte gerade nicht geöffnet werden. Bitte versuch es noch einmal.",
    raten: "Diese Ratenzahl gibt es für die Ausbildung nicht.",
  },
} as const;

/* ─── Analysegespräch (Modal im Mitgliederbereich) ──────────────────────── */

export type GespraechStelle = "nach_video_3" | "training" | "programme" | "dashboard";
export const GESPRAECH_STELLEN: readonly GespraechStelle[] = ["nach_video_3", "training", "programme", "dashboard"];

export const stelleLabel: Record<GespraechStelle, string> = {
  nach_video_3: "Nach dem letzten Video",
  training: "Trainingsseite",
  programme: "Mentoring-Karte",
  dashboard: "Dashboard",
};

export const gespraech = {
  modalTitel: "Kostenloses Analysegespräch anfragen",
  labelKontakt: "Deine Daten",
  labelFragen: "Kurze Einordnung",
  labelKalender: "Termin wählen",
  labelGebucht: "Gebucht",
  kontaktHeadline: "Wie erreichen wir dich für dein Gespräch?",
  kontaktText: "Name und E-Mail haben wir aus deinem Konto übernommen. Danach folgen ein paar kurze Fragen.",
  telefonHinweis: "Nur für dein Gespräch: Ändert sich etwas am Termin, erreichen wir dich so.",
  weiter: "Weiter",
  abschicken: "Weiter zum Kalender",
  speichert: "Wird gespeichert …",
  zurueck: "← Zurück",
  kalenderTitel: "Fast geschafft. Wähl jetzt deinen Termin.",
  kalenderText: "Alle freien Termine stehen im Kalender. Die Bestätigung mit dem Link zum Gespräch kommt per E-Mail.",
  gebuchtTitel: "Dein Analysegespräch ist gebucht.",
  gebuchtText:
    "Die Bestätigung mit dem Link zum Gespräch ist gleich in deinem Postfach. Bis dahin kannst du dir die Videos gern noch einmal ansehen.",
  schliessen: "Schließen",
  fehlerAuswahl: "Bitte wähle eine Option.",
  fehlerServer: "Deine Angaben konnten nicht gespeichert werden. Bitte versuch es noch einmal.",
  fehlerVerbindung: "Verbindungsfehler. Bitte versuch es noch einmal.",
  keinKalender: "Die Terminbuchung ist gerade nicht verfügbar. Bitte versuch es später noch einmal.",
} as const;

/** Pipeline des CRM-Boards (`training_leads.status`). */
export const LEAD_STATUS = ["neu", "termin", "no_show", "nachfassen", "gewonnen", "verloren"] as const;
export type LeadStatus = (typeof LEAD_STATUS)[number];
export const leadStatusLabel: Record<LeadStatus, string> = {
  neu: "Neu",
  termin: "Termin gebucht",
  no_show: "No-Show",
  nachfassen: "Nachfassen",
  gewonnen: "Gewonnen",
  verloren: "Verloren",
};

/* ─── Mailstrecke `training` ────────────────────────────────────────────── */

/**
 * Ersetzt die alte Free-Strecke (`free-course-sequence`, Tag 1/2/3/5).
 * Läuft täglich über `app/api/cron/training-sequence`; jede Stufe genau einmal
 * (`email_sequence_log`, sequence = `training`). Erinnerungen gehen nur raus,
 * wenn das Video, an das erinnert wird, schon hochgeladen ist.
 *
 *   Stufe 1 — „Dein Training wartet": Tag 1, wenn noch kein Video fertig ist.
 *   Stufe 2 — „Weiter mit Video X": Tag 3, wenn noch nicht alle 3 fertig sind.
 *   Stufe 3 — „Dein nächster Schritt": sobald alle 3 fertig sind (frühestens Tag 1).
 *   Stufe 4 — „Letzte Erinnerung": Tag 7, wenn noch nicht alle 3 fertig sind.
 */
export const MAIL_SEQUENZ = "training";
export const mailStufen = {
  start: { schritt: 1, abTag: 1 },
  weiter: { schritt: 2, abTag: 3 },
  naechsterSchritt: { schritt: 3, abTag: 1 },
  letzte: { schritt: 4, abTag: 7 },
} as const;
