import { discordBeitraege } from "./discord-beitraege";
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
 *
 * Seit 17.11.2026 **vier**: „Das System in der Praxis" (bisher Video 5) ist auf
 * Wunsch aus dem kostenlosen Kurs raus (in der Datenbank unveröffentlicht). Es
 * bleibt das Vorbereitungsvideo vor dem Analysegespräch, siehe `vorbereitungsVideo`.
 */
export const TRAINING_VIDEO_ANZAHL = 4;

export const TRAINING_PFAD = "/training";
export const TRAINING_VIDEOS_PFAD = "/kostenloses-training";
export const PROGRAMME_PFAD = "/programme";
/**
 * Ziel von „Ausbildung & Mentoring" für **Free-Mitglieder** (Feedback Simon
 * 14.11.2026): Sie sehen `/programme` nicht mehr, sondern landen direkt im
 * Call-Funnel. Zahlende behalten `/programme`.
 */
export const FREE_PROGRAMME_PFAD = "/call";
/** Warte- bzw. Absageseite der Free-Kurs-Bewerbung (Mitgliederbereich). */
export const TRAINING_STATUS_PFAD = "/training/status";

/** Wert für `profiles.funnel_quelle`. */
export const FUNNEL_QUELLE_TRAINING = "training";

/**
 * Die Videos, wie sie der Mitgliederbereich zeigt, solange im Modul noch keine
 * hochgeladen sind (die Landingpage listet sie seit 06.11.2026 nicht mehr).
 * Sonst gelten die Titel aus dem Admin — beide gleich halten.
 */
export const videoPlatzhalter = [
  // Titel nach dem E-Mail-Playbook 1.0 (07.11.2026), Kapitel 02 — die Mails nennen sie wörtlich.
  { titel: "Trading ist mehr als der nächste Payout", untertitel: "Warum der Weg wichtiger ist als das schnelle Ergebnis" },
  { titel: "So liest du einen Chart", untertitel: "Optionale Grundlagenlektion" },
  { titel: "Auction Market Theory – So verstehe ich den Markt", untertitel: "Marktphasen und Volume Profile" },
  { titel: "Welche Tradingstrategie passt wirklich zu dir?", untertitel: "Dein Ansatz und dein Alltag" },
] as const;

/**
 * Vorbereitungsvideo vor dem Analysegespräch (Ziel der Termin-Mail T02,
 * `/termin/vorbereitung/<…>`). Bis 17.11.2026 war es Video 5 des kostenlosen
 * Kurses und wurde über die Playlist gefunden; seit es dort raus ist, hängt es
 * fest an dieser UID. Signiert (`requireSignedURLs`), wie alle Kursvideos.
 */
export const vorbereitungsVideo = {
  /** „Das System in der Praxis" in Stream (Datenbank `videos` 31b5db3c…, unveröffentlicht). */
  uid: "044a1f5c276c0e3aa83a2f68c48e878c",
  titel: "Warum meine Schüler nicht meine Trades kopieren",
} as const;

/**
 * Einführungsvideo auf `/training` (VSL mit Ton, Cloudflare Stream).
 * Bewusst **ohne** signierte Wiedergabe: Die Seite ist öffentlich und statisch,
 * ein Token liefe ab. Darum nie in ein Kursmodul hängen — dort würde die
 * Trainingsvideo-Ansicht es auf „signiert“ stellen und die Landingpage wäre schwarz.
 * **Nur die Vorgabe:** Getauscht wird im Admin (Funnel- & Kursvideos → Funnel-Videos,
 * `lib/funnel-videos.ts`); die Auswahl dort hat Vorrang.
 */
