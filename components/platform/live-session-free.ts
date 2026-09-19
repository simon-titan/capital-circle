/**
 * Welche Live-Session-Kategorie Free-Mitglieder sehen dürfen.
 *
 * Bis zum 17.09.2026 war das „Weekly Outlook“. Mit dem Neuaufsetzen der
 * Kategorien (Migration 070) gibt es nur noch Live Trading, Backtesting und
 * Wochenrecap — „Wochenrecap“ tritt an die Stelle des Weekly Outlook.
 *
 * Bewusst ein Titelvergleich statt einer ID: Die Kategorien legt der Admin in
 * der Datenbank an, eine feste UUID im Code würde beim nächsten Neuaufsetzen
 * wieder ins Leere zeigen. Wer Free-Mitgliedern gar nichts mehr zeigen will,
 * setzt die Konstante auf einen leeren String — dann greift die Prüfung nie.
 *
 * Derselbe Titelvergleich steht in der Datenbank: `public.live_session_ist_frei()`
 * (Migration 076) entscheidet danach, welche Live-Session-Videos Konten ohne
 * Zahlung lesen dürfen. Wer den Wert hier ändert, ändert ihn dort mit.
 */
export const FREE_LIVE_SESSION_CATEGORY = "wochenrecap";

export function isFreeLiveSessionCategory(title: string): boolean {
  if (!FREE_LIVE_SESSION_CATEGORY) return false;
  return title.toLowerCase().includes(FREE_LIVE_SESSION_CATEGORY);
}
