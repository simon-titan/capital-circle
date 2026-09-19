/**
 * Die angepinnte Erklärung im Warteraum setzen oder angleichen.
 *
 * Der Text steht in `config/warteraum.ts`, die Logik im Endpunkt
 * (`app/api/admin/warteraum/route.ts`). Dieses Skript ist nur die Bedienung.
 *
 *   1) Probelauf. Zeigt den Text und was passieren würde:
 *      npm run discord:warteraum -- --url https://www.capitalcircletrading.com
 *
 *   2) Scharf. Postet und pinnt, oder gleicht die bestehende Nachricht an:
 *      npm run discord:warteraum -- --url … --write
 *
 * Beliebig oft aufrufbar: Es entsteht höchstens **eine** Bot-Nachricht im
 * Kanal, jeder weitere Lauf bearbeitet sie.
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
const secret = process.env.CRON_SECRET?.trim();

if (!secret) {
  console.error("CRON_SECRET fehlt (in .env.local eintragen, derselbe Wert wie im Deployment).");
  process.exit(1);
}

const kopf = { "Content-Type": "application/json", Authorization: `Bearer ${secret}` };

const probeRes = await fetch(`${baseUrl}/api/admin/warteraum`, { headers: kopf });
const probe = await probeRes.json().catch(() => ({}));

if (!probe.ok) {
  console.error(`\nFehlgeschlagen (${probeRes.status}): ${probe.error ?? "keine Begründung"}\n`);
  process.exit(1);
}

console.log(`\nWarteraum-Kanal ${probe.kanal}`);
console.log(
  `Eigene Nachricht: ${probe.eigeneNachricht ?? "keine"}` +
    (probe.eigeneNachricht ? (probe.angeheftet ? ", angeheftet" : ", NICHT angeheftet") : ""),
);
if (probe.aufraeumen > 0) console.log(`Aufzuräumen    : ${probe.aufraeumen} Systemnachricht(en) vom Anheften`);
if ((probe.fremdePins ?? []).length > 0) {
  console.log(`\nAchtung: ${probe.fremdePins.length} angepinnte Nachricht(en) stammen nicht vom Bot.`);
  console.log("         Der Bot kann sie nicht bearbeiten. Steht dort eine ältere Fassung der");
  console.log("         Erklärung, bitte von Hand lösen, sonst stehen zwei nebeneinander.");
}

console.log(`\nKnopf: „${probe.knopf.label}“ (${probe.knopf.customId})`);
console.log("\n" + "-".repeat(72));
console.log(probe.text);
console.log("-".repeat(72));

if (!schreiben) {
  console.log(`\nProbelauf. Es wurde nichts geändert. Würde: ${probe.wuerde}.`);
  console.log("Scharf mit --write.\n");
  process.exit(0);
}

const res = await fetch(`${baseUrl}/api/admin/warteraum`, { method: "POST", headers: kopf });
const daten = await res.json().catch(() => ({}));
if (!daten.ok) {
  console.error(`\nFehlgeschlagen (${res.status}): ${daten.error ?? "keine Begründung"}\n`);
  process.exit(1);
}
console.log(`\nErledigt: ${daten.aktion} (Nachricht ${daten.messageId}, ${daten.aufgeraeumt} Systemnachricht(en) entfernt).\n`);
