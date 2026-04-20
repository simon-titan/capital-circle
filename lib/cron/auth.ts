import type { NextRequest } from "next/server";

/**
 * Shared Bearer-Auth-Check für alle Cron-Endpoints.
 *
 * - Fehlt `CRON_SECRET` (z. B. lokal), erlauben wir alle Aufrufe (DEV-Modus).
 * - In Production ruft Vercel-Cron den Endpoint mit
 *   `Authorization: Bearer <CRON_SECRET>` automatisch auf.
 */
export function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

/**
 * Vorname aus `full_name` extrahieren — Fallback auf Email-Local-Part.
 * Gespiegelt aus `lib/stripe/webhooks/_helpers.ts`, damit Cron-Routes
 * unabhängig vom Webhook-Helper bleiben.
 */
export function pickFirstNameFor(
  fullName: string | null | undefined,
  email: string,
): string {
  const fromName = fullName?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const local = email.split("@")[0] ?? "";
  return local.charAt(0).toUpperCase() + local.slice(1) || "Hallo";
}
