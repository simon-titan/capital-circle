import type { MembershipPlan } from "@/lib/stripe/plan-map";

/**
 * Inhalte der Sales-Landing auf `/` (Mitgliedschaft, Gast-Checkout).
 *
 * Eine Datei für alle Texte und Zahlen der Seite. Grund: Die Abschnitte
 * „Ergebnisse", „Vergleich" und „Angebot" tragen Angaben, die sich ändern,
 * ohne dass sich das Layout ändert — Auszahlungen kommen dazu, Preise werden
 * angepasst, Fragen kommen aus dem Support zurück. Stünden sie im JSX, müsste
 * für jede dieser Änderungen jemand eine Komponente anfassen.
 *
 * Die Reihenfolge der Blöcke hier entspricht der Reihenfolge auf der Seite.
 */

/* ─── Kopf & Navigation ──────────────────────────────────────────────────── */

/**
 * Anker der Kopfnavigation. `id` ist zugleich die Sprungmarke im DOM — wer
 * hier einen Eintrag ergänzt, muss den Abschnitt mit derselben `id` versehen.
 */
export const navAnker = [
  { id: "plattform", label: "Plattform" },
  { id: "ergebnisse", label: "Ergebnisse" },
  { id: "ablauf", label: "Ablauf" },
  { id: "angebot", label: "Preis" },
  { id: "faq", label: "FAQ" },
] as const;

/**
 * Beschriftung der Hauptaktion. Steht an sieben Stellen — sechs davon öffnen
 * das Beitritts-Modal, die siebte unter den Preiskarten führt direkt in die
 * Kasse. Deshalb hier und nicht siebenmal im JSX.
 */
export const ctaLabel = "Capital Circle beitreten";

/**
 * Sprungmarke des Angebots-Abschnitts.
 *
 * Bis 09/2026 war das zugleich das Ziel aller „Capital Circle beitreten"-Knöpfe
 * außerhalb der Preiskarten. Der Grund war richtig — ein Knopf im Kopfbereich
 * weiß nicht, welche der drei Laufzeiten jemand will —, die Lösung nicht: Der
 * Anker schickt den Leser jedes Mal quer über die Seite, wo er sich neu
 * orientieren muss. Seitdem öffnen diese Knöpfe das Beitritts-Modal
 * (`components/landing/membership/BeitrittModal.tsx`), das die Laufzeit dort
 * erfragt, wo geklickt wurde.
 *
 * Die Marke bleibt, weil zwei Dinge weiter auf sie zeigen: der Eintrag „Preis"
 * in `navAnker` und der feste Balken auf schmalen Bildschirmen
 * (`MembershipMobileCta`), der sich ausblendet, sobald der Abschnitt im Bild
 * ist.
 */
export const ctaAnker = "#angebot";

/* ─── 01 Hero ───────────────────────────────────────────────────────────── */

export const hero = {
  /** Steht als Pill mit Live-Punkt über der Headline (siehe `MembershipHero`). */
  eyebrow: "Premium Trading Community",
  headlineHell: "Werde endlich konstant profitabel",
  headlineGedimmt: "nicht nur an guten Tagen.",
  /**
   * Genau **eine** Zeile. Zwei Sätze über der Plattform-Vorschau haben den
   * Blick zweimal angehalten, bevor er beim eigentlichen Beweis ankam.
   */
  sublines: [
    "Lerne die Strategie, die ich selbst täglich trade — mit klaren Regeln für Analyse, Entry, Risiko und Review.",
  ],
} as const;

/**
 * Plattform-Vorschau im Hero. Wird als echtes Markup nachgebaut (kein Bild),
 * damit die Vorschau bei einer Designänderung nicht veraltet und auf kleinen
 * Bildschirmen scharf bleibt.
 */
export const plattformVorschau = {
  // Nicht "Emre": Die Vorschau zeigt, was der Besucher nach dem Kauf sieht —
  // und das ist sein eigenes Dashboard, nicht das des Gruenders.
  begruessung: "Trader",
  frage: "Was ist jetzt dran?",
  navPunkte: ["Dashboard", "Institut", "Journal", "Live", "Ressourcen"],
  lektion: { titel: "NYSE iFVG Momentum", meta: "Lektion 7 von 24", fortschrittProzent: 62 },
  /**
   * Die Zahlen muessen zueinander passen — die Vorschau steht unter der
   * Ueberschrift „Belegt statt behauptet", und wer dort nachrechnet, findet
   * sonst als Erstes einen Widerspruch. 5 Tage in Folge heisst 5 von 5
   * Arbeitstagen; 83 Prozent heissen 83 Prozent, also 63 von 76 Lektionen und
   * acht von zehn Segmenten.
   */
  streak: { tage: 5, wocheAktiv: 5, wocheGesamt: 5 },
  fortschritt: { prozent: 83, lektionen: "63 von 76 Lektionen abgeschlossen", segmenteGefuellt: 8 },
} as const;

