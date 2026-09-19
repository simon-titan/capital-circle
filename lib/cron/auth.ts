import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Shared Bearer-Auth-Check für alle Cron-Endpoints.
 *
 * - Fehlt `CRON_SECRET` (z. B. lokal), erlauben wir alle Aufrufe (DEV-Modus).
 * - In Production ruft Vercel-Cron den Endpoint mit
 *   `Authorization: Bearer <CRON_SECRET>` automatisch auf.
 *
 * Für neue Läufe, die etwas Folgenreiches tun, gilt `cronBefugt` (unten).
 */
export function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

/**
 * Fail-closed-Fassung für Läufe, die Zugänge ändern, Nachrichten an Kunden
 * verschicken oder Menschen vom Discord-Server entfernen (Nachtlauf, Kampagnen).
 *
 * Anders als `isAuthorizedCron` gilt hier: **Fehlt `CRON_SECRET`, ist der Weg
 * zu.** Eine fehlende Variable darf nie „keine Prüfung" bedeuten — sonst stünde
 * ein Endpunkt, der Mahnungen verschickt und Leute sperrt, nach einem
 * unvollständigen Deployment offen auf der Produktivdomain. Verglichen wird in
 * konstanter Zeit.
 */
export function cronBefugt(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const erwartet = Buffer.from(`Bearer ${secret}`);
  const erhalten = Buffer.from(request.headers.get("authorization") ?? "");
  if (erwartet.length !== erhalten.length) return false;
  return timingSafeEqual(erwartet, erhalten);
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
