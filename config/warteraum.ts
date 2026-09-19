/**
 * Was im Warteraum-Kanal steht.
 *
 * Übernommen aus MoonTrading (`config/warteraum.ts`), angepasst an Capital
 * Circle. Gepostet und angepinnt wird der Text vom Bot, nicht von einem
 * Menschen (`npm run discord:warteraum`), aus drei Gründen:
 *
 * 1. **Der Text bleibt bei den anderen Kundentexten.** Ändert sich der Rückweg
 *    oder die Karenz, ändert sich der Kanaltext mit.
 * 2. **Nur eine Bot-Nachricht kann einen Knopf tragen.** Wer seine
 *    Direktnachricht gelöscht hat oder Direktnachrichten blockiert, hat so
 *    trotzdem einen Rückweg.
 * 3. **Ein Bot darf nur eigene Nachrichten bearbeiten.** Eine von Hand
 *    gepinnte Nachricht könnte der Einrichtungslauf später nie angleichen.
 */

import { KARENZ_TAGE } from "@/config/discord";
import { LIFETIME_PREIS } from "@/config/lifetime";
import { passwortVergessen, TEAM_POSTFACH } from "@/config/team";

/** Beschriftung des Knopfes unter der Erklärung. Discord erlaubt 80 Zeichen. */
export const WARTERAUM_KNOPF = "Anliegen klären";

/**
 * Die angepinnte Erklärung.
 *
 * ── Eine Nachricht für zwei Gruppen ─────────────────────────────────────────
 *
 * Ein Kanal hat nur **eine** angepinnte Nachricht, und wer sie liest, ist
 * entweder gekündigt (oder pausiert) oder hat ein Zahlungsproblem. Der Text
 * darf sich nicht festlegen, welches, und nennt deshalb beide Gründe und beide
 * Wege zurück. Am Ende steht, was passiert, wenn nichts passiert: Ohne diesen
 * Satz käme der Rauswurf nach `KARENZ_TAGE` für jeden unangekündigt.
 *
 * `**` ist Discord-Markdown (Fettschrift). Vorschaukarten sind über
 * `ohneVorschau` abgeschaltet, sonst stünden unter der Erklärung zwei
 * bildschirmhohe Karten der eigenen Startseite.
 */
export function warteraumNachricht(appUrl: string): string {
  return [
    "**Dein Zugang zu Capital Circle ruht gerade**",
    "",
    "Du siehst diesen Kanal, weil deine Mitgliedschaft im Moment nicht aktiv ist. Entweder ist dein Abo beendet oder pausiert, oder bei einer Zahlung ist etwas schiefgegangen, oft nur eine abgelaufene Karte.",
    "",
    "Schreiben kannst du hier nicht, das ist kein Versehen.",
    "",
    /*
      Der Weg zum Geld steht vor dem Weg zum Reden, dieselbe Reihenfolge wie in
      der Mahnung: Die häufigste Ursache ist eine abgelaufene Karte, und wer sie
      ersetzt, braucht mit niemandem zu sprechen.
    */
    `**So kommst du zurück:** Melde dich auf unserer Webseite an und öffne Einstellungen → Abonnement: ${appUrl}/einstellungen/abonnement (${passwortVergessen(appUrl)})`,
    "Dort kannst du eine offene Rechnung bezahlen, dein Abo wieder aufnehmen oder einmalig Lifetime wählen " +
      `(${LIFETIME_PREIS}, danach keine Abbuchung mehr). Sobald das erledigt ist, bist du automatisch wieder drin.`,
    "",
    `**Wenn etwas dazwischengekommen ist**, drück unten auf „${WARTERAUM_KNOPF}“. Du schreibst uns in einem kurzen Formular, was los ist, und wir melden uns bei dir. Ohne Discord erreichst du uns per Mail an ${TEAM_POSTFACH}.`,
    "",
    /*
      Der unbequeme Satz, und er gehört dazu. Die Zahl kommt aus
      `config/discord.ts`, nicht aus dem Text, sonst nennt sie nach der ersten
      Änderung eine Frist, die es nicht mehr gibt.
    */
    `Wenn wir gar nichts von dir hören, nehmen wir dich nach ${KARENZ_TAGE} Tagen vom Server. Das ist kein Abschied für immer: Dein Konto, dein Journal und dein Fortschritt bleiben gespeichert, und du kannst jederzeit wiederkommen.`,
  ].join("\n");
}