/* ─── 03 Ergebnisse ─────────────────────────────────────────────────────── */

export interface Auszahlung {
  /** Prop-Firma, die ausgezahlt hat. Mitglieder bleiben bewusst namenlos. */
  quelle: string;
  /** Betrag als fertige Anzeigeform — die Währung wechselt je nach Prop-Firma. */
  betrag: string;
  datum: string;
  /** Zertifikats-Vorschau; leer = neutraler Platzhalter (siehe `ZertifikatMiniatur`). */
  bild?: string;
}

/**
 * Belegte Auszahlungen — echte Nachweise, keine Platzhalter mehr.
 *
 * Die Bilder liegen unter `public/nachweise/`.
 *
 * **Die Bilder stehen unveraendert**, genau so wie der Nutzer sie geliefert
 * hat — mit Discord-Kopfzeile, Avatar, Nickname und Klarnamen auf den
 * Urkunden. Ausdrueckliche Entscheidung vom 17.09.2026; eine fruehere Fassung
 * war zugeschnitten und anonymisiert, das war ausdruecklich nicht gewollt.
 * Wer hier etwas aendert, sollte wissen: Es sind personenbezogene Daten
 * Dritter auf einer oeffentlichen Seite. Das Einverstaendnis der Mitglieder
 * liegt beim Betreiber, nicht im Code.
 *
 * Aufgenommen ist ausschliesslich, wo **Geld geflossen** ist — Ueberweisung,
 * Payout-Mail oder Payout-Zertifikat. Kontostaende, Tagesgewinne und
 * bestandene Challenges stehen bewusst nicht hier: Eine Seite, die
 * „jeder Nachweis nachpruefbar" verspricht, darf eine Kontogroesse von
 * 100.000 $ nicht neben eine Auszahlung stellen.
 *
 * Wer etwas ergaenzt: Betrag und Datum muessen auf dem Bild lesbar sein.
 */
export const auszahlungenCommunity: Auszahlung[] = [
  { quelle: "Apex Trader Funding", betrag: "15.000,00 $", datum: "29.04.2026", bild: "/nachweise/member-apex-2026-04-29.jpg" },
  { quelle: "The Trading Pit", betrag: "3.618,69 €", datum: "13.04.2026", bild: "/nachweise/member-tradingpit-2026-04-13.jpg" },
  { quelle: "The Trading Pit", betrag: "3.438,25 €", datum: "07.04.2026", bild: "/nachweise/member-tradingpit-2026-04-07.jpg" },
  { quelle: "Topstep", betrag: "2.500,00 $", datum: "28.08.2026", bild: "/nachweise/member-topstep-2026-08-28.jpg" },
  { quelle: "Lucid Trading", betrag: "2.459,00 $", datum: "06.08.2026", bild: "/nachweise/member-lucid-2026-08-06.jpg" },
  { quelle: "Lucid Trading", betrag: "2.000,00 $", datum: "25.08.2026", bild: "/nachweise/member-lucid-2026-08-25.jpg" },
  { quelle: "The Trading Pit", betrag: "1.704,49 €", datum: "09.09.2026", bild: "/nachweise/member-tradingpit-2026-09-09.jpg" },
  { quelle: "IQ Capital", betrag: "1.350,00 $", datum: "31.08.2026", bild: "/nachweise/member-iqcapital-2026-08-31.jpg" },
  { quelle: "Topstep", betrag: "1.250,31 €", datum: "13.04.2026", bild: "/nachweise/member-topstep-2026-04-13.jpg" },
  { quelle: "Lucid Trading", betrag: "1.163,60 $", datum: "16.07.2026", bild: "/nachweise/member-lucid-2026-07-16.jpg" },
  { quelle: "Lucid Trading", betrag: "1.027,58 $", datum: "24.07.2026", bild: "/nachweise/member-lucid-2026-07-24.jpg" },
  { quelle: "Lucid Trading", betrag: "968,00 $", datum: "24.08.2026", bild: "/nachweise/member-lucid-2026-08-24.jpg" },
];

export const auszahlungenEmre: Auszahlung[] = [
  { quelle: "Lucid Trading", betrag: "10.000,00 $", datum: "16.07.2026", bild: "/nachweise/emre-lucid-2026-07-16.jpg" },
  { quelle: "Lucid Trading", betrag: "10.000,00 $", datum: "17.05.2026", bild: "/nachweise/emre-lucid-2026-05-17.jpg" },
  { quelle: "Lucid Trading", betrag: "10.000,00 $", datum: "08.04.2026", bild: "/nachweise/emre-lucid-2026-04-08.jpg" },
];

