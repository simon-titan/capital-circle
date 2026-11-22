import { anbieter, anbieterAnschriftEinzeilig } from "@/config/legal";

/**
 * Geheimhaltungsvereinbarung für zahlende Mitglieder (15.11.2026, Migration 116).
 *
 * **Entwurf, nicht anwaltlich geprüft.** Ergänzt § 9 der AGB (Nutzungsrechte)
 * um eine ausdrückliche Vertraulichkeitspflicht. Entscheidung Simon: Pflicht —
 * ohne Zustimmung ist der Mitgliederbereich gesperrt; offen bleiben Abo,
 * Abrechnung, Kündigung und Rechtstexte (`OHNE_SPERRE`).
 *
 * Wer den Text inhaltlich ändert, erhöht `GEHEIMHALTUNG_FASSUNG` — dann stimmen
 * alle zahlenden Mitglieder der neuen Fassung erneut zu. Tippfehler ohne
 * inhaltliche Änderung brauchen keine neue Fassung.
 */

export const GEHEIMHALTUNG_FASSUNG = "2026-11-15.1";

/**
 * Hauptschalter. `false` = niemand wird gefragt, das Popup erscheint nicht
 * (Entscheidung Simon, 22.11.2026: abgeschaltet, bis der Text geprüft ist).
 * Gegebene Zustimmungen bleiben gespeichert; `/admin/geheimhaltung` zeigt sie weiter.
 */
export const GEHEIMHALTUNG_AKTIV = false;

/** Hier erscheint das Popup nicht: Kündigen und Abrechnen müssen immer gehen. */
export const OHNE_SPERRE = ["/einstellungen/abonnement", "/einstellungen/rechnungen", "/billing", "/checkout"];

export type Abschnitt = { titel: string; absaetze: string[] };

export const geheimhaltung = {
  dach: "Geheimhaltungsvereinbarung",
  titel: "Bevor es weitergeht: Was in Capital Circle passiert, bleibt in Capital Circle.",
  einleitung:
    "Capital Circle lebt davon, dass Emre und die Mitglieder offen zeigen, wie sie traden: Analysen, Setups, Ergebnisse, auch Fehler. Das geht nur, wenn sich alle darauf verlassen können, dass nichts davon nach außen gelangt. Deshalb bitten wir jedes Mitglied einmal um diese Vereinbarung.",
  parteien: `Zwischen ${anbieter.name}, ${anbieter.marke}, ${anbieterAnschriftEinzeilig()} (im Folgenden „wir“) und dir als Mitglied.`,
  abschnitte: [
    {
      titel: "1. Was vertraulich ist",
      absaetze: [
        "Vertraulich sind alle Inhalte und Informationen, die du als Mitglied erhältst: Kursvideos, Live-Sessions und ihre Aufzeichnungen, Analysen, Daily Bias, Trade-Recaps, der Trading Blueprint, Workbooks, PDFs, Vorlagen und alle übrigen Unterlagen, außerdem alles, was in der Community (Discord, Kommentare, Calls) geteilt wird.",
        "Vertraulich ist ebenso alles, was du über andere Mitglieder erfährst: Namen, Kontostände, Trades, Ergebnisse und persönliche Angaben.",
      ],
    },
    {
      titel: "2. Was du zusagst",
      absaetze: [
        "Du gibst vertrauliche Inhalte nicht an Dritte weiter, weder ganz noch teilweise, weder kostenlos noch gegen Geld. Das gilt auch für Screenshots, Bildschirm- und Tonaufnahmen, Mitschriften, Zusammenfassungen und Weiterleitungen in Chats, Gruppen oder sozialen Netzwerken.",
        "Du zeichnest Live-Sessions und Calls nicht auf und lädst Inhalte nicht herunter, soweit wir keinen Download anbieten.",
        "Du nutzt vertrauliche Inhalte nur für deine eigene Aus- und Weiterbildung und nicht für eigene oder fremde Kurse, Coachings, Signaldienste oder Communities.",
        "Du teilst deinen Zugang mit niemandem.",
      ],
    },
    {
      titel: "3. Was nicht darunter fällt",
      absaetze: [
        "Informationen, die ohne dein Zutun öffentlich bekannt sind oder werden, die du nachweislich schon vorher kanntest oder die du aufgrund einer gesetzlichen oder behördlichen Pflicht offenlegen musst. Über deine eigenen Trades und Ergebnisse darfst du frei sprechen.",
      ],
    },
    {
      titel: "4. Dauer",
      absaetze: [
        "Die Vereinbarung gilt ab deiner Zustimmung, während deiner gesamten Mitgliedschaft und zwei Jahre über ihr Ende hinaus.",
      ],
    },
    {
      titel: "5. Folgen eines Verstoßes",
      absaetze: [
        "Verstößt du gegen diese Vereinbarung, dürfen wir deinen Zugang sperren und die Mitgliedschaft aus wichtigem Grund kündigen. Wir können außerdem Unterlassung und Ersatz des entstandenen Schadens verlangen.",
      ],
    },
    {
      titel: "6. Schluss",
      absaetze: [
        "Ergänzend gelten unsere AGB, insbesondere § 9 zu Konto, Zugang und Nutzungsrechten. Es gilt deutsches Recht. Sollte eine Bestimmung unwirksam sein, bleiben die übrigen wirksam.",
      ],
    },
  ] satisfies Abschnitt[],
  nameLabel: "Dein vollständiger Name",
  nameHinweis: "Gilt als Unterschrift. Wir speichern Name, Zeitpunkt, IP-Adresse und Browser als Nachweis.",
  haken: "Ich habe die Geheimhaltungsvereinbarung gelesen und stimme ihr zu.",
  knopf: "Zustimmen und weiter",
  abmelden: "Abmelden",
  kuendigenHinweis: "Du möchtest nicht zustimmen? Dein Abo kannst du jederzeit",
  kuendigenLink: "in den Einstellungen verwalten",
};
