/**
 * Was passiert, wenn eine Abbuchung scheitert — Ablauf und Wortlaut.
 *
 * Übernommen aus MoonTrading (Entscheidung Simon, 19.09.2026: „Mahnsystem
 * genau wie MoonTrading"), angepasst an Capital Circle. Ersetzt die alte
 * 48-Stunden-Gnadenfrist mit Mail-Stempeln und Slack-Alarm vollständig.
 *
 *   Tag 0   Abbuchung scheitert. Erste Nachricht (Mail immer, Discord-
 *           Direktnachricht dazu), interne Mail ans Team. Der Zugang bleibt.
 *   Tag 3   Erste Erinnerung.
 *   Tag 5   Zweite Erinnerung, mit dem Datum der Sperre.
 *   Tag 7   Zugang ruht: Mitgliederbereich und Mitglieder-Rolle weg, dafür der
 *           Warteraum auf Discord. Die Rechnung bleibt bezahlbar, und wer
 *           zahlt, ist sofort wieder drin.
 *
 * ── Warum die Tage hier stehen und nicht im Code ────────────────────────────
 *
 * Weil sie an Stripes Einstellung hängen (Dashboard → Billing → Einstellungen
 * → Abonnements → Wiederholungen / Smart Retries). Wer die Wiederholungen dort
 * auf vierzehn Tage stellt, muss `FRIST_TAGE` mitziehen, sonst sperrt die
 * Plattform jemanden aus, bei dem Stripe noch abbucht. Beide Zahlen gehören
 * nebeneinander, damit dieser Zusammenhang sichtbar ist.
 *
 * ── Der Aufschub sticht diesen Ablauf ───────────────────────────────────────
 *
 * Wer im Adminbereich eine Frist bekommen hat, wird weder erinnert noch
 * gesperrt. Es ist bereits gesprochen worden.
 */

import { KARENZ_TAGE } from "@/config/discord";
import { hilfeWeg } from "@/config/team";

/**
 * Wie der Warteraum-Kanal auf dem Discord-Server heisst.
 *
 * Steht im Text, den der Kunde liest. Wird der Kanal umbenannt, gehört diese
 * Zeile mitgezogen: Ein Verweis auf einen Kanal, den es nicht gibt, lässt den
 * Kunden suchen statt fragen.
 */
export const WARTERAUM_KANAL = "zugang-pausiert";

/** Wie lange Stripe es versucht. Muss zur Einstellung im Stripe-Dashboard passen. */
export const FRIST_TAGE = 7;

/**
 * An welchen Tagen erinnert wird, gezählt ab dem ersten Fehlversuch.
 *
 * Bewusst **nicht** Tag 1 und Tag 6: Am ersten Tag ist die Nachricht von
 * gestern noch ungelesen, und einen Tag vor der Sperre kommt eine Warnung zu
 * spät, um noch eine neue Karte zu hinterlegen.
 */
export const ERINNERUNG_TAGE = [3, 5] as const;

/**
 * Über welchen Weg die Nachricht geht.
 *
 * In Discord gibt es einen Knopf, in der Mail nicht. „Drück unten auf
 * Antworten" wäre in einer Mail eine Anweisung ins Leere, und „antworte auf
 * diese Nachricht" ist in Discord schlicht falsch: **Der Bot kann frei
 * getippte Direktnachrichten nicht lesen.** Im Schwesterprojekt hat Simon beim
 * Testen genau das getan — geantwortet, und nichts ist passiert.
 */
export type Kanal = "discord" | "mail";

/** Der Rückweg, je Kanal. Steht an einer Stelle, damit er überall gleich lautet. */
export function rueckweg(kanal: Kanal, appUrl: string): string {
  return kanal === "discord"
    ? "Wenn du dich erklären möchtest oder etwas dazwischengekommen ist, drück unten auf den Knopf „Antworten“. Eine einfach getippte Antwort auf diese Nachricht erreicht uns leider nicht, der Bot kann sie nicht lesen."
    : `Wenn du dich erklären möchtest oder etwas dazwischengekommen ist, melde dich ${hilfeWeg(appUrl)}.`;
}