export interface ChallengeNachweis {
  /** Prop-Firma, die die Pruefung abgenommen hat. Mitglieder bleiben namenlos. */
  quelle: string;
  /**
   * Kontogroesse als fertige Anzeigeform.
   *
   * Das Feld heisst mit Absicht **nicht** `betrag`. Auf dem Zertifikat steht
   * die Groesse des freigeschalteten Kontos, nicht eine ausgezahlte Summe.
   * Haetten beide Listen dasselbe Feld, waere es eine Frage der Zeit, bis eine
   * Kontogroesse von 100.000 $ in der Auszahlungsliste landet — der eine
   * Fehler, den diese Seite nicht machen darf.
   */
  kontogroesse: string;
  datum: string;
  bild: string;
}

/**
 * Bestandene Prop-Firm-Challenges — zweiter Block auf `/ergebnisse`.
 *
 * Getrennt von den Auszahlungen, weil ein Zertifikat etwas anderes belegt:
 * Die Pruefung ist bestanden und das Konto steht. Ob und wann daraus eine
 * Auszahlung wurde, sagt es nicht. Unter „Jede Zeile hier ist Geld, das
 * geflossen ist" haette ein 150.000-$-Zertifikat die Seite zur Luege gemacht;
 * unter eigener Ueberschrift ist es ein ehrlicher Beleg.
 *
 * Sortiert nach Datum, neueste zuerst — **nicht** nach Kontogroesse. Eine
 * absteigende Zahlenreihe liest sich wie eine Bestenliste in Geld, und genau
 * diesen Eindruck vermeidet der Block.
 *
 * **Die Bilder stehen unveraendert**, genau so wie der Nutzer sie geliefert
 * hat — mit Discord-Kopfzeile, Avatar, Nickname und Klarnamen auf den
 * Urkunden. Ausdrueckliche Entscheidung vom 17.09.2026; eine fruehere Fassung
 * war zugeschnitten und anonymisiert, das war ausdruecklich nicht gewollt.
 * Wer hier etwas aendert, sollte wissen: Es sind personenbezogene Daten
 * Dritter auf einer oeffentlichen Seite. Das Einverstaendnis der Mitglieder
 * liegt beim Betreiber, nicht im Code.
 *
 * Wer etwas ergaenzt: Kontogroesse und Datum muessen auf dem Bild lesbar
 * sein — ein Zertifikat ohne lesbares Datum gehoert nicht hierher.
 */
export const challenges: ChallengeNachweis[] = [
  { quelle: "Lucid Trading", kontogroesse: "25.000 $", datum: "28.08.2026", bild: "/nachweise/challenge-lucid-2026-08-28.jpg" },
  { quelle: "Lucid Trading", kontogroesse: "50.000 $", datum: "26.08.2026", bild: "/nachweise/challenge-lucid-2026-08-26.jpg" },
  { quelle: "Lucid Trading", kontogroesse: "25.000 $", datum: "25.08.2026", bild: "/nachweise/challenge-lucid-2026-08-25.jpg" },
  { quelle: "IQ Capital", kontogroesse: "50.000 $", datum: "30.07.2026", bild: "/nachweise/challenge-iqcapital-2026-07-30.jpg" },
  { quelle: "Apex Trader Funding", kontogroesse: "25.000 $", datum: "15.07.2026", bild: "/nachweise/challenge-apex-2026-07-15.jpg" },
  { quelle: "IQ Capital", kontogroesse: "50.000 $", datum: "14.07.2026", bild: "/nachweise/challenge-iqcapital-2026-07-14.jpg" },
  { quelle: "Apex Trader Funding", kontogroesse: "150.000 $", datum: "02.06.2026", bild: "/nachweise/challenge-apex-2026-06-02.jpg" },
  { quelle: "Apex Trader Funding", kontogroesse: "50.000 $", datum: "01.06.2026", bild: "/nachweise/challenge-apex-2026-06-01.jpg" },
  { quelle: "The Trading Pit", kontogroesse: "50.000 $", datum: "28.05.2026", bild: "/nachweise/challenge-tradingpit-2026-05-28.jpg" },
  { quelle: "IQ Capital", kontogroesse: "50.000 $", datum: "27.05.2026", bild: "/nachweise/challenge-iqcapital-2026-05-27.jpg" },
  { quelle: "IQ Capital", kontogroesse: "50.000 $", datum: "19.05.2026", bild: "/nachweise/challenge-iqcapital-2026-05-19.jpg" },
  { quelle: "Apex Trader Funding", kontogroesse: "50.000 $", datum: "15.05.2026", bild: "/nachweise/challenge-apex-2026-05-15.jpg" },
  { quelle: "Apex Trader Funding", kontogroesse: "25.000 $", datum: "14.05.2026", bild: "/nachweise/challenge-apex-2026-05-14.jpg" },
  { quelle: "The Trading Pit", kontogroesse: "100.000 $", datum: "28.04.2026", bild: "/nachweise/challenge-tradingpit-2026-04-28.jpg" },
  { quelle: "Lucid Trading", kontogroesse: "25.000 $", datum: "22.04.2026", bild: "/nachweise/challenge-lucid-2026-04-22.jpg" },
  { quelle: "The Trading Pit", kontogroesse: "50.000 $", datum: "13.04.2026", bild: "/nachweise/challenge-tradingpit-2026-04-13.jpg" },
  { quelle: "The Trading Pit", kontogroesse: "100.000 $", datum: "09.04.2026", bild: "/nachweise/challenge-tradingpit-2026-04-09.jpg" },
];

