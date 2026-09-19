/**
 * Die Warteraumrolle für den Bestand nachziehen — oder an einem einzelnen
 * Konto testen.
 *
 * Die Logik steht in `app/api/admin/warteraum-rolle/route.ts`.
 *
 *   npm run discord:warteraum-rolle -- --url https://www.capitalcircletrading.com
 *       Probelauf, schreibt nichts. Gruppen mit Namen und Sperrdatum.
 *
 *   npm run discord:warteraum-rolle -- --url … --write --anzahl <n>
 *       Scharf. Ohne --anzahl passiert nichts, und weicht die Menge seit dem
 *       Probelauf ab, ebenfalls nicht.
 *
 *   npm run discord:warteraum-rolle -- --url … --nur <discord-id> --write [--entziehen]
 *       Genau ein Konto — für den Test am EIGENEN Discord. Danach in Discord
 *       nachsehen: sichtbar ist der Warteraum, das Textfeld ist gesperrt.
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
const schreiben = arg("write", false) === true;
const nur = arg("nur", null);
const anzahl = arg("anzahl", null);
const secret = process.env.CRON_SECRET?.trim();
if (!secret) {
  console.error("CRON_SECRET fehlt (in .env.local eintragen, derselbe Wert wie im Deployment).");
  process.exit(1);
}
const kopf = { "Content-Type": "application/json", Authorization: `Bearer ${secret}` };
const ziel = `${baseUrl}/api/admin/warteraum-rolle`;

if (typeof nur === "string") {
  if (!schreiben) {
    console.log(`\nWürde die Warteraumrolle bei ${nur} ${arg("entziehen", false) ? "entziehen" : "setzen"}. Scharf mit --write.\n`);
    process.exit(0);
  }
  const res = await fetch(ziel, {
    method: "POST",
    headers: kopf,
    body: JSON.stringify({ nur, entziehen: arg("entziehen", false) === true }),
  });
  console.log(JSON.stringify(await res.json().catch(() => ({})), null, 2));
  process.exit(0);
}

if (schreiben) {
  if (anzahl === null || anzahl === true) {
    console.error("--anzahl fehlt. Erst den Probelauf aufrufen und die Zahl von dort übernehmen.");
    process.exit(1);
  }
  const res = await fetch(ziel, { method: "POST", headers: kopf, body: JSON.stringify({ anzahl: Number(anzahl) }) });
  const daten = await res.json().catch(() => ({}));
  console.log(JSON.stringify(daten, null, 2));
  process.exit(daten.ok ? 0 : 1);
}

const res = await fetch(ziel, { headers: kopf });
const stand = await res.json().catch(() => ({}));
if (!stand.ok) {
  console.error(`\nFehlgeschlagen (${res.status}): ${stand.error ?? "keine Begründung"}\n`);
  process.exit(1);
}

const zeige = (titel, liste) => {
  console.log(`\n${titel}: ${liste.length}`);
  for (const z of liste) {
    console.log(
      `  ${z.username.padEnd(28)} ${z.discordId}  ${z.gesperrtSeit ? `ohne Zugang seit ${z.gesperrtSeit.slice(0, 10)}` : "kein Datum"}` +
        (z.sofortFaellig ? "  SOFORT FÄLLIG" : ""),
    );
  }
};

zeige("Bekommt den Warteraum", stand.bekommt);
zeige("Hat ihn schon", stand.hatSchon);
zeige("Mitgliederrolle ohne Zugang (Bestandsabgleich)", stand.mitRolleOhneZugang);
console.log(`\nAuf dem Server ohne Konto (nicht erfasst): ${stand.ohneKonto}`);
for (const h of stand.hinweise ?? []) console.log(`\nHinweis: ${h}`);
console.log(`\nProbelauf. Scharf mit: --write --anzahl ${stand.bekommt.length}\n`);
