/**
 * Externe Links aus Nutzereingaben brauchbar machen.
 *
 * Hintergrund: Im Admin wird ein Link oft ohne Protokoll eingetippt
 * („google.com", „zoom.us/j/123"). Ein `<a href="google.com">` ist für den
 * Browser aber ein **relativer Pfad** — der Klick landet dann auf
 * `/dashboard/google.com` statt auf der externen Seite. Genau so sah es im
 * Dashboard nach einer „Weiterleitung" aus.
 */

/** Protokolle, die wir nie ausliefern — `javascript:` & Co. sind ein Einfallstor. */
const ERLAUBTE_PROTOKOLLE = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * Macht aus einer Eingabe eine absolute URL, oder gibt `null` zurück, wenn
 * daraus nichts Sinnvolles wird.
 *
 *   "google.com"          → "https://google.com"
 *   "https://zoom.us/j/1" → "https://zoom.us/j/1"
 *   "javascript:alert(1)" → null
 *   ""                    → null
 */
export function toAbsoluteUrl(raw: string | null | undefined): string | null {
  const wert = raw?.trim();
  if (!wert) return null;

  // Ein führender Slash ist eine bewusst interne Route — nicht anfassen.
  if (wert.startsWith("/")) return wert;

  const mitProtokoll = /^[a-z][a-z0-9+.-]*:/i.test(wert) ? wert : `https://${wert}`;

  try {
    const url = new URL(mitProtokoll);
    if (!ERLAUBTE_PROTOKOLLE.has(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Zeigt der Link aus der Anwendung heraus? Dann im neuen Tab öffnen. */
export function istExtern(url: string | null | undefined): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}
