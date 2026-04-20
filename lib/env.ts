/**
 * Zentraler ENV-Check.
 *
 * Wird **lazy** ausgeführt — wir werfen NICHT beim Import, damit Vercel-Builds
 * (z. B. Preview-Deployments ohne vollständige Secrets) nicht failen. Stattdessen
 * exportieren wir `assertEnv()`, das von Server-Only-Routen (Webhooks, Cron,
 * Analytics-API) am Anfang aufgerufen werden kann.
 *
 * Die einzelnen Lazy-Clients (`getStripe`, `getResend`) prüfen ihren eigenen
 * Key zusätzlich — `assertEnv()` ist die zentrale Defense-in-Depth-Schicht für
 * Production-Routen, in denen wir alle Variablen erwarten.
 */

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CRON_SECRET",
] as const;

export type RequiredEnvKey = (typeof REQUIRED_ENV)[number];

/** Optional ENV — nur warnen, nicht hart failen. */
const OPTIONAL_ENV = [
  "RESEND_WEBHOOK_SECRET",
  "RESEND_FROM_EMAIL",
  "RESEND_FROM_NAME",
  "STRIPE_PRICE_MONTHLY",
  "STRIPE_PRICE_LIFETIME",
  "TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "NEXT_PUBLIC_APP_URL",
] as const;

let _checked = false;

/**
 * Prüft die in `REQUIRED_ENV` aufgelisteten Variablen. Wirft einen aggregierten
 * Error, wenn eine oder mehrere fehlen.
 *
 * Idempotent — nach dem ersten erfolgreichen Aufruf wird der Check übersprungen.
 */
export function assertEnv(): void {
  if (_checked) return;
  const missing: string[] = [];
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]?.trim()) missing.push(key);
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required ENV variable(s): ${missing.join(", ")}`,
    );
  }
  _checked = true;
}

/**
 * Soft-Check für Admin-Dashboards: liefert Liste fehlender Optional-Keys
 * (z. B. RESEND_WEBHOOK_SECRET) zurück, damit das UI eine Warnung anzeigen kann.
 */
export function listMissingOptionalEnv(): string[] {
  return OPTIONAL_ENV.filter((k) => !process.env[k]?.trim());
}
