/**
 * Das Postfach des Teams, für Betriebspost aus Mahnlauf, Warteraum und Bot.
 *
 * ── Warum eine Konstante und keine Umgebungsvariable ───────────────────────
 *
 * Entscheidung Simon, 19.09.2026: Benachrichtigungen über einen neuen
 * Zahlungsfall und über Antworten von Kunden gehen an
 * `contact@capitalcircletrading.com`. Dieselbe Adresse steht im Impressum und
 * in der Nutzungsvereinbarung; sie ändert sich nicht mit dem Deployment, und
 * eine vergessene Variable in Vercel hiesse sonst, dass jede Meldung still
 * im Nichts landet — ausgerechnet dort, wo im Hintergrund eine
 * Sieben-Tage-Uhr läuft.
 *
 * Soll die Betriebspost woanders hin, ist das eine Codeänderung, und das ist
 * gewollt: Sie wird im Review gesehen.
 */
export const TEAM_POSTFACH = "contact@capitalcircletrading.com";

/**
 * Der Weg zu uns, wenn kein Knopf zur Verfügung steht (in Mails, und für alle
 * ohne verknüpftes Discord). Der Support im Mitgliederbereich braucht eine
 * Anmeldung; die Adresse funktioniert immer.
 */
export function hilfeWeg(appUrl: string): string {
  return `über den Support im Mitgliederbereich (${appUrl}/support) oder per Mail an ${TEAM_POSTFACH}`;
}

/**
 * Der Satz für alle, die sich lange nicht angemeldet haben: Ehemalige im
 * Warteraum, vor dem Rauswurf, in der Rückgewinnung. Seit 19.09.2026 gibt es
 * `/passwort-vergessen`; ohne diesen Hinweis endet „melde dich an" für viele
 * an einem Passwort, das sie nicht mehr kennen.
 */
export function passwortVergessen(appUrl: string): string {
  return `Passwort vergessen? ${appUrl}/passwort-vergessen`;
}
