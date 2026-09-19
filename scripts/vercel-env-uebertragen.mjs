#!/usr/bin/env node
/**
 * Umgebungsvariablen aus `.env.local` in das **verknuepfte** Vercel-Projekt
 * schreiben.
 *
 * ── Warum aus `.env.local` und nicht aus dem alten Projekt ──────────────────
 *
 * `vercel env pull` gibt als „Sensitive" angelegte Werte nur als Platzhalter
 * zurueck — ein Umzug von Projekt zu Projekt waere damit unvollstaendig, und
 * zwar still. Die vollstaendige Quelle ist die lokale Datei; Abweichungen fuer
 * Produktion stehen unten in `PRODUKTION` und werden dabei uebersteuert.
 *
 * ── Nutzung ────────────────────────────────────────────────────────────────
 *
 *   vercel login                 # mit dem ZIEL-Konto anmelden
 *   vercel link                  # Zielprojekt verknuepfen (legt .vercel/ an)
 *   node scripts/vercel-env-uebertragen.mjs              # Trockenlauf
 *   node scripts/vercel-env-uebertragen.mjs --apply      # schreibt wirklich
 *
 * Optionen:
 *   --env=production,preview     Zielumgebungen (Standard: beide)
 *   --nur=NAME1,NAME2            nur diese Variablen
 *   --ueberschreiben             vorhandene Werte im Ziel ersetzen
 *
 * Werte werden ueber die Standardeingabe uebergeben, tauchen also weder in der
 * Prozessliste noch im Protokoll auf. Ausgegeben werden nur Namen.
 */

import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const WURZEL = process.cwd();
const DATEI = path.join(WURZEL, ".env.local");

/** Diese Werte gehoeren nicht nach Vercel. */
const NICHT_UEBERTRAGEN = new Set([
  // Der Bucket existiert nicht mehr (siehe AGENTS.md).
  "HETZNER_ENDPOINT",
  "HETZNER_BUCKET_NAME",
  "HETZNER_ACCESS_KEY",
  "HETZNER_SECRET_KEY",
  "STORAGE_LEGACY_FALLBACK",
  // Nur fuer die lokale Entwicklung.
  "WARTUNG_LOKAL_AUS",
  // Setzt Vercel selbst.
  "VERCEL_OIDC_TOKEN",
  // Hilfsnamen fuer den Live-Umstieg, werden unten abgebildet.
  "STRIPE_SECRET_KEY_LIVE",
  "STRIPE_PUBLISHABLE_KEY_LIVE",
  "STRIPE_WEBHOOK_SECRET_LIVE",
  "STRIPE_PRICE_MONTHLY_LIVE",
  "STRIPE_PRICE_QUARTERLY_LIVE",
  "STRIPE_PRICE_YEARLY_LIVE",
  "STRIPE_PRICE_LIFETIME_LIVE",
]);

/**
 * Abweichungen fuer Produktion und Vorschau. Lokal zeigt vieles auf
 * `localhost`; im Deployment muss es die oeffentliche Adresse sein.
 */
const PRODUKTION = {
  NEXT_PUBLIC_APP_URL: "https://www.capitalcircletrading.com",
  NEXT_PUBLIC_SITE_URL: "https://www.capitalcircletrading.com",
  WELCOME_MAIL_PUBLIC_URL: "https://www.capitalcircletrading.com",
  /*
   * Bewusst die Adresse ohne `www.`: Genau so steht sie im Discord Developer
   * Portal, und beide muessen zeichengleich sein. Wer das aendert, aendert es
   * dort mit.
   */
  DISCORD_REDIRECT_URI: "https://capitalcircletrading.com/api/discord/callback",
};

/**
 * Live-Umstieg: Stehen die `_LIVE`-Schluessel in der Datei, gehen sie unter
 * den echten Namen nach Produktion. Die Vorschau bleibt auf Testmodus, damit
 * ein Branch-Deploy niemals echtes Geld bewegt.
 */
const NUR_PRODUKTION_LIVE = {
  STRIPE_SECRET_KEY: "STRIPE_SECRET_KEY_LIVE",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "STRIPE_PUBLISHABLE_KEY_LIVE",
  STRIPE_WEBHOOK_SECRET: "STRIPE_WEBHOOK_SECRET_LIVE",
  STRIPE_PRICE_MONTHLY: "STRIPE_PRICE_MONTHLY_LIVE",
  STRIPE_PRICE_QUARTERLY: "STRIPE_PRICE_QUARTERLY_LIVE",
  STRIPE_PRICE_YEARLY: "STRIPE_PRICE_YEARLY_LIVE",
  STRIPE_PRICE_LIFETIME: "STRIPE_PRICE_LIFETIME_LIVE",
};

/** Alles, was kein `NEXT_PUBLIC_` traegt, wird als Secret angelegt. */
function istGeheim(name) {
  return !name.startsWith("NEXT_PUBLIC_");
}

