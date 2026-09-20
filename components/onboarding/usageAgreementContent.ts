/**
 * Vereinbarung zur Nutzung und Vertraulichkeit — Onboarding-Schritt nach dem
 * Codex (`UsageAgreementStep.tsx`), bestätigt über
 * `profiles.usage_agreement_accepted` / `_at`.
 *
 * Grundlage war der Kundenwortlaut (Version 1.0, April 2026). Seit Version 2.0
 * gilt:
 *
 * - **Vertragspartner** ist der Anbieter aus `config/legal.ts` — dieselbe
 *   Quelle wie Impressum und AGB, hier nichts hart kodieren.
 * - **Nur Nutzungsregeln.** Alles Vertragliche — Leistungen, Preise,
 *   Laufzeit, Kündigung, Widerruf, Erstattung, Haftung — regeln die AGB
 *   (`app/agb/page.tsx`); bei einem Widerspruch gehen sie vor (§ 2). Die
 *   Regeln in §§ 3–7 geben die AGB (Keine Anlageberatung, Konto und
 *   Nutzungsrechte, Community-Regeln, Kündigung aus wichtigem Grund) in der
 *   Sache wieder — wer dort etwas ändert, zieht es hier mit. Neue Pflichten,
 *   die über die AGB hinausgehen, gehören nicht hierher: Die Vereinbarung
 *   wird erst **nach** dem Kauf abgefragt, der Zugang ist dann schon
 *   geschuldet.
 * - **Bewusst entfernt, nicht zurückholen:** die pauschale Vertragsstrafe von
 *   5.000 $ je Verstoß (§ 307 BGB), der Zugangsentzug „ohne Erstattung“
 *   (widerspricht der anteiligen Erstattung in den AGB), die eigenständige
 *   Kündigung der Vereinbarung mit sofortigem Zugangsende (neben der
 *   Kündigung nach den AGB), die Ersetzungsklausel in der salvatorischen
 *   Klausel (§ 306 Abs. 2 BGB) und „gelesen und verstanden“ als
 *   Tatsachenbestätigung (§ 309 Nr. 12 b BGB).
 *
 * **Keine Versionierung in der Datenbank.** Gespeichert wird nur, dass und
 * wann zugestimmt wurde, nicht welcher Fassung. Wer den Text inhaltlich
 * ändert, erhöht die Versionszeile — Bestandsmitglieder werden dadurch nicht
 * erneut gefragt.
 *
 * Textauszeichnung: `*…*` wird hervorgehoben, `[Text](/pfad)` wird ein Link
 * (öffnet in neuem Tab, damit das Onboarding offen bleibt).
 */

import { anbieter, anbieterAnschriftZeilen, rechtsPfade } from "@/config/legal";

export const usageAgreementLeadParagraphs = [
  "Bevor du vollen Zugriff erhältst, musst du diese Vereinbarung akzeptieren.",
  "Das schützt die *Integrität* von Capital Circle und die Arbeit aller Mitglieder.",
];

export const usageAgreementDocumentTitle =
  "Vereinbarung zur Nutzung und Vertraulichkeit · Capital Circle";

export const usageAgreementVersionLine = "Version 2.0 | Stand: 19. September 2026";

export type UsageAgreementSection = {
  heading: string;
  /** Absätze oder Zeilen; *…* wird hervorgehoben, [Text](/pfad) wird ein Link. */
  blocks: string[];
};

const agbLink = `[Allgemeinen Geschäftsbedingungen (AGB)](${rechtsPfade.agb})`;

