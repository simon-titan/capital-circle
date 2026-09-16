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

/** Beschriftung der Hauptaktion. Steht an fünf Stellen, deshalb hier. */
export const ctaLabel = "Community beitreten";

/**
 * Sprungziel aller „Community beitreten"-Knöpfe außerhalb der Preiskarten.
 *
 * Bewusst ein Anker und **kein** direkter `/go/<plan>`-Link: Es gibt drei
 * Laufzeiten, und welche jemand will, weiß der Knopf im Kopfbereich nicht.
 * Der einzige Knopf, der wirklich zu Stripe führt, steht unter den
 * Preiskarten — dort ist die Laufzeit gewählt.
 */
export const ctaAnker = "#angebot";

/* ─── 01 Hero ───────────────────────────────────────────────────────────── */

export const hero = {
  eyebrow: "Trading-Community & Plattform",
  headlineHell: "Werde endlich konstant profitabel",
  headlineGedimmt: "— nicht nur an guten Tagen.",
  sublines: [
    "Das Problem ist nicht deine Strategie. Du ziehst sie nur nicht durch.",
    "Capital Circle gibt dir ein klares System, feste Regeln und eine Community, die dich auf Kurs hält.",
  ],
} as const;

/**
 * Sternebewertung unter den Hauptaktionen.
 *
 * ACHTUNG: Die Werte stammen aus dem Kunden-Mockup und sind noch nicht gegen
 * die Tabelle `landing_reviews` geprüft. Vor dem Go-live abgleichen — eine
 * Sternezahl, die neben der Bewertungsliste auf derselben Seite nicht aufgeht,
 * ist schlimmer als gar keine.
 */
export const sozialerBeleg = {
  bewertung: "5,0",
  anzahl: 21,
} as const;

/**
 * Plattform-Vorschau im Hero. Wird als echtes Markup nachgebaut (kein Bild),
 * damit die Vorschau bei einer Designänderung nicht veraltet und auf kleinen
 * Bildschirmen scharf bleibt.
 */
