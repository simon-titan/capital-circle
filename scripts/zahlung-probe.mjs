/**
 * Einen Zahlungsfall zur Probe an das eigene Konto schicken — und wieder wegräumen.
 *
 * Die Logik steht im Endpunkt (`app/api/admin/zahlung-probe/route.ts`), dieses
 * Skript ist nur die Bedienung. **Schreibt einem echten Menschen: Nimm dein
 * eigenes Konto.**
 *
 *   npm run zahlung:probe -- --url https://www.capitalcircletrading.com --email du@beispiel.de
 *   npm run zahlung:probe -- --url … --email … --art erinnerung      (erster | erinnerung | gesperrt)
 *   npm run zahlung:probe -- --url … --email … --ohne-discord        (nur Mail prüfen)
 *   npm run zahlung:probe -- --url … --aufraeumen                    (alle Proben löschen)
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
  console.error("CRON_SECRET fehlt in .env.local (derselbe Wert wie im Deployment).");
  process.exit(1);
}

const koerper = arg("aufraeumen", false)
  ? { aufraeumen: true }
  : {
      email: arg("email", ""),
      art: arg("art", "erster"),
      ohneDiscord: arg("ohne-discord", false) === true,
    };

if (!koerper.aufraeumen && !koerper.email) {
  console.error("--email fehlt. Nimm dein eigenes Konto.");
  process.exit(1);
}

const res = await fetch(`${baseUrl}/api/admin/zahlung-probe`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
  body: JSON.stringify(koerper),
});
const daten = await res.json().catch(() => ({}));

if (!daten.ok) {
  console.error(`\nFehlgeschlagen (${res.status}): ${daten.error ?? "keine Begründung"}\n`);
  process.exit(1);
}

console.log("");
console.log(JSON.stringify(daten, null, 2));
console.log("");
