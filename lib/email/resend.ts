import { Resend } from "resend";

let _client: Resend | null = null;

/**
 * Lazy Resend-Client.
 *
 * Wir initialisieren NICHT auf Top-Level (kein `throw` beim Import), damit
 * Build-Zeit auf Vercel nicht failt, wenn `RESEND_API_KEY` (z. B. in Preview-
 * Deployments) nicht gesetzt ist. Erst beim ersten Sende-Aufruf wird geprüft.
 */
export function getResend(): Resend {
  if (_client) return _client;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY missing");
  }
  _client = new Resend(apiKey);
  return _client;
}

/**
 * From-Header inkl. optionalem Anzeigenamen.
 * Beispiel: `Capital Circle <onboarding@capitalcircletrading.com>`
 */
export function getFrom(): string {
  const email = process.env.RESEND_FROM_EMAIL?.trim();
  if (!email) {
    throw new Error("RESEND_FROM_EMAIL missing");
  }
  const name = process.env.RESEND_FROM_NAME?.trim() || "Capital Circle";
  return `${name} <${email}>`;
}

/**
 * Öffentliche Basis-URL für alle Email-Links (Logo, CTA, Unsubscribe).
 *
 * Wohnt seit dem Gast-Checkout in `lib/site-url.ts`: Stripe-Rückleitungen und
 * Passwort-Links brauchen dieselbe Angabe, und die aus dem Email-Modul zu
 * ziehen wäre eine Abhängigkeit in die falsche Richtung. Der Re-Export bleibt,
 * damit die rund zwei Dutzend bestehenden Template-Importe unverändert laufen.
 */
export { getAppUrl } from "@/lib/site-url";

/**
 * Backwards-compat Alias — manche Templates importieren `FROM` direkt.
 * Genutzt als Property-Getter, damit der ENV-Check lazy bleibt.
 */
export const FROM = {
  get value(): string {
    return getFrom();
  },
} as const;