export const plattformVorschau = {
  begruessung: "Emre",
  frage: "Was ist jetzt dran?",
  navPunkte: ["Dashboard", "Institut", "Journal", "Live", "Ressourcen"],
  lektion: { titel: "NYSE iFVG Momentum", meta: "Lektion 7 von 24", fortschrittProzent: 62 },
  streak: { tage: 2, wochentage: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"], erledigt: [0, 2, 4, 6] },
  fortschritt: { prozent: 83, module: "7 von 10 Modulen", segmenteGefuellt: 8 },
} as const;

/* ─── 03 Ergebnisse ─────────────────────────────────────────────────────── */

export interface Auszahlung {
  /** Prop-Firma bzw. anonymisierter Mitgliedsname aus dem Mockup. */
  quelle: string;
  /** Betrag als fertige Anzeigeform — die Währung wechselt je nach Prop-Firma. */
  betrag: string;
  datum: string;
  /** Zertifikats-Vorschau; leer = neutraler Platzhalter (siehe `ZertifikatMiniatur`). */
  bild?: string;
}

/**
 * Platzhalterdaten aus dem Kunden-Mockup.
 *
 * Sie stehen hier, damit sie sich gegen echte Zertifikate tauschen lassen,
 * ohne die Komponente anzufassen. `bild` bleibt leer, solange keine echten
 * Zertifikate vorliegen — ein fremdes Kundenfoto als „Zertifikat" auszugeben
 * wäre eine Behauptung, die die Seite selbst widerlegt („jedes nachprüfbar").
 */
export const ergebnisse = {
  eyebrow: "Ergebnisse",
  headline: "Reden kann jeder.",
  sublines: [
    "Nur belegte Auszahlungen — meine und die von Membern.",
    "Jedes Zertifikat echt, jedes nachprüfbar.",
  ],
  spalten: [
    {
      titel: "Aus der Community",
      zeilen: [
        { quelle: "Member 01", betrag: "4.850 $", datum: "19.08.2026" },
        { quelle: "Member 02", betrag: "3.200 $", datum: "11.08.2026" },
        { quelle: "Member 03", betrag: "2.400 $", datum: "29.07.2026" },
      ] satisfies Auszahlung[],
    },
    {
      titel: "Meine Auszahlungen",
      zeilen: [
        { quelle: "Prop-Firma A", betrag: "12.500 $", datum: "14.08.2026" },
        { quelle: "Prop-Firma B", betrag: "8.240 $", datum: "02.08.2026" },
        { quelle: "Prop-Firma C", betrag: "6.750 $", datum: "21.07.2026" },
      ] satisfies Auszahlung[],
    },
  ],
  fussLink: { label: "Alle Ergebnisse ansehen", href: "/erfolge" },
} as const;

/* ─── 05 Vergleich ──────────────────────────────────────────────────────── */

export const vergleich = {
  eyebrow: "Vergleich",
  headline: "Capital Circle vs. Guru-Programme vs. Signalgruppen.",
  spalten: ["Capital Circle", "Guru-Programme", "Signalgruppen"] as const,
  zeilen: [
    {
      kriterium: "Wer tradet?",
      werte: ["Du — mit einem festen System", "Du — nach fremdem Plan", "Andere — du klickst blind nach"],
    },
    {
      kriterium: "Proof",
      werte: ["Verifizierte Auszahlungen, meine & von Membern", "Ein paar Testimonials", "Screenshots ohne Kontext"],
    },
    {
      kriterium: "Lernweg",
      werte: ["Klarer Pfad vom Fundament bis zur Konstanz", "Hängt vom Coach ab", "Gar keiner"],
    },
    {
      kriterium: "Mechanismus",
      werte: ["System + Regeln + Community, die dich hält", "Calls, dann allein", "Blind kopieren"],
    },
    {
      kriterium: "Preis",
      werte: ["99 €/Monat — monatlich kündbar", "Mehrere Tausend — einmalig", "Laufende Gebühr — kein Lernweg"],
    },
  ],
} as const;

/* ─── 06 Für wen ────────────────────────────────────────────────────────── */

export const fuerWen = {
  eyebrow: "Für wen",
  headline: "Für wen ist das?",
  gruppen: [
    {
      icon: "compass" as const,
      titel: "Anfänger",
      ergebnis: "Ein klarer Start — ohne dich von Strategie zu Strategie zu hangeln.",
    },
    {
      icon: "trending" as const,
      titel: "Fortgeschrittene",
      ergebnis: "Endlich Konstanz, statt profitabel und wieder alles weg.",
    },
    {
      icon: "shield" as const,
      titel: "Funded-Trader",
      ergebnis: "Du hältst deine Regeln und schützt dein Kapital — Payout um Payout.",
    },
  ],
  ausschluss: {
    titel: "Für wen das nichts ist",
    punkte: [
      "Wer in vier Wochen sein Konto verdoppeln will.",
      "Wer Signale sucht, die er blind nachklickt.",
      "Wer nicht bereit ist, drei Monate Prozess zu gehen, bevor Ergebnisse kommen.",
    ],
  },
} as const;

/* ─── 07 Brief ──────────────────────────────────────────────────────────── */

export const brief = {
  eyebrow: "Mein Brief an euch",
  unterzeile: "Klartext",
  headline: "Lieber Trader,",
  /** Schwarzweiß dargestellt (siehe `FounderBriefSection`), links weich auslaufend. */
  bild: "/founder/founder.jpeg",
  bildAlt: "Emre Kopal, Gründer von Capital Circle",
  absaetze: [
    "Lieber Trader,",
    "lass uns Klartext reden.",
    "Jahrelang hab ich alles gejagt. Jede Strategie, jede Gruppe, jedes Signal. Profitabel, dann wieder alles weg. Und ich hab alle beschuldigt — den Markt, die Gurus, das Pech.",
    "Der Tag, an dem sich alles gedreht hat, war der, an dem ich aufgehört hab, nach außen zu zeigen, und in den Spiegel geschaut hab. Ich war das Problem. Nicht die Strategie. Ich.",
    "Da hab ich noch was verstanden: Die meisten da draußen reden nur. Sie verkaufen dir Signale, geliehene Lambos, das schnelle Geld. Alles Lärm. Was wirklich funktioniert, ist unbequem — Disziplin, Verantwortung, den Markt von Grund auf verstehen. Ich bin der lebende Beweis, dass genau das funktioniert.",
    "Trading hat mich nicht reich gemacht. Es hat mich geändert. Das ist der Teil, den dir keiner verkauft.",
    "Capital Circle ist der Ort, den ich damals gebraucht hätte. Kein Guru-Thron, kein geliehener Lifestyle. Ein System, echte Zahlen, und Leute, die dich nicht allein lassen — während wir alle jeden Tag besser werden.",
    "Ich bin hier, um aufzuräumen — mit den Leuten, die dir das Geld aus der Tasche ziehen.",
    "Wenn du's ernst meinst, bist du richtig.",
  ],
  signatur: "Emre",
} as const;

/* ─── 08 Angebot ────────────────────────────────────────────────────────── */

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
  /** Hebt die Karte hervor (Gold-Kante + Badge). Genau eine Karte trägt das. */
  beliebt?: boolean;
}

/**
 * Preise und Laufzeiten. **Die Zahlen hier sind reine Anzeige** — abgerechnet
 * wird immer der Stripe-Preis aus `lib/stripe/plan-map.ts`. Wer hier etwas
 * ändert, ändert nicht den Betrag auf der Rechnung.
 */
export const preiskarten: Preiskarte[] = [
  { plan: "monthly", laufzeit: "Monatlich", preis: "99 €", periode: "pro Monat", hinweis: "monatlich kündbar" },
  {
    plan: "quarterly",
    laufzeit: "Vierteljährlich",
    preis: "267 €",
    periode: "für 3 Monate",
    hinweis: "= 89 €/Monat · 10 % gespart",
    beliebt: true,
  },
  {
    plan: "yearly",
    laufzeit: "Jährlich",
    preis: "990 €",
    periode: "pro Jahr",
    hinweis: "= 82,50 €/Monat · 2 Monate geschenkt",
  },
];

/* ─── 09 FAQ ────────────────────────────────────────────────────────────── */

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

/* ─── 10 Finaler CTA ────────────────────────────────────────────────────── */

export const finalerCta = {
  zeilen: ["Du kennst das Problem.", "Und jetzt auch den Weg.", "Ab hier gehst du ihn nicht mehr allein."],
  feinabdruck: "Ab 99 € im Monat · monatlich kündbar",
} as const;
