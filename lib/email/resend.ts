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
 * Reihenfolge: NEXT_PUBLIC_APP_URL → NEXT_PUBLIC_SITE_URL → Production-Default.
 */
export function getAppUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.capitalcircletrading.com";
  return url.replace(/\/$/, "");
}

/**
 * Backwards-compat Alias — manche Templates importieren `FROM` direkt.
 * Genutzt als Property-Getter, damit der ENV-Check lazy bleibt.
 */
export const FROM = {
  get value(): string {
    return getFrom();
  },
} as const;