/**
 * Auf der Verkaufsseite stehen nur drei Zeilen je Spalte.
 *
 * Bei den Mitgliedern sind es seit dem 17.09.2026 die drei
 * Bei den Mitgliedern stehen seit dem 17.09.2026 drei vom Nutzer ausgesuchte
 * Belege (Ordner „PAYOUTS CLIENT"): Lucid Trading, IQ Capital und The Trading
 * Pit — drei Firmen, die der Nutzer bereits im selben Format geliefert hat
 * (870x580), damit die Miniaturen fluchten.
 *
 * **Diese drei stehen unveraendert**, samt Discord-Kopfzeile, Avatar,
 * Nickname und Klarnamen auf der Urkunde — wie alle uebrigen Nachweise auch
 * (siehe oben).
 *
 * Wer das aendert, braucht die Originale aus dem Ordner „PAYOUTS CLIENT" auf
 * dem Rechner des Nutzers. Und wer sie so laesst, sollte wissen: Hier stehen
 * personenbezogene Daten Dritter auf einer oeffentlichen Verkaufsseite. Das
 * Einverstaendnis der drei Mitglieder liegt beim Betreiber, nicht im Code.
 */
export const auszahlungenLanding: Auszahlung[] = [
  {
    quelle: "Lucid Trading",
    betrag: "2.000,00 $",
    datum: "25.08.2026",
    bild: "/nachweise/community-lucid-2026-08-25.jpg",
  },
  {
    quelle: "IQ Capital",
    betrag: "1.350,00 $",
    datum: "31.08.2026",
    bild: "/nachweise/community-iqcapital-2026-08-31.jpg",
  },
  {
    quelle: "The Trading Pit",
    betrag: "1.704,49 €",
    datum: "09.09.2026",
    bild: "/nachweise/community-tradingpit-2026-09-09.jpg",
  },
];

export const ergebnisse = {
  eyebrow: "Ergebnisse",
  headline: "Belegt statt behauptet.",
  sublines: [
    "Dokumentierte Auszahlungen von Mitgliedern und von mir.",
    "Jeder Nachweis transparent einsehbar.",
  ],
  spalten: [
    {
      titel: "Aus der Community",
      zeilen: auszahlungenLanding,
    },
    { titel: "Meine Auszahlungen", zeilen: auszahlungenEmre },
  ],
  fussLink: { label: "Alle Nachweise ansehen", href: "/ergebnisse" },
} as const;

/* ─── 05 Prozess ────────────────────────────────────────────────────────── */

/**
 * Der Ablauf Lernen → Anwenden → Reviewen.
 *
 * Der Abschnitt trägt die Sprungmarke `ablauf` aus der Kopfnavigation. Die
 * zeigte bis 09/2026 auf die Vergleichstabelle — wer „Ablauf" klickte, landete
 * bei einer Gegenüberstellung von Anbietern.
 *
 * Zu den drei Vorschauen: Die mittlere ist ein echter Screenshot einer
 * Live-Session, die äußeren beiden sind als Markup nachgebaut (siehe
 * `ProzessSection`). Deshalb stehen hier auch ihre Beschriftungen — es sind
 * Anzeigetexte wie alle anderen auf dieser Seite, nur eben in einer Vorschau.
 */
