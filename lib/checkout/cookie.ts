/**
 * Name des Sitzungs-Cookies, das `/go/<plan>` beim Start der Kasse setzt.
 *
 * Eigene Datei, weil zwei Route-Handler ihn brauchen (`/go/<plan>` schreibt,
 * `/checkout/zurueck` liest) und Next.js in `route.ts` keine freien Exporte
 * neben den HTTP-Methoden duldet.
 *
 * Wozu das Cookie: Stripe sichert die Ersetzung von `{CHECKOUT_SESSION_ID}`
 * nur für `success_url` zu, nicht für `cancel_url`. Kommt der Platzhalter
 * unersetzt zurück, ist dieses Cookie der einzige Weg zur richtigen Zeile.
 */
export const CHECKOUT_COOKIE = "cc_checkout";

/** Laufzeit des Cookies — dieselbe wie die der Stripe-Session (zwei Stunden). */
export const CHECKOUT_COOKIE_MAX_AGE = 2 * 60 * 60;
