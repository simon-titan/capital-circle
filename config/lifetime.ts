/**
 * Lifetime als Hinweis in Mahnung, Warteraum, Abschied und Rückgewinnung.
 *
 * ── Die Entscheidung dahinter ───────────────────────────────────────────────
 *
 * Entscheidung Simon, 19.09.2026: Lifetime darf **immer** beworben werden —
 * auch Gekündigten und Mitgliedern, deren Zahlung ausgefallen ist. Wer das
 * Abo wegen der laufenden Abbuchung beendet, bekommt damit einen Weg, der
 * genau dieses Problem nicht hat: einmal zahlen, nie wieder eine Abbuchung.
 * Rabatte gibt es dafür ausdrücklich **nicht** (Entscheidung ebenfalls vom
 * 19.09.2026) — der Hinweis nennt den normalen Preis.
 *
 * Wer kaufen darf, entscheidet `pruefeLifetimeAngebot()`
 * (`lib/access-control/lifetime-offer.ts`); der Link führt auf die Abo-Seite,
 * auf der die Karte dann auch wirklich steht.
 *
 * ── Werbung, und deshalb mit Widerspruch ────────────────────────────────────
 *
 * Eine Mahnung ist Vertragspost, ein Kaufangebot darin ist Werbung. Wer sich
 * von Werbemails abgemeldet hat (`profiles.unsubscribed_at`), bekommt den
 * Hinweis deshalb nicht, weder in der Mail noch in der Direktnachricht. Die
 * Mahnung selbst bekommt er natürlich trotzdem.
 */

/** Der Preis, wie er auf der Abo-Seite steht (`components/billing/LifetimeOffer.tsx`). */
export const LIFETIME_PREIS = "699 €";

/** Wohin der Hinweis führt: die Lifetime-Karte auf der Abo-Seite. */
export function lifetimeUrl(appUrl: string): string {
  return `${appUrl}/einstellungen/abonnement#lifetime`;
}

/**
 * Der Hinweis als eigener Absatz.
 *
 * Kurz und ohne Druck: Er steht unter einer Nachricht, in der es eigentlich um
 * etwas anderes geht, und soll sie nicht übertönen. Der Link steht in einer
 * eigenen Zeile, damit die Mail ihn als Adresse erkennt und Discord ihn
 * anklickbar macht.
 */
export function lifetimeHinweis(appUrl: string): string {
  return [
    `Übrigens: Statt eines laufenden Abos kannst du Capital Circle auch einmalig mit Lifetime freischalten, für ${LIFETIME_PREIS}, ohne weitere Abbuchung. Die Karte dazu findest du nach dem Anmelden unter Einstellungen → Abonnement:`,
    lifetimeUrl(appUrl),
  ].join("\n");
}