export interface NachrichtDaten {
  /** Vorname, oder „du“, wenn keiner bekannt ist. */
  name: string;
  /** Der Tarif, wie er auf der Abo-Seite heisst („Monatlich“), nie ein getipptes Wort. */
  paket: string;
  /** Der offene Betrag als fertiger Text, etwa „99,00 €“. */
  betrag: string;
  /**
   * Wohin zum Bezahlen. Bevorzugt Stripes Rechnungsseite: Dort lässt sich in
   * einem Schritt zahlen **und** eine andere Zahlungsmethode hinterlegen.
   * Fehlt sie, die Abo-Seite der Plattform.
   */
  url: string;
  /** Basis-URL der Plattform, für Rückweg und Hinweise. */
  appUrl: string;
  /** Wie viele Tage noch bis zur Sperre. Nur für die Erinnerungen. */
  tageBisSperre?: number;
  /**
   * Der Tag, an dem der Zugang ruht, ausgeschrieben. Steht schon in der
   * **ersten** Nachricht: Wer weiss, wie lange er Zeit hat, handelt eher.
   */
  fristDatum: string;
  /**
   * Ob ein Discord-Konto verknüpft ist. Ohne Verknüpfung sagt die Mail nichts
   * über Kanäle und Warteraum — das beträfe den Empfänger nicht.
   */
  mitDiscord: boolean;
  /** Ob der Warteraum eingerichtet ist (`DISCORD_WAITING_ROOM_ROLE_ID`). */
  warteraum: boolean;
  /**
   * Der Lifetime-Hinweis, fertig formuliert, oder `null`. `null`, wenn die
   * Person Werbung widersprochen hat oder Lifetime für sie nicht kaufbar ist
   * (`config/lifetime.ts`).
   */
  lifetime: string | null;
  /**
   * Das Abo ist bei Stripe schon beendet (Stufe `free`). Dann bringt das
   * Bezahlen der alten Rechnung den Zugang nicht zurück, und die
   * Sperrnachricht darf das nicht versprechen: Sie zeigt stattdessen den Weg
   * zurück über die Abo-Seite.
   */
  aboBeendet?: boolean;
}

/** Der Absatz über Discord in Erinnerung und Sperrnachricht. */
function discordSatz(d: NachrichtDaten, zeit: "kuenftig" | "jetzt"): string | null {
  if (!d.mitDiscord) return null;
  if (!d.warteraum) {
    return zeit === "kuenftig"
      ? "Auf dem Discord-Server bleibst du, nur die Mitglieder-Kanäle sind dann nicht mehr sichtbar."
      : "Du bleibst auf dem Discord-Server, die Mitglieder-Kanäle sind aber nicht mehr sichtbar.";
  }
  return zeit === "kuenftig"
    ? `Auf dem Discord-Server bleibst du; statt der Mitglieder-Kanäle siehst du dann den Kanal „${WARTERAUM_KANAL}“ mit der Erklärung.`
    : `Du bleibst auf dem Discord-Server. Statt der Mitglieder-Kanäle siehst du ab jetzt den Kanal „${WARTERAUM_KANAL}“, dort steht alles Weitere.`;
}

function mitLifetime(d: NachrichtDaten): string[] {
  return d.lifetime ? ["", d.lifetime] : [];
}

/**
 * Die erste Nachricht, am Tag des Fehlversuchs.
 *
 * Der Weg zum Bezahlen kommt **vor** dem Weg zum Reden, denn die häufigste
 * Ursache ist eine abgelaufene Karte. Die Einladung zu antworten ist
 * ausdrücklich, weil der Knopf darunter sonst übersehen wird.
 */
export function nachrichtErster(d: NachrichtDaten, kanal: Kanal = "discord"): string {
  return [
    `Hey ${d.name},`,
    "",
    `deine Zahlung für deine Capital-Circle-Mitgliedschaft (${d.paket}) über ${d.betrag} ist nicht durchgegangen.`,
    "",
    `Bis zum ${d.fristDatum} ändert sich nichts an deinem Zugang. Wenn du die offene Summe begleichen oder eine andere Zahlungsmethode hinterlegen möchtest, kannst du das direkt hier erledigen:`,
    d.url,
    ...mitLifetime(d),
    "",
    rueckweg(kanal, d.appUrl),
  ].join("\n");
}