export const landingVideo = {
  /**
   * „free kurs phunnel video.mp4“ (Emre, 11.11.2026, 1:51 min) — die finale Fassung.
   * Vorgänger „free kurs video landingpage.mp4“ (`97672d95…`, 3:11 min) liegt noch in Stream.
   */
  uid: "5ab853dc53a70e30b224cce8d45592ae",
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
    { id: "community", label: "Ergebnisse" },
    { id: "zugang", label: "Zugang" },
    { id: "faq", label: "FAQ" },
  ],
  /** Kurzform der Hauptaktion für Kopfleiste und Menü. */
  ctaKurz: "Kostenlos bewerben",
  /** Unter dem Knopf der mobilen Aktionsleiste. */
  mobilHinweis: ["100 % kostenlos. Nicht für jeden zugänglich."],
  /**
   * Hero nach Emres Mockup (08.11.2026): Headline, Video, Knopf, darunter klein
   * `hinweis`. Keine Pill, keine Punkte, keine Sterne. Headline ohne
   * Gedankenstrich (Feedback 14.11.2026).
   */
  hero: {
    /** `{…}` = Gold-Akzent. */
    headline: "Was gutes Trading wirklich ausmacht und warum eine {Strategie allein nicht reicht.}",
    cta: "Jetzt kostenlos bewerben",
    /** Klein unter jedem Bewerbungsknopf (Smaragd, wie der Knopf). */
    hinweis: "100 % kostenlos. Nicht für jeden zugänglich.",
  },
  /**
   * „Ergebnisse aus der Capital Circle Community" — seit 14.11.2026 mit
   * **allen** Nachweisen untereinander, ohne Filter: Discord-Beiträge (`bilder`, Kopien
   * unter `public/community/`, Ordner steht im Matcher von `proxy.ts`),
   * belegte Auszahlungen und bestandene Challenges (beide aus
   * `config/landing-membership.ts`, getrennt gehalten wie auf `/ergebnisse`:
   * Kontogröße ist keine Auszahlung). Ab einer gewissen Höhe klappt der Block
   * ein und lässt sich ausklappen.
   */
  community: {
    eyebrow: "Community",
    headline: "Ergebnisse aus der {Capital Circle Community}",
    mehr: "Alle {anzahl} anzeigen",
    weniger: "Weniger anzeigen",
    /** Reihenfolge und Herkunft: `config/discord-beitraege.ts`. */
    bilder: discordBeitraege,
  },
  /**
   * „So erhältst du Zugang" — drei Schritte als Grafik. `marke` steht gesperrt
   * in Gold neben der Nummer. Nur Aussagen, die stimmen: Emres Team prüft jede
   * Bewerbung, der Zugang gilt 30 Tage ab Freischaltung (E-Mail-Playbook 1.0).
   *
   * `titel`/`kurz` und `sublines` liest nur noch `/vorschau/training-2`.
   */
  zugang: {
    eyebrow: "So erhältst du Zugang",
    headline: "In drei Schritten zum {kostenlosen Training}.",
    sublines: ["Kein Abo, keine Zahlungsdaten. Drei ehrliche Antworten und eine E-Mail-Adresse."],
    schritte: [
      {
        marke: "Bewerben",
        titel: "Bewerben",
        text: "Beantworte drei kurze Fragen zu deinem Trading.",
        kurz: "Drei kurze Fragen",
      },
      {
        marke: "Prüfung",
        titel: "Prüfung",
        text: "Emres Team prüft jede Bewerbung persönlich.",
        kurz: "Persönlich geprüft",
      },
      {
        marke: "Freischaltung",
        titel: "Freischaltung",
        text: "Du erhältst 30 Tage Zugang zum kostenlosen Training.",
        kurz: "30 Tage ab Freischaltung",
      },
    ],
  },
  faq: {
    eyebrow: "FAQ",
    headline: "Häufige {Fragen}",
    eintraege: [
      {
        frage: "Ist das Training wirklich kostenlos?",
        antwort: "Ja. Du bewirbst dich mit drei kurzen Antworten, und wenn Emre dich aufnimmt, siehst du das komplette Training, ohne etwas zu bezahlen.",
      },
      {
        frage: "Warum muss ich mich bewerben?",
        antwort:
          "Weil der Zugang bewusst nicht automatisch vergeben wird. Emre möchte erkennen, dass du wirklich lernen willst. Perfekte Antworten braucht es dafür nicht, ehrliche schon. Eine Absage ist endgültig.",
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
        antwort:
          "30 Tage ab deiner Freischaltung. Bist du dann noch nicht fertig, kannst du einmalig sieben Tage über unser Team verlängern. Dein Konto bleibt danach bestehen.",
      },
    ],
  },
  /** `{…}` = Gold-Akzent. Darunter derselbe Knopf und `hero.hinweis`. */
  abschluss: {
    headline: "Bereit, Trading aus einer anderen {Perspektive} kennenzulernen?",
  },
} as const;

/* ─── Bewerbung für das Free Training (Emre, 07.11.2026) ────────────────── */

