/** Kundenwortlaut – Vereinbarung zur Nutzung und Vertraulichkeit (Onboarding). */

export const usageAgreementLeadParagraphs = [
  "Bevor du vollen Zugriff erhältst, musst du diese Vereinbarung akzeptieren.",
  "Das schützt die *Integrität* von Capital Circle und die Arbeit aller Mitglieder.",
];

export const usageAgreementDocumentTitle =
  "Vereinbarung zur Nutzung und Vertraulichkeit – Capital Circle";

export const usageAgreementVersionLine = "Version 1.0 | Stand: April 2026";

export type UsageAgreementSection = {
  heading: string;
  /** Absätze oder Zeilen; *…* wird als Hervorhebung gerendert. */
  blocks: string[];
};

export const usageAgreementSections: UsageAgreementSection[] = [
  {
    heading: "§ 1 Vertragsparteien",
    blocks: [
      "Diese Vereinbarung wird geschlossen zwischen:",
      "SEITENNULL - FZCO\nBuilding A1, Dubai Digital Park\nDubai\nNachfolgend Capital Circle",
      "und",
      "der Person, die durch aktive Zustimmung diese Vereinbarung annimmt nachfolgend der Nutzer.",
    ],
  },
  {
    heading: "§ 2 Gegenstand der Vereinbarung",
    blocks: [
      "Capital Circle stellt dem Nutzer Inhalte zur Verfügung, darunter Strategien, Analysen, Methoden, Videos, Dokumente und sonstige Materialien. Diese Vereinbarung regelt die Bedingungen, unter denen der Nutzer auf diese Inhalte zugreifen und sie verwenden darf.",
    ],
  },
  {
    heading: "§ 3 Geistiges Eigentum",
    blocks: [
      "Sämtliche vom Anbieter bereitgestellten Inhalte sind urheberrechtlich geschützt und stellen geistiges Eigentum von Capital Circle dar. Der Nutzer erwirbt durch den Zugang lediglich ein einfaches, nicht übertragbares, nicht unterlizenzierbares Nutzungsrecht für den persönlichen Gebrauch.",
    ],
  },
  {
    heading: "§ 4 Verbotene Handlungen",
    blocks: [
      "Dem Nutzer ist es untersagt, die Inhalte ganz oder auszugsweise:",
      "a) an Dritte weiterzugeben oder zugänglich zu machen,",
      "b) in anderen Communities, Foren, Discord-Servern, Gruppen oder vergleichbaren Plattformen zu teilen,",
      "c) für eigene Kurse, Coachings, Mentorships, Schulungen oder vergleichbare Angebote zu verwenden,",
      "d) öffentlich oder privat zu vervielfältigen, zu verbreiten oder in sonstiger Weise zu verwerten.",
    ],
  },
  {
    heading: "§ 5 Vertragsstrafe",
    blocks: [
      "Bei einem schuldhaften Verstoß gegen die in § 4 genannten Pflichten verpflichtet sich der Nutzer zur Zahlung einer Vertragsstrafe in Höhe von *5.000 $* je Verstoß. Die Geltendmachung eines darüber hinausgehenden Schadens bleibt ausdrücklich vorbehalten. Die Vertragsstrafe wird auf einen etwaigen Schadensersatzanspruch angerechnet.",
    ],
  },
  {
    heading: "§ 6 Rechtsfolgen bei Verstoß",
    blocks: [
      "Im Falle eines Verstoßes gegen diese Vereinbarung ist Capital Circle berechtigt:",
      "a) den Zugang des Nutzers zur Plattform mit sofortiger Wirkung und ohne Erstattung bereits gezahlter Entgelte zu entziehen,",
      "b) Unterlassungs- und Schadensersatzansprüche geltend zu machen,",
      "c) die Vertragsstrafe gemäß § 5 einzufordern.",
    ],
  },
  {
    heading: "§ 7 Laufzeit und Kündigung",
    blocks: [
      "Diese Vereinbarung gilt ab dem Zeitpunkt der Zustimmung durch den Nutzer und auf unbestimmte Zeit. Die Vertraulichkeitspflichten gemäß §§ 3 und 4 gelten auch nach Beendigung des Vertragsverhältnisses fort.",
      "Der Nutzer kann diese Vereinbarung jederzeit kündigen, indem er den Anbieter schriftlich oder per E-Mail an contact@capitalcircletrading.com informiert. Mit der Kündigung erlischt der Zugang zur Plattform.",
      "Der Nutzer verpflichtet sich, im Falle der Kündigung sämtliche erhaltenen Inhalte vollständig zu löschen und diese weder weiter zu verwenden noch Dritten zugänglich zu machen.",
    ],
  },
  {
    heading: "§ 8 Anwendbares Recht und Gerichtsstand",
    blocks: ["Es gilt das Recht der Bundesrepublik Deutschland."],
  },
  {
    heading: "§ 9 Salvatorische Klausel",
    blocks: [
      "Sollte eine Bestimmung dieser Vereinbarung ganz oder teilweise unwirksam oder undurchführbar sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen hiervon unberührt. Anstelle der unwirksamen Bestimmung gilt eine wirksame Regelung, die dem wirtschaftlichen Zweck der unwirksamen Bestimmung am nächsten kommt.",
    ],
  },
  {
    heading: "§ 10 Zustimmung",
    blocks: [
      "Mit der aktiven Bestätigung erklärt der Nutzer, dass er diese Vereinbarung gelesen und verstanden hat und sich an die darin enthaltenen Bedingungen gebunden fühlt.",
    ],
  },
];