function leseEnvDatei(pfad) {
  if (!existsSync(pfad)) {
    console.error(`Datei fehlt: ${pfad}`);
    process.exit(1);
  }
  const werte = new Map();
  const text = readFileSync(pfad, "utf8");
  const zeilen = text.split(/\r?\n/);
  for (let i = 0; i < zeilen.length; i++) {
    const zeile = zeilen[i];
    if (!zeile || zeile.trimStart().startsWith("#")) continue;
    const treffer = zeile.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!treffer) continue;
    const name = treffer[1];
    let wert = treffer[2];
    // Mehrzeilige Werte in Anfuehrungszeichen (z. B. privater Schluessel).
    if (/^"/.test(wert) && !/"\s*$/.test(wert)) {
      const teile = [wert];
      while (i + 1 < zeilen.length && !/"\s*$/.test(zeilen[i + 1])) teile.push(zeilen[++i]);
      if (i + 1 < zeilen.length) teile.push(zeilen[++i]);
      wert = teile.join("\n");
    }
    wert = wert.trim();
    if ((wert.startsWith('"') && wert.endsWith('"')) || (wert.startsWith("'") && wert.endsWith("'"))) {
      wert = wert.slice(1, -1);
    }
    werte.set(name, wert);
  }
  return werte;
}

function vercel(args, eingabe) {
  return new Promise((fertig) => {
    const p = spawn("vercel", args, { shell: true, stdio: ["pipe", "pipe", "pipe"] });
    let aus = "";
    p.stdout.on("data", (d) => (aus += d));
    p.stderr.on("data", (d) => (aus += d));
    if (eingabe !== undefined) {
      p.stdin.write(eingabe);
      p.stdin.end();
    }
    p.on("close", (code) => fertig({ code, aus }));
  });
}

const args = process.argv.slice(2);
const scharf = args.includes("--apply");
const ueberschreiben = args.includes("--ueberschreiben");
const umgebungen = (args.find((a) => a.startsWith("--env="))?.split("=")[1] ?? "production,preview")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const nur = args.find((a) => a.startsWith("--nur="))?.split("=")[1]?.split(",").map((s) => s.trim());

if (!existsSync(path.join(WURZEL, ".vercel", "project.json"))) {
  console.error("Kein verknuepftes Projekt. Erst `vercel link` im Zielprojekt ausfuehren.");
  process.exit(1);
}
const projekt = JSON.parse(readFileSync(path.join(WURZEL, ".vercel", "project.json"), "utf8"));

const lokal = leseEnvDatei(DATEI);

console.log(`Ziel: ${projekt.projectName ?? projekt.projectId}`);
console.log(`Umgebungen: ${umgebungen.join(", ")}`);
console.log(`Modus: ${scharf ? "SCHARF" : "Trockenlauf"}${ueberschreiben ? " · vorhandene ersetzen" : ""}\n`);

const vorhanden = new Set();
{
  const { aus } = await vercel(["env", "ls"]);
  for (const zeile of aus.split(/\r?\n/)) {
    const t = zeile.trim().match(/^([A-Z][A-Z0-9_]*)\s/);
    if (t) vorhanden.add(t[1]);
  }
}

const plan = [];
for (const [name, wert] of lokal) {
  if (NICHT_UEBERTRAGEN.has(name)) continue;
  if (nur && !nur.includes(name)) continue;
  if (!wert) continue; // leere Schluessel haben im Code einen Rueckfall
  for (const env of umgebungen) {
    const ueber = env === "production" ? PRODUKTION[name] : PRODUKTION[name];
    plan.push({ name, env, wert: ueber ?? wert, quelle: ueber ? "Produktionswert" : "lokal" });
  }
}
// Live-Schluessel nur fuer Produktion
for (const [ziel, herkunft] of Object.entries(NUR_PRODUKTION_LIVE)) {
  const wert = lokal.get(herkunft);
  if (!wert) continue;
  const i = plan.findIndex((p) => p.name === ziel && p.env === "production");
  if (i >= 0) plan.splice(i, 1);
  plan.push({ name: ziel, env: "production", wert, quelle: `aus ${herkunft}` });
}

let geschrieben = 0;
let uebersprungen = 0;
for (const eintrag of plan) {
  const schonDa = vorhanden.has(eintrag.name);
  if (schonDa && !ueberschreiben) {
    uebersprungen++;
    console.log(`  · ${eintrag.name} [${eintrag.env}] — schon vorhanden, uebersprungen`);
    continue;
  }
  const kennzeichen = `${eintrag.name} [${eintrag.env}] (${eintrag.quelle}${istGeheim(eintrag.name) ? ", secret" : ""})`;
  if (!scharf) {
    console.log(`  + ${kennzeichen}`);
    geschrieben++;
    continue;
  }
  if (schonDa && ueberschreiben) await vercel(["env", "rm", eintrag.name, eintrag.env, "--yes"]);
  /*
   * `--type config` fuer oeffentliche Werte: Sieht ein `NEXT_PUBLIC_`-Wert wie
   * ein Geheimnis aus (etwa der Supabase-Anon-Schluessel, ein JWT), fragt die
   * CLI sonst nach und bricht ohne Eingabe ab — still, mitten im Lauf.
   */
  const flags = ["env", "add", eintrag.name, eintrag.env, "--yes"];
  flags.push(istGeheim(eintrag.name) ? "--sensitive" : "--type", ...(istGeheim(eintrag.name) ? [] : ["config"]));
  const { code, aus } = await vercel(flags, eintrag.wert);
  if (code === 0) {
    geschrieben++;
    console.log(`  ✓ ${kennzeichen}`);
  } else {
    console.log(`  ✗ ${kennzeichen}\n      ${aus.split(/\r?\n/).filter(Boolean).slice(-2).join(" | ")}`);
  }
}

console.log(`\n${scharf ? "Geschrieben" : "Wuerde schreiben"}: ${geschrieben} · uebersprungen: ${uebersprungen}`);
if (!scharf) console.log("Mit --apply wirklich schreiben.");
console.log("\nDanach pruefen: vercel env ls   und anschliessend neu deployen.");
