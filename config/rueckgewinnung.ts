/**
 * Die vorbereitete Rückgewinnungs-Kampagne „Lifetime" — Wortlaut und Kennung.
 *
 * Entscheidung Simon, 19.09.2026: **vorbereiten, nicht auslösen.** Gebaut
 * nach dem Muster der NQ-Kampagne aus MoonTrading
 * (`app/api/admin/upsell-kampagne`): Trockenlauf, Einzeltest an die eigene
 * Adresse, Versandprotokoll (`kampagne_versand`, Migration 082), Mail plus
 * Discord-Direktnachricht. Ausgelöst wird ausschliesslich von Hand über
 * `/api/admin/rueckgewinnung` bzw. `npm run rueckgewinnung`.
 *
 * Kein Rabatt (Entscheidung vom selben Tag): Beworben wird Lifetime zum
 * normalen Preis, und der Weg zurück in ein Abo.
 */

import { LIFETIME_PREIS, lifetimeUrl } from "@/config/lifetime";
import { passwortVergessen } from "@/config/team";

/** Kennung im Versandprotokoll. Eine neue Kampagne bekommt eine neue Kennung. */
export const RUECKGEWINNUNG_KAMPAGNE = "rueckgewinnung-lifetime";

/** Die Stufe. Eine zweite Welle wäre `"zweite"` — mit eigener Merkliste. */
export const RUECKGEWINNUNG_STUFE = "erste";

/**
 * Die Direktnachricht. Kurz, ohne Druck, mit dem Weg zum Widerspruch: Auch
 * eine Werbe-Direktnachricht muss sagen, wie man keine mehr bekommt.
 */
export function rueckgewinnungDirektnachricht(p: { vorname: string | null; appUrl: string; abmeldeLink: string }): string {
  return [
    `Hey ${p.vorname ?? "du"}, hier ist Capital Circle.`,
    "",
    "Dein Konto, dein Journal und dein Fortschritt sind noch da. Wenn du wieder einsteigen möchtest, ohne dich um ein laufendes Abo zu kümmern: Mit Lifetime zahlst du einmalig " +
      `${LIFETIME_PREIS} und bist dauerhaft dabei.`,
    lifetimeUrl(p.appUrl),
    "",
    `Nach dem Anmelden findest du dort auch die normalen Laufzeiten. ${passwortVergessen(p.appUrl)}`,
    "",
    `Keine solchen Nachrichten mehr? Direktnachrichten schaltest du unter Einstellungen → Profil ab, Werbe-Mails hier: ${p.abmeldeLink}`,
  ].join("\n");
}