/**
 * Die drei Fragen der Free-Kurs-Bewerbung — Wortlaut von Emre. Die `id`s sind
 * die Schlüssel in `training_bewerbungen.antworten` und dürfen sich nicht
 * ändern. Frage 3 hat zwei Teile: den Freitext und die Ja/Nein-Frage nach dem
 * Kontakt (`kontaktFrage`, Spalte `kontakt_gewuenscht`).
 *
 * Emre entscheidet unter `/admin/training` (Reiter Bewerbungen). Eine Absage
 * ist endgültig — darauf verweist Mail A03, deshalb steht es im Formular.
 */
export const BEWERBUNG_MIN_ZEICHEN = 20;

export const bewerbung = {
  modalTitel: "Bewerbung",
  headline: "Deine Bewerbung für Capital Circle.",
  text: "Beantworte die drei Fragen ehrlich und konkret. Ich erwarte keine perfekten Antworten — ich möchte erkennen, dass du es ernst meinst.",
  unterschrift: "Emre",
  fragen: [
    { id: "stand", frage: "Wo stehst du aktuell im Trading?", placeholder: "Erzähl kurz, wo du gerade stehst." },
    {
      id: "schwierigkeit",
      frage: "Beschreibe deine aktuell größte Schwierigkeit im Trading.",
      placeholder: "Woran hängst du gerade fest?",
    },
    // id bleibt „warum" (Schlüssel in `training_bewerbungen.antworten`), Wortlaut seit 17.11.2026 neu.
    { id: "warum", frage: "Welchen Traum würdest du dir mit Trading gerne erfüllen?", placeholder: "Wofür tradest du?" },
  ],
  kontaktFrage: "Und möchtest du, dass wir dich kontaktieren, um herauszufinden, ob unser Mentoring zu dir passt?",
  kontaktJa: "Ja, gerne",
  kontaktNein: "Nein, erstmal nicht",
  telefon: {
    label: "Telefonnummer",
    placeholder: "+49 …",
    hinweis: "Nur, damit wir dich für ein kurzes Gespräch erreichen.",
  },
  fehlerKurz: `Bitte schreib mindestens ${BEWERBUNG_MIN_ZEICHEN} Zeichen.`,
  fehlerKontakt: "Bitte wähle eine Antwort.",
  weiter: "Weiter",
  zurueck: "← Zurück",
  kontoHeadline: "Fast geschafft. Wohin dürfen wir dir die Entscheidung schicken?",
  kontoText: "Mit deinem Konto meldest du dich nach der Freischaltung an. Emres Entscheidung schicken wir dir an diese Adresse.",
  endgueltig: "Emre prüft jede Bewerbung persönlich. Wird sie abgelehnt, ist das endgültig — eine zweite Bewerbung ist nicht möglich.",
  knopf: "Bewerbung abschicken",
  knopfEingeloggt: "Bewerbung abschicken",
  laeuft: "Wird gesendet …",
  /** Nach dem Absenden (seit 20.11.2026 ohne E-Mail-Bestätigung, neues Konto landet angemeldet auf `/training/status`). */
  eingegangenTitel: "Deine Bewerbung ist eingegangen.",
  eingegangenText: "Emre schaut sich deine Antworten persönlich an. Seine Entscheidung bekommst du per E-Mail.",
  schonBeworben: "Mit dieser E-Mail-Adresse gibt es schon eine Bewerbung. Melde dich an, um ihren Stand zu sehen.",
  fehler: {
    server: "Deine Bewerbung konnte gerade nicht gesendet werden. Bitte versuch es noch einmal.",
  },
} as const;

export type BewerbungFrageId = (typeof bewerbung.fragen)[number]["id"];

/** Die Statusseite `/training/status` (wartend oder abgelehnt). */
export const bewerbungStatus = {
  offen: {
    titel: "Deine Bewerbung ist bei Emre.",
    text: "Er schaut sich deine Antworten persönlich an, bevor er über deinen Zugang entscheidet. Du musst vorerst nichts weiter tun — seine Entscheidung bekommst du per E-Mail.",
  },
  abgelehnt: {
    titel: "Deine Bewerbung wurde geprüft.",
    text: "Emre hat sich gegen eine Aufnahme in das kostenlose Training entschieden. Die Entscheidung hast du per E-Mail bekommen. Danke, dass du dir die Zeit für deine Bewerbung genommen hast.",
  },
  abmelden: "Abmelden",
} as const;

/* ─── Zugang: 30 Tage + einmalig 7 (E-Mail-Playbook 1.0) ────────────────── */

