/**
 * Die Whop-Umzugs-Kampagne bedienen (Mail + Discord-Direktnachricht).
 * Logik: `app/api/admin/whop-umzug/route.ts`. **Nichts davon läuft von selbst.**
 *
 *   npm run whop:umzug -- --url https://www.capitalcircletrading.com
 *       Trockenlauf: Stand je Mitglied, was fällig wäre. Verschickt nichts.
 *
 *   npm run whop:umzug -- --url … --nur-an delivered+cc-whop-…@resend.dev --write
 *       Einzeltest an eine Wegwerf-Adresse aus dem Import. Pflicht vor dem
 *       ersten scharfen Lauf: Was der Discord-Bot verschickt, kann still
 *       scheitern, ohne dass hier eine Fehlermeldung ankommt.
 *
 *   npm run whop:umzug -- --url … --stufe ankuendigung --write --limit 10
 *       Scharf, nur diese Stufe, höchstens 100 je Aufruf. Wiederholen, bis
 *       „verbleibend: 0".
 *
 *   npm run whop:umzug -- --url … --write
 *       Scharf, jede Stufe an den, bei dem sie fällig ist.
 *
 * Voraussetzung: Der Import ist gelaufen (`npm run whop:import`), sonst ist
 * der Empfängerkreis leer. `CRON_SECRET` muss lokal (.env.local) denselben
 * Wert haben wie im Deployment.
 */

import dotenv from "dotenv";
import path from "node:path";
import { existsSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) dotenv.config({ path: full, override: false, quiet: true });
}

function arg(name, fallback = undefined) {
  const mitWert = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (mitWert) return mitWert.split("=").slice(1).join("=");
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1) {
    const next = process.argv[i + 1];
    return next && !next.startsWith("--") ? next : true;
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
const ziel = `${baseUrl}/api/admin/whop-umzug`;

async function ruf(methode, koerper) {
  const res = await fetch(ziel, {
    method: methode,
    headers: kopf,
    body: koerper ? JSON.stringify(koerper) : undefined,
  });
  const daten = await res.json().catch(() => ({}));
  console.log(JSON.stringify(daten, null, 2));
  process.exit(daten.ok ? 0 : 1);
}

const schreiben = arg("write", false) === true;
const stufe = typeof arg("stufe") === "string" ? arg("stufe") : undefined;
const nurAn = arg("nur-an", null);

if (!schreiben) await ruf("GET");
if (typeof nurAn === "string") await ruf("POST", { nurAn, ...(stufe ? { stufe } : {}) });
await ruf("POST", { limit: Number(arg("limit", 25)), ...(stufe ? { stufe } : {}) });
