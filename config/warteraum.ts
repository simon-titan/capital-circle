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
    "**Warum du diesen Kanal siehst**",
    "",
    "Deine Mitgliedschaft bei Capital Circle ist gerade nicht aktiv. Deshalb hast du die Rolle „Zugang Pausiert“ und siehst statt der Mitglieder-Kanäle nur diesen hier. Schreiben kannst du hier nicht, das ist kein Versehen.",
    "",
    /*
      Zwei Gruppen landen hier: wer gekündigt oder pausiert hat, und wessen
      Zahlung nicht durchging. Eine gemeinsame Erklärung war für beide unklar
      (Rückmeldung Simon, 20.09.2026) — „ist etwas schiefgegangen" liest sich
      für eine gewollte Kündigung wie ein Fehler. Deshalb stehen die Fälle
      getrennt, und jeder liest nur seinen.

      Kein Lifetime-Hinweis im Kanal (dieselbe Entscheidung): Der Warteraum
      erklärt, er verkauft nicht. Das Angebot steht auf der Abo-Seite.
    */
    "**Du hast gekündigt oder dein Abo pausiert:** Dann ist alles in Ordnung, du musst nichts tun. Dein Konto, dein Journal und dein Fortschritt bleiben gespeichert. Wenn du zurückkommen willst, buchst du hier wieder:",
    `${appUrl}/einstellungen/abonnement`,
    "",
    "**Eine Zahlung ist nicht durchgegangen:** Meist ist es nur eine abgelaufene Karte. Sobald die offene Rechnung bezahlt ist, bist du automatisch wieder drin, auch hier auf Discord:",
    `${appUrl}/einstellungen/abonnement (${passwortVergessen(appUrl)})`,
    "",
    `**Etwas anderes?** Drück unten auf „${WARTERAUM_KNOPF}“ und schreib uns in einem kurzen Formular, was los ist. Wir melden uns bei dir. Ohne Discord erreichst du uns per Mail an ${TEAM_POSTFACH}.`,
    "",
    /*
      Der unbequeme Satz, und er gehört dazu. Die Zahl kommt aus
      `config/discord.ts`, nicht aus dem Text, sonst nennt sie nach der ersten
      Änderung eine Frist, die es nicht mehr gibt.
    */
    `Wenn wir gar nichts von dir hören, nehmen wir dich nach ${KARENZ_TAGE} Tagen vom Server. Das ist kein Abschied für immer: Dein Konto bleibt bestehen, und du kannst jederzeit wiederkommen.`,
  ].join("\n");
}
