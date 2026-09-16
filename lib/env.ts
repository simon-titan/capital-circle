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
  // Die drei verkauften Laufzeiten. `STRIPE_PRICE_LIFETIME` ist raus: der Plan
  // wird nicht mehr verkauft und keine Stelle im Code liest die Variable noch.
  // Bestandskunden behalten `membership_tier = 'lifetime'` samt Zugang.
  "STRIPE_PRICE_MONTHLY",
  "STRIPE_PRICE_QUARTERLY",
  "STRIPE_PRICE_YEARLY",
  "TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "NEXT_PUBLIC_APP_URL",
  /** Journal-Home: YouTube-RSS. Ohne Wert greift der Default-Kanal (@emre.capital). */
  "YOUTUBE_CHANNEL_ID",
  /** Telegram-Bot: Token von @BotFather. Ohne ihn antwortet der Bot nicht. */
  "TELEGRAM_BOT_TOKEN",
  /** Telegram-Bot: secret_token des Webhooks. Ohne ihn ist die Route ungeschützt. */
  "TELEGRAM_WEBHOOK_SECRET",
  /**
   * Whop-Migrations-Kampagne: Resend-Segment-ID der Empfängerliste.
   * Ohne sie legt `scripts/sync-whop-campaign-segment.mjs` beim nächsten Lauf
   * ein neues (leeres) Segment an statt das bestehende weiterzuverwenden.
   */
  "RESEND_WHOP_SEGMENT_ID",
  /**
   * Plattform-Migrations-Kampagne (Whop → eigene Plattform): Resend-Segment-ID.
   * Ohne sie legt der Admin-Trigger/Import-Skript beim nächsten Lauf ein neues an.
   */
  "RESEND_PLATFORM_MIGRATION_SEGMENT_ID",
  /** Cloudflare Stream: Account-ID (Dashboard → Account Home, rechte Sidebar). */
  "CLOUDFLARE_ACCOUNT_ID",
  /** Cloudflare Stream: API-Token mit Account → Stream → Edit-Berechtigung. */
  "CLOUDFLARE_STREAM_API_TOKEN",
  /** Cloudflare Stream: Signing-Key-ID für signierte Wiedergabe-URLs (POST /stream/keys). */
  "CLOUDFLARE_STREAM_SIGNING_KEY_ID",
  /** Cloudflare Stream: privater RSA-Schlüssel (PEM) zum selben Signing-Key-Paar. */
  "CLOUDFLARE_STREAM_SIGNING_PRIVATE_KEY",
  /**
   * Cloudflare R2 — Objektspeicher für Thumbnails, Anhänge, Arsenal-PDFs und
   * Avatare. Ersetzt Hetzner Object Storage (`HETZNER_*`), dessen Bucket am
   * 16.09.2026 in keiner Region mehr erreichbar war. Endpunkt bei einem Bucket
   * in der EU-Jurisdiktion mit `.eu.` im Host.
   */
  "R2_ENDPOINT",
  "R2_BUCKET_NAME",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
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
