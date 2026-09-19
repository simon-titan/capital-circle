/**
 * Die vorbereitete Rückgewinnungs-Kampagne „Lifetime" bedienen.
 * Logik: `app/api/admin/rueckgewinnung/route.ts`. **Nichts davon läuft von selbst.**
 *
 *   npm run rueckgewinnung -- --url https://www.capitalcircletrading.com
 *       Trockenlauf: Empfängerkreis mit Zählung. Verschickt nichts.
 *
 *   npm run rueckgewinnung -- --url … --nur-an du@beispiel.de --write
 *       Einzeltest an die EIGENE Adresse (Mail + Discord-DM, falls verknüpft).
 *
 *   npm run rueckgewinnung -- --url … --write --limit 25
 *       Scharf, höchstens 100 je Aufruf. Wiederholen, bis „verbleibend: 0".
 *
 *   npm run rueckgewinnung -- --url … --schalter an|aus
 *       Die automatische 14-Tage-Mail nach einer Kündigung ein- oder ausschalten
 *       (Standard: aus).
 *
 * `CRON_SECRET` muss lokal (.env.local) denselben Wert haben wie im Deployment.
 */

import dotenv from "dotenv";
import path from "node:path";
import { existsSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) dotenv.config({ path: full, override: false, quiet: true });
}

function arg(name, fallback = undefined) {
  const withValue = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (withValue) return withValue.split("=").slice(1).join("=");
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1) {
    const next = process.argv[idx + 1];
    if (next && !next.startsWith("--")) return next;
    return true;
  }
  return fallback;
}

const baseUrl = String(arg("url", "http://localhost:3000")).replace(/\/$/, "");
const secret = process.env.CRON_SECRET?.trim();
if (!secret) {
  console.error("CRON_SECRET fehlt (in .env.local eintragen, derselbe Wert wie im Deployment).");
  process.exit(1);
}
const kopf = { "Content-Type": "application/json", Authorization: `Bearer ${secret}` };
const ziel = `${baseUrl}/api/admin/rueckgewinnung`;

async function ruf(methode, koerper) {
  const res = await fetch(ziel, { method: methode, headers: kopf, body: koerper ? JSON.stringify(koerper) : undefined });
  const daten = await res.json().catch(() => ({}));
  console.log(JSON.stringify(daten, null, 2));
  process.exit(daten.ok ? 0 : 1);
}

const schalter = arg("schalter", null);
if (schalter === "an" || schalter === "aus") await ruf("PUT", { rueckgewinnungMail: schalter === "an" });

const schreiben = arg("write", false) === true;
const nurAn = arg("nur-an", null);

if (!schreiben) await ruf("GET");
if (typeof nurAn === "string") await ruf("POST", { nurAn });
await ruf("POST", { limit: Number(arg("limit", 25)) });