export const prozess = {
  eyebrow: "Der Capital Circle Prozess",
  headline: "Aus Wissen wird ein Prozess.",
  sublines: [
    "Capital Circle verbindet Lernen, Anwendung und Review zu einem klaren Ablauf –",
    "für konstante Weiterentwicklung und eigenständiges Trading.",
  ],
  schritte: [
    {
      marke: "Lernen",
      titel: "Strukturiert verstehen.",
      text: "Du lernst die komplette Strategie und Marktlogik – von der Analyse über Setups und Entries bis hin zu Risikomanagement und Auswertung.",
    },
    {
      marke: "Anwenden",
      titel: "Live anwenden.",
      text: "Wir analysieren täglich gemeinsam den Markt, bereiten Setups vor und besprechen mögliche Szenarien – damit du die Strategie in der Praxis verstehst und umsetzen kannst.",
    },
    {
      marke: "Reviewen",
      titel: "Auswerten und verbessern.",
      text: "Mit dem Journal, klaren Statistiken und regelmäßigem Feedback erkennst du deine Stärken und Schwächen und entwickelst dich Schritt für Schritt weiter.",
    },
  ],
  abschluss: "Wiederholen. Messen. Verbessern.",
  /**
   * Alle drei Schritte als echte Bilder (Nutzerwunsch vom 17.09.2026).
   *
   * Vorher waren 01 und 03 Markup-Nachbauten mit erfundenen Zahlen. Echte
   * Aufnahmen aus dem laufenden Betrieb sind der bessere Beleg — und sie
   * veralten nicht stiller als ein Nachbau, sie veralten sichtbar.
   *
   * Der Ordner `public/prozess/` steht im Matcher von `proxy.ts` unter den
   * Ausnahmen — ohne diesen Eintrag liefert der Proxy für unbekannte Pfade die
   * Anmeldeseite aus, und beim Besucher käme statt des Bildes Login-HTML an.
   */
  bilder: [
    {
      pfad: "/prozess/lernen-smt.jpg",
      alt: "Chartanalyse im Unterricht: NASDAQ und S&P nebeneinander, markierte SMT-Session und Fair-Value-Gaps",
    },
    {
      pfad: "/prozess/anwenden-live.jpg",
      alt: "Live-Session im Discord: laufender Stream mit 33 Zuhörern, Chat im War Room und der Chart mit eingezeichnetem Setup",
    },
    {
      pfad: "/prozess/reviewen-journal.jpg",
      alt: "Trading-Journal: Netto-P&L, Trefferquote, Profit-Faktor, Performance-Score und kumulierte Gewinnkurve",
    },
  ],
  /** Schritt 01 als Markup: Lektionsansicht mit Modul-Liste. */
  lernenVorschau: {
    module: ["Einführung", "Marktstruktur", "Orderflow", "Entries", "Risikomanagement", "Workbook"],
    /** Index des hervorgehobenen Moduls in `module`. */
    aktiv: 1,
    meta: "Lektion 3",
    titel: "Marktstruktur verstehen",
  },
  /** Schritt 03 als Markup: Journal mit Kennzahlen und Trade-Tabelle. */
  reviewVorschau: {
    bereiche: ["Journal", "Statistiken", "Ziele", "Notizen"],
    titel: "Trade Journal",
    kennzahlen: [
      { label: "Trades gesamt", wert: "142" },
      { label: "Winrate", wert: "62 %" },
      { label: "Ø R:R", wert: "1,8" },
    ],
    spalten: ["Datum", "Setup", "Ergebnis"],
    trades: [
      { datum: "12.09.2026", setup: "iFVG Long", ergebnis: "+2,5R", gewinn: true },
      { datum: "11.09.2026", setup: "Liquidity Sweep", ergebnis: "−1,0R", gewinn: false },
      { datum: "10.09.2026", setup: "Inversion", ergebnis: "+1,8R", gewinn: true },
    ],
  },
} as const;

/* ─── 06 Vergleich ──────────────────────────────────────────────────────── */

/**
 * Die Gegenüberstellung dreier Ansätze.
 *
 * Jede Zelle trägt eine **Kurzaussage** und einen erklärenden Satz. Bis 09/2026
 * stand dort nur eine Zeile — und weil in eine Zeile nur ein Urteil passt, las
 * sich die Tabelle wie eine Abwertung der anderen beiden Spalten. Der zweite
 * Satz macht aus dem Urteil eine Beschreibung: Ein klassischer Kurs vermittelt
 * Wissen, und das ist nichts Schlechtes — es ist nur etwas anderes.
 *
 * Die Reihenfolge der Werte entspricht `spalten`.
 */