export const usageAgreementSections: UsageAgreementSection[] = [
  {
    heading: "§ 1 Vertragsparteien",
    blocks: [
      "Diese Vereinbarung wird geschlossen zwischen:",
      [
        `${anbieter.name}, ${anbieter.rechtsform}`,
        `handelnd unter „${anbieter.marke}“`,
        ...anbieterAnschriftZeilen(),
        `E-Mail: ${anbieter.email}`,
        "nachfolgend „Capital Circle“",
      ].join("\n"),
      "und",
      "der Person, die diese Vereinbarung durch aktive Zustimmung annimmt, nachfolgend „der Nutzer“.",
    ],
  },
  {
    heading: "§ 2 Gegenstand und Verhältnis zu den AGB",
    blocks: [
      "Capital Circle stellt dem Nutzer Inhalte zur Verfügung, darunter Strategien, Analysen, Methoden, Videos, Live-Sessions, Dokumente und sonstige Materialien, und betreibt eine Community. Diese Vereinbarung regelt, wie der Nutzer die Inhalte und die Community nutzen darf.",
      `Sie ergänzt den Vertrag, über den der Nutzer Zugang zur Plattform hat: bei einer Mitgliedschaft die ${agbLink}, bei einem 1:1-Mentoring die dafür getroffene gesonderte Vereinbarung. Leistungen, Preise, Laufzeit, Kündigung, Widerrufsrecht, Erstattungen, Mängelrechte und Haftung richten sich allein nach diesem Vertrag; diese Vereinbarung ändert daran nichts. Soweit sich beide widersprechen, gilt der Vertrag.`,
      "Diese Fassung ersetzt frühere Fassungen dieser Vereinbarung.",
    ],
  },
  {
    heading: "§ 3 Geistiges Eigentum und Nutzungsrecht",
    blocks: [
      "Sämtliche von Capital Circle bereitgestellten Inhalte sind urheberrechtlich geschützt. Die Rechte daran liegen bei Capital Circle oder den jeweiligen Rechteinhabern.",
      "Der Nutzer erhält für die Dauer seines Vertrags ein einfaches, nicht übertragbares und nicht unterlizenzierbares Recht, die Inhalte für seine persönliche Aus- und Weiterbildung zu nutzen.",
    ],
  },
  {
    heading: "§ 4 Persönlicher Zugang und verbotene Handlungen",
    blocks: [
      "Der Zugang ist persönlich. Der Nutzer darf seine Zugangsdaten nicht weitergeben und muss sie vor dem Zugriff Dritter schützen.",
      "Dem Nutzer ist es untersagt, die Inhalte ganz oder auszugsweise:",
      "a) an Dritte weiterzugeben oder ihnen zugänglich zu machen,",
      "b) in anderen Communities, Foren, Discord-Servern, Gruppen oder vergleichbaren Plattformen zu teilen,",
      "c) für eigene Kurse, Coachings, Mentorships, Schulungen oder vergleichbare Angebote zu verwenden,",
      "d) aufzuzeichnen (etwa per Bildschirm- oder Tonaufnahme, auch bei Live-Sessions) oder herunterzuladen, soweit Capital Circle keinen Download anbietet,",
      "e) zu vervielfältigen, zu verbreiten, öffentlich zugänglich zu machen oder in sonstiger Weise zu verwerten.",
    ],
  },
  {
    heading: "§ 5 Verhalten in der Community",
    blocks: [
      "In der Community (auf Discord und in den Kommentaren der Plattform) gilt:",
      "a) Die Mitglieder gehen respektvoll miteinander um. Beleidigungen, Diskriminierung und Belästigung sind nicht erlaubt.",
      "b) Keine Werbung, kein Spam und keine Angebote für eigene Signale, Kurse oder Dienstleistungen.",
      "c) Keine Inhalte, die Rechte Dritter verletzen, und keine personenbezogenen Daten anderer ohne deren Einverständnis.",
      "d) Was andere Mitglieder über ihre Konten und Ergebnisse teilen, bleibt in der Community.",
    ],
  },
  {
    heading: "§ 6 Keine Anlageberatung, Risikohinweis",
    blocks: [
      "Capital Circle vermittelt Wissen über den Handel an den Finanzmärkten. Capital Circle erbringt keine Anlageberatung, keine Anlage- oder Abschlussvermittlung und keine Vermögensverwaltung und gibt keine Signale oder Empfehlungen, bestimmte Finanzinstrumente zu kaufen oder zu verkaufen. Analysen und Live-Trades zeigen die eigene Vorgehensweise von Capital Circle; sie sind keine Aufforderung, Geschäfte nachzuahmen.",
      "Der Nutzer trifft seine Handelsentscheidungen selbst, in eigener Verantwortung und auf eigenes Risiko. Der Handel mit Finanzinstrumenten, insbesondere mit gehebelten Produkten wie Futures, CFDs und Devisen, kann zum Verlust des gesamten eingesetzten Kapitals führen, bei einzelnen Produkten auch darüber hinaus. Frühere Ergebnisse sind keine Garantie für zukünftige Ergebnisse.",
    ],
  },
  {
    heading: "§ 7 Folgen bei Verstößen",
    blocks: [
      "Verstößt der Nutzer gegen diese Vereinbarung, ist Capital Circle berechtigt:",
      "a) Beiträge zu entfernen, die gegen § 5 verstoßen,",
      "b) den Zugang bei einem Verstoß gegen § 4 vorübergehend zu sperren,",
      "c) den Nutzer bei wiederholten Verstößen gegen § 5 nach einer Abmahnung, bei schweren Verstößen auch sofort, aus der Community auszuschließen,",
      "d) den Vertrag aus wichtigem Grund zu kündigen, insbesondere wenn der Nutzer Zugangsdaten oder Inhalte entgegen § 4 weitergibt oder trotz Abmahnung wiederholt gegen § 5 verstößt,",
      "e) Unterlassung und Ersatz des entstandenen Schadens nach den gesetzlichen Vorschriften zu verlangen.",
      "Endet der Vertrag dadurch vorzeitig, richtet sich die Erstattung bereits gezahlter Entgelte nach den AGB und den gesetzlichen Vorschriften.",
    ],
  },
  {
    heading: "§ 8 Dauer",
    blocks: [
      "Diese Vereinbarung gilt ab der Zustimmung des Nutzers auf unbestimmte Zeit.",
      `Laufzeit und Kündigung des Zugangs richten sich nach dem Vertrag aus § 2, bei einer Mitgliedschaft also nach den AGB. Kündigen kann der Nutzer seine Mitgliedschaft unter anderem über die Schaltfläche [„Verträge hier kündigen“](${rechtsPfade.kuendigen}) oder per E-Mail an ${anbieter.email}. Bis zum Vertragsende bleibt der Zugang bestehen.`,
      "Mit dem Ende des Vertrags endet das Nutzungsrecht nach § 3; heruntergeladene Inhalte darf der Nutzer danach nicht weiter verwenden. Das Verbot aus § 4, Inhalte weiterzugeben, zu teilen oder zu verwerten, und § 5 d) gelten auch nach dem Vertragsende fort.",
    ],
  },
  {
    heading: "§ 9 Anwendbares Recht",
    blocks: [
      "Es gilt das Recht der Bundesrepublik Deutschland. Ist der Nutzer Verbraucher, gilt diese Rechtswahl nur, soweit ihm dadurch nicht der Schutz zwingender Vorschriften des Staates entzogen wird, in dem er seinen gewöhnlichen Aufenthalt hat.",
    ],
  },
  {
    heading: "§ 10 Salvatorische Klausel",
    blocks: [
      "Ist eine Bestimmung dieser Vereinbarung ganz oder teilweise unwirksam, bleibt die Vereinbarung im Übrigen wirksam. An die Stelle der unwirksamen Bestimmung treten die gesetzlichen Vorschriften.",
    ],
  },
  {
    heading: "§ 11 Zustimmung",
    blocks: ["Mit der aktiven Bestätigung nimmt der Nutzer diese Vereinbarung an."],
  },
];