export const ZUGANG_TAGE = 30;
export const VERLAENGERUNG_TAGE = 7;
/** Video 2 („So liest du einen Chart") ist optional — Video 3 öffnet schon nach Video 1. */
export const OPTIONALE_VIDEOS: readonly number[] = [2];

/** Vorbefüllter Text für die WhatsApp-Verlängerung (Vorlage E02, wörtlich). */
export const WHATSAPP_VERLAENGERUNG_TEXT =
  "Hallo Capital-Circle-Team, mein kostenloser Kurszugang ist abgelaufen. Ich möchte die einmalige Verlängerung um sieben Tage nutzen.";

export const zugangTexte = {
  restTage: (n: number) => (n <= 1 ? "Dein Zugang endet heute" : `Noch ${n} Tage Zugang`),
  bis: (datum: string) => `Zugang bis ${datum}`,
  beendetTitel: "Dein kostenloser Trainingszeitraum ist beendet.",
  beendetText:
    "Die Kursvideos sind nicht mehr freigeschaltet, dein Konto bleibt bestehen. Noch nicht fertig? Über unser Team kannst du einmalig sieben Tage verlängern.",
  beendetVerlaengertText: "Auch deine zusätzliche Woche ist abgelaufen. Dein Konto und dein Lernfortschritt bleiben bestehen.",
  whatsapp: "Verlängerung über WhatsApp anfragen",
  keinZugangTitel: "Das kostenlose Training gibt es nach einer kurzen Bewerbung.",
  keinZugangText: "Beantworte drei Fragen. Emre schaut sich deine Bewerbung persönlich an und schaltet dich frei.",
  bewerben: "Jetzt bewerben",
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
  schonRegistriert: "Diese E-Mail-Adresse hat schon ein Konto. Melde dich an — dort kannst du dich mit deinem Konto bewerben oder siehst den Stand deiner Bewerbung.",
  /** Hinweis auf `/training?fehler=link_abgelaufen` (aus `/auth/confirm`). */
  linkAbgelaufen: {
    titel: "Dein Bestätigungslink ist abgelaufen.",
    text: "Kein Problem: Schick deine Bewerbung einfach noch einmal mit derselben E-Mail-Adresse ab, wir schicken dir sofort einen neuen Link. Deine erste Bewerbung bleibt erhalten.",
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
      "Vorlagen und 1 Monat Trading Journal",
      "1 Monat Live-Trading (3× pro Woche)",
      "Daily Bias & Trade-Recaps",
      "Discord Community",
      "Neue Kursvideos (laufend)",
    ],
    // Aus `config/mentoring.ts` (PRODUKTE.ausbildung) — bei einer Preisänderung mitziehen.
    preis: "799 €",
    preisZusatz: "einmalig",
    raten: "oder 2 Raten möglich",
    knopf: "Ausbildung starten",
    einmal: "Einmal 799 € zahlen",
    zweiRaten: "2 Raten à 399,50 €",
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
      "Ausbildung und Trading Journal dauerhaft",
      "3 Monate Live-Trading und Live-Archiv",
      "3 Monate WhatsApp-Support",
      "1:1-Termine mit Emre (Main 4 × 60 Minuten, Premium nach Bedarf)",
      "Individuelle Betreuung",
    ],
    preis: "Preis wird im Analysegespräch besprochen.",
    knopf: "Analysegespräch anfragen",
  },
  fussnote: "Nach Ablauf des Live-Zugangs ist das Live-Trading optional für 99 €/Monat buchbar. Kein automatisches Abo.",
  fehler: {
    kasse: "Die Kasse konnte gerade nicht geöffnet werden. Bitte versuch es noch einmal.",
    raten: "Diese Ratenzahl gibt es für die Ausbildung nicht.",
  },
} as const;

/* ─── Analysegespräch (Modal im Mitgliederbereich) ──────────────────────── */

export type GespraechStelle = "nach_video_3" | "training" | "programme" | "dashboard" | "bewerbung";
/** Stellen, an denen das Modal im Mitgliederbereich aufgeht (`bewerbung` entsteht nur aus der Free-Bewerbung). */
export const GESPRAECH_STELLEN: readonly GespraechStelle[] = ["nach_video_3", "training", "programme", "dashboard"];

export const stelleLabel: Record<GespraechStelle, string> = {
  nach_video_3: "Nach dem letzten Video",
  training: "Trainingsseite",
  programme: "Mentoring-Karte",
  dashboard: "Dashboard",
  bewerbung: "Free-Bewerbung (Kontaktwunsch)",
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