export const vergleich = {
  eyebrow: "Der Unterschied",
  headline: "Nicht nur lernen. Anwenden.",
  subline: "Capital Circle verbindet Strategie, Live-Anwendung und Review zu einem festen Tradingprozess.",
  merksatz: ["Drei Ansätze.", "Drei unterschiedliche Wege.", "Ein klares Ziel."],
  spalten: ["Capital Circle", "Klassischer Kurs", "Signalgruppe"] as const,
  zeilen: [
    {
      kriterium: "Ziel",
      icon: "ziel" as const,
      werte: [
        {
          kurz: "Eigenständig traden",
          erklaerung: "Du entwickelst die Fähigkeit, langfristig selbst Entscheidungen zu treffen.",
        },
        { kurz: "Wissen vermitteln", erklaerung: "Du erhältst Inhalte, aber oft ohne klare Umsetzung." },
        { kurz: "Trades bereitstellen", erklaerung: "Du erhältst vorgegebene Trades zum Nachmachen." },
      ],
    },
    {
      kriterium: "Lernen",
      icon: "lernen" as const,
      werte: [
        {
          kurz: "Strukturierter Lernpfad + Strategie",
          erklaerung: "Von den Grundlagen bis zur konkreten Umsetzung – alles in einem klaren System.",
        },
        { kurz: "Inhalte & Lektionen", erklaerung: "Oft viele lose Inhalte, aber ohne roten Faden." },
        { kurz: "Kaum Lernprozess", erklaerung: "Es wird selten erklärt, warum ein Trade funktioniert." },
      ],
    },
    {
      kriterium: "Anwendung",
      icon: "anwendung" as const,
      werte: [
        {
          kurz: "Live-Marktvorbereitung & Analyse",
          erklaerung: "Regelmäßige Live-Calls, gemeinsame Analysen und konkrete Setups.",
        },
        { kurz: "Meist eigenständig", erklaerung: "Du musst das Gelernte allein umsetzen." },
        { kurz: "Vorgegebene Trades", erklaerung: "Du klickst die Signale nach – ohne eigenen Analyseprozess." },
      ],
    },
    {
      kriterium: "Review",
      icon: "review" as const,
      werte: [
        {
          kurz: "Journal, Aufgaben & Feedback",
          erklaerung: "Du reflektierst deine Trades, erhältst Feedback und verbesserst dich kontinuierlich.",
        },
        { kurz: "Eigene Auswertung", erklaerung: "Kaum strukturiertes Feedback, oft auf sich allein gestellt." },
        { kurz: "Fokus auf Ergebnis", erklaerung: "Meist keine Auswertung – der nächste Trade steht im Fokus." },
      ],
    },
    {
      kriterium: "Ergebnis",
      icon: "ergebnis" as const,
      werte: [
        {
          kurz: "Eigener wiederholbarer Prozess",
          erklaerung: "Klarheit, Disziplin und ein System, das auch in Zukunft funktioniert.",
        },
        { kurz: "Wissen ohne laufende Struktur", erklaerung: "Du hast Wissen, aber keine konstante Umsetzung." },
        {
          kurz: "Abhängigkeit von Signalen",
          erklaerung: "Du bist von anderen abhängig – ohne wirklich zu verstehen, was im Markt passiert.",
        },
      ],
    },
  ],
  abschluss: "Strategie. Anwendung. Entwicklung.",
} as const;

/* ─── 07 Für wen ────────────────────────────────────────────────────────── */

/**
 * Einordnung — und Abgrenzung.
 *
 * Die drei Karten beschreiben seit 09/2026 **Situationen** statt Stufen
 * („Anfänger / Fortgeschrittene / Funded-Trader"). Grund: Ein Besucher ordnet
 * sich nur ungern in eine Stufe ein, erkennt sich aber sofort in einem Satz
 * wie „Du hast Erfahrung, aber bist inkonstant" wieder.
 *
 * Das `\n` in `titel` ist ein Umbruch, der erst ab `md` greift (siehe
 * `FuerWenSection`). Auf schmalen Bildschirmen bricht die Zeile ohnehin von
 * selbst, und ein erzwungener Umbruch würde dort nur eine Stufe zu früh sitzen.
 */
export const fuerWen = {
  eyebrow: "Für wen ist das?",
  headline: "Für Trader, die mehr wollen als nur Theorie.",
  subline:
    "Capital Circle ist für dich, wenn du Trading ernst nimmst und bereit bist, strukturiert an deiner Entwicklung zu arbeiten.",
  merksatz: ["Unterschiedliche Erfahrung.", "Die gleiche Einstellung.", "Echter Fortschritt."],
  gruppen: [
    {
      icon: "compass" as const,
      titel: "Du hast noch keinen\nfesten Prozess.",
      text: "Du kennst die Basics, aber dir fehlt ein klarer Plan, wie du Analyse, Entry, Risiko und Review konstant umsetzt.",
    },
    {
      icon: "trending" as const,
      titel: "Du hast Erfahrung,\naber bist inkonstant.",
      text: "Du weißt, wie Trading grundsätzlich funktioniert, aber dir fehlt die Struktur, um dein Wissen dauerhaft in Ergebnisse umzusetzen.",
    },
    {
      icon: "shield" as const,
      titel: "Du willst unabhängig\ntraden.",
      text: "Du suchst keine Signale, sondern ein System, mit dem du eigenständige Entscheidungen triffst – mit klaren Regeln und einem starken Mindset.",
    },
  ],
  ausschluss: {
    titel: "Für wen das nichts ist.",
    einleitung: "Capital Circle ist nicht der richtige Ort für dich, wenn du …",
    punkte: [
      "schnelle Ergebnisse ohne eigenen Einsatz erwartest.",
      "nur nach Signalen suchst, die du blind nachklicken kannst.",
      "nicht bereit bist, langfristig an deinem Prozess und deiner Disziplin zu arbeiten.",
    ],
  },
} as const;

/* ─── 08 Brief ──────────────────────────────────────────────────────────── */