/**
 * Die Erinnerungen an Tag 3 und Tag 5.
 *
 * Sie sagen, wie viele Tage bleiben, und zwar als Zahl. „Ruht" wird hier
 * erklärt und nicht erst in der Sperrnachricht: Wer am dritten Tag liest, dass
 * sein Zugang ruht, denkt an Rauswurf.
 */
export function nachrichtErinnerung(d: NachrichtDaten, kanal: Kanal = "discord"): string {
  const tage = d.tageBisSperre ?? 0;
  const wann = tage <= 1 ? `Ab morgen (${d.fristDatum})` : `In ${tage} Tagen (${d.fristDatum})`;
  const discord = discordSatz(d, "kuenftig");
  return [
    `Hey ${d.name},`,
    "",
    `die offene Zahlung über ${d.betrag} für deine Mitgliedschaft (${d.paket}) ist noch nicht durchgegangen.`,
    "",
    `${wann} ruht dein Zugang zum Mitgliederbereich, bis die Rechnung beglichen ist.` + (discord ? ` ${discord}` : ""),
    "",
    "Hier kannst du zahlen oder eine andere Zahlungsmethode hinterlegen:",
    d.url,
    ...mitLifetime(d),
    "",
    rueckweg(kanal, d.appUrl) + " Wir finden eine Lösung.",
  ].join("\n");
}

/**
 * Die Nachricht am siebten Tag, wenn gesperrt wurde.
 *
 * ── Warum sie ohne Vorwurf auskommt ─────────────────────────────────────────
 *
 * Weil der Zustand umkehrbar ist und das die wichtigste Auskunft dieser
 * Nachricht ist. Wer liest, dass er „entfernt“ wurde, kommt nicht zurück; wer
 * liest, dass ein Klick genügt, vielleicht schon.
 *
 * Dazu die dreissig Tage bis zum Rauswurf vom Discord-Server: Wer sie hier
 * liest, weiss, wie viel Zeit er hat, statt eines Tages überrascht zu werden.
 */
export function nachrichtGesperrt(d: NachrichtDaten, kanal: Kanal = "discord"): string {
  const discord = discordSatz(d, "jetzt");
  return [
    `Hey ${d.name},`,
    "",
    `die Zahlung über ${d.betrag} für deine Mitgliedschaft (${d.paket}) ist offen geblieben, deshalb ruht dein Zugang zum Mitgliederbereich ab jetzt.`,
    "",
    d.aboBeendet
      ? "Dein Abo ist inzwischen beendet. Wenn du wieder einsteigen möchtest, geht das jederzeit nach dem Anmelden unter Einstellungen → Abonnement. Dein Journal und dein Fortschritt bleiben gespeichert."
      : "Das lässt sich sofort rückgängig machen: Sobald die Rechnung bezahlt ist, ist alles wieder freigeschaltet. Dein Journal und dein Fortschritt bleiben gespeichert.",
    d.url,
    ...(discord
      ? [
          "",
          discord,
          "",
          `Wenn sich in ${KARENZ_TAGE} Tagen nichts tut, nehmen wir dich vom Discord-Server. Auch das ist kein Abschied für immer, du kannst jederzeit wiederkommen.`,
        ]
      : []),
    ...mitLifetime(d),
    "",
    rueckweg(kanal, d.appUrl),
  ].join("\n");
}

/**
 * Die Nachricht, wenn ein Admin einen Aufschub gewährt hat.
 *
 * Zwei Fassungen desselben Satzes, weil es in der Mail keinen Knopf gibt.
 */
export function nachrichtAufschub(
  d: { betrag: string; datum: string; url: string; appUrl: string },
  kanal: Kanal = "discord",
): string {
  return [
    "Hallo, hier ist das Capital-Circle-Team.",
    "",
    `Wir haben dir Zeit bis zum ${d.datum} gegeben, um die offenen ${d.betrag} zu begleichen. Dein Zugang bleibt bis dahin bestehen.`,
    "",
    "Bezahlen kannst du hier:",
    d.url,
    "",
    rueckweg(kanal, d.appUrl),
  ].join("\n");
}