export const brief = {
  eyebrow: "Warum Capital Circle existiert",
  headline: "Ich habe lange nach der falschen Lösung gesucht.",
  /** Schwarzweiß dargestellt (siehe `FounderBriefSection`), nach allen Seiten weich auslaufend. */
  bild: "/founder/founder.jpeg",
  bildAlt: "Emre Kopal, Gründer von Capital Circle",
  /**
   * Der erste Eintrag ist die Anrede und steht heller als der Rest.
   *
   * Ein `\n` im Text ist ein Zeilenumbruch **innerhalb** eines Absatzes
   * (`whiteSpace="pre-line"` in der Komponente). Zwei Sätze, die einander
   * gegenüberstehen — „nicht zu wenig zu wissen" / „ein klarer Prozess" —
   * verlieren als zwei getrennte Absätze genau den Gegensatz, der sie trägt.
   */
  absaetze: [
    "Lieber Trader,",
    "ich dachte lange, ich bräuchte nur die nächste Strategie, das nächste Setup oder noch mehr Wissen.",
    "Aber mein eigentliches Problem war nicht, zu wenig zu wissen.\nMein Problem war, dass mir ein klarer Prozess gefehlt hat.",
    "Analyse, Entry, Risiko, Ausführung und Review waren nicht konsequent miteinander verbunden. Gute Phasen kamen — und gingen wieder.",
    "Erst als ich aufgehört habe, ständig nach außen zu schauen, und begonnen habe, meinen eigenen Tradingprozess klar zu definieren, hat sich mein Trading grundlegend verändert.",
    "Capital Circle ist genau daraus entstanden.",
    "Nicht als Signalgruppe. Nicht als Ort, an dem du Trades kopierst. Sondern als Umfeld, in dem du eine klare Strategie lernst, sie live anwenden kannst und deinen eigenen Prozess Schritt für Schritt entwickelst.",
    "Das Ziel ist nicht, dass du mich dauerhaft brauchst.\nDas Ziel ist, dass du lernst, deine eigenen Entscheidungen zu treffen.",
    "Wenn du Trading ernsthaft lernen und strukturiert angehen willst, bist du hier richtig.",
  ],
  signatur: "Emre",
} as const;

/* ─── 09 Angebot ────────────────────────────────────────────────────────── */

export const angebot = {
  eyebrow: "Angebot",
  headline: "Ab hier gehst du nicht mehr allein.",
  /**
   * `stark` ist der Teil vor dem Gedankenstrich (Weiß), `rest` der Nachsatz
   * (gedimmt). Getrennt, damit die Betonung nicht aus einem Markup-Parser
   * mitten im Text entstehen muss.
   */
  spalten: [
    {
      titel: "Institut",
      punkte: [
        { stark: "10 Module, 114 Videos", rest: "— vom ersten Chart bis zur eigenen Routine" },
        { stark: "Das komplette CAP Model", rest: "— Setups, Entries, Invalidierung" },
        { stark: "Fundamentale Analyse, Psyche und Risiko", rest: "— eigene Module, keine Randnotiz" },
      ],
    },
    {
      titel: "Live-Sessions",
      punkte: [
        { stark: "Montag", rest: "· Bias für die Woche, bevor der Markt aufmacht" },
        { stark: "Dienstag bis Donnerstag", rest: "· NASDAQ live, Entscheidung vor dem Trade" },
        { stark: "Mittwoch", rest: "· Backtesting-Session" },
        { stark: "Sonntag", rest: "· Makro und Wochenrecap" },
      ],
    },
    {
      titel: "Dranbleiben",
      punkte: [
        { stark: "Journal", rest: "— mit Auswertung deiner eigenen Zahlen" },
        { stark: "Wochenaufgaben und Fortschritt", rest: "— du siehst schwarz auf weiß, ob du dranbleibst" },
        { stark: "Eine Community", rest: "— die merkt, wenn du zwei Wochen weg bist" },
      ],
    },
  ],
  abgrenzung: "Keine Signale. Keine Copy-Trades. Kein Trade, der im Nachhinein erklärt wird.",
  feinabdruck: "Monatlich kündbar · Sofortiger Zugang",
} as const;

export interface Preiskarte {
  plan: MembershipPlan;
  /** Versal-Titel der Karte. */
  laufzeit: string;
  /** Endpreis brutto als Anzeigeform — die Stripe-Preise sind `tax_behavior: inclusive`. */
  preis: string;
  periode: string;
  /** Zeile unter dem Preis; beim Monatsplan die Kündigungsfrist, sonst die Ersparnis. */
  hinweis: string;
  /**
   * Die Laufzeitzusage für die Vertrauenszeile im Beitritts-Modal.
   *
   * Sie steht je Paket einzeln hier, weil es **keinen** Satz gibt, der für alle
   * drei stimmt: „Monatlich kündbar" gilt nur beim Monatsplan, bei Quartal und
   * Jahr bindet man sich für die gewählte Laufzeit (siehe FAQ „Kann ich
   * monatlich kündigen?"). Eine Zusicherung, die für zwei von drei Paketen
   * falsch ist, hat direkt über dem Kaufknopf nichts verloren.
   */
  bindung: string;
  /** Hebt die Karte hervor (Gold-Kante + Badge). Genau eine Karte trägt das. */
  beliebt?: boolean;
}

/**
 * Preise und Laufzeiten. **Die Zahlen hier sind reine Anzeige** — abgerechnet
 * wird immer der Stripe-Preis aus `lib/stripe/plan-map.ts`. Wer hier etwas
 * ändert, ändert nicht den Betrag auf der Rechnung.
 */
export const preiskarten: Preiskarte[] = [
  {
    plan: "monthly",
    laufzeit: "Monatlich",
    preis: "99 €",
    periode: "pro Monat",
    hinweis: "monatlich kündbar",
    bindung: "Monatlich kündbar",
  },
  {
    plan: "quarterly",
    laufzeit: "Vierteljährlich",
    preis: "267 €",
    periode: "für 3 Monate",
    hinweis: "= 89 €/Monat · 10 % gespart",
    /* „Dann kündbar" statt „monatlich kündbar": Gekündigt wird zum Ende des
       bezahlten Zeitraums, und der ist hier drei Monate lang (FAQ „Kann ich
       monatlich kündigen?"). */
    bindung: "3 Monate Laufzeit, danach kündbar",
    beliebt: true,
  },
  {
    plan: "yearly",
    laufzeit: "Jährlich",
    preis: "990 €",
    periode: "pro Jahr",
    hinweis: "= 82,50 €/Monat · 2 Monate geschenkt",
    bindung: "12 Monate Laufzeit, danach kündbar",
  },
];

/* ─── 10 FAQ ────────────────────────────────────────────────────────────── */

/**
 * Die Fragen stammen aus dem Kunden-Mockup, die Antworten sind im Ton des
 * Briefs geschrieben: kurz, ohne Versprechen, die niemand halten kann.
 */
export const faq = {
  eyebrow: "FAQ",
  headline: "Häufige Fragen.",
  eintraege: [
    {
      frage: "Ist das nicht wieder so eine Signalgruppe?",
      antwort:
        "Nein. Du bekommst hier keinen einzigen Trade zum Nachklicken. Du bekommst ein System, feste Regeln und Leute, die dich daran erinnern, wenn du sie brichst. Signale machen dich abhängig — das ist das Gegenteil von dem, was wir hier tun.",
    },
    {
      frage: "Funktioniert das auch, wenn ich komplett neu bin?",
      antwort:
        "Ja. Das Institut fängt beim ersten Chart an — Marktstruktur, Risiko, Ausführung. Du überspringst nichts, und niemand setzt voraus, dass du schon weißt, was ein Fair Value Gap ist. Rechne aber nicht mit vier Wochen: Ein Fundament dauert Monate, nicht Tage.",
    },
    {
      frage: "Muss ich den ganzen Tag vorm Chart sitzen?",
      antwort:
        "Nein. Wir handeln ein festes Zeitfenster rund um die US-Eröffnung. Wer berufstätig ist, schaut die Live-Session im Recap und tradet an zwei, drei Tagen die Woche. Wichtiger als Dauer ist, dass du jedes Mal dieselbe Routine fährst.",
    },
    {
      frage: "Woher weiß ich, dass du echt tradest?",
      antwort:
        "Weil du mir beim Traden zusiehst. Vier Live-Sessions pro Woche, Entscheidung vor dem Einstieg, nicht die Erklärung danach. Dazu die Auszahlungszertifikate oben auf dieser Seite — meine und die von Membern, jedes nachprüfbar.",
    },
    {
      frage: "Und wenn's nichts für mich ist?",
      antwort:
        "Dann kündigst du. Beim Monatsplan zum Ende des laufenden Monats, in zwei Klicks im Konto, ohne Mail und ohne Rückfrage. Der Zugang läuft bis zum Ende des bezahlten Zeitraums weiter.",
    },
    {
      frage: "Kann ich monatlich kündigen?",
      antwort:
        "Ja. Der Monatsplan läuft Monat für Monat. Bei Vierteljährlich und Jährlich bindest du dich für die gewählte Laufzeit — dafür ist der Monatspreis niedriger. Gekündigt wird immer zum Ende des bezahlten Zeitraums.",
    },
    {
      frage: "Was passiert direkt nach dem Beitritt?",
      antwort:
        "Du zahlst bei Stripe, wir legen dein Konto an und du setzt auf der nächsten Seite dein Passwort — danach bist du sofort drin. Institut, Journal und der Kalender der Live-Sessions stehen ab der ersten Minute offen. Den Discord verbindest du im Dashboard mit einem Klick.",
    },
  ],
} as const;

/* ─── 11 Finaler CTA ────────────────────────────────────────────────────── */

export const finalerCta = {
  zeilen: ["Du kennst das Problem.", "Und jetzt auch den Weg.", "Ab hier gehst du ihn nicht mehr allein."],
  feinabdruck: "99 € im Monat, monatlich kündbar · mit Laufzeit ab 82,50 €",
} as const;
