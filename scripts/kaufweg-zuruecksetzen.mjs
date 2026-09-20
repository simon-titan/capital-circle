/**
 * Kaufweg-Auswertung auf null setzen — für den Start ("ab jetzt sauber messen").
 *
 *   npm run kaufweg:reset
 *       Trockenlauf (Standard). Zählt je Tabelle, was gelöscht würde, zeigt die
 *       Kassen-Sitzungen nach Status und listet bezahlte einzeln auf. Löscht nichts.
 *
 *   npm run kaufweg:reset -- --apply
 *       Scharf. Löscht und zählt danach nach (Beleg statt Behauptung).
 *
 *   npm run kaufweg:reset -- --vor=2026-09-20T14:00:00Z [--apply]
 *       Grenze: Es wird nur gelöscht, was vor diesem Zeitpunkt (UTC) entstand.
 *       Ohne Angabe gilt „jetzt", also alles, was beim Start des Skripts da ist.
 *       Zeilen, die währenddessen neu hereinkommen, bleiben stehen.
 *
 * ── Was gelöscht wird ───────────────────────────────────────────────────────
 *
 * Alles, woraus `/admin/kaufweg` rechnet:
 *   funnel_ereignisse, funnel_sitzungen                   eigene Messung, Rohdaten
 *   funnel_tage, funnel_tage_bauteile, funnel_tage_abschnitte   Tagesrechnung
 *   checkout_sessions                                     Kassen-Trichter (Klick → Kasse → Zahlung)
 *
 * Die Tagesrechnung wird ganz geleert (nicht nur vor der Grenze): Sie ist
 * abgeleitet und wird aus dem Protokoll neu aufgebaut, sobald die Ansicht
 * aufgerufen wird. Ein Rest von „heute" bliebe sonst neben leerem Protokoll
 * stehen.
 *
 * ── Was NICHT angefasst wird ────────────────────────────────────────────────
 *
 * - `payments`, `subscriptions`, `profiles`: Buchhaltungs- und Vertragsdaten.
 *   Die Kaufweg-Ansicht liest daraus nur (fehlgeschlagene Zahlungen); die
 *   Zeilen sind Nachweise und gehören nicht in ein Zurücksetzen der Statistik.
 * - Stripe: Sitzungen und Zahlungen dort bleiben, wie sie sind.
 *
 * ── Wann ausführen ──────────────────────────────────────────────────────────
 *
 * Direkt vor dem Start, bevor Verkehr kommt. Läuft es mitten im Betrieb, verliert
 * eine Kasse, die gerade offen ist, ihre Herkunft (der Webhook findet die Zeile
 * nicht mehr). Der Kauf selbst ist davon nicht betroffen.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) dotenv.config({ path: full, override: false, quiet: true });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt (.env.local).");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const scharf = process.argv.includes("--apply");
const grenzeArg = process.argv.find((a) => a.startsWith("--vor="))?.split("=").slice(1).join("=");
const grenze = grenzeArg ? new Date(grenzeArg) : new Date();
if (Number.isNaN(grenze.getTime())) {
  console.error(`--vor=${grenzeArg} ist kein Zeitpunkt. Beispiel: --vor=2026-09-20T14:00:00Z`);
  process.exit(1);
}
const grenzeIso = grenze.toISOString();

/**
 * `zeit`: Spalte, nach der vor der Grenze gefiltert wird.
 * `alles`: ganze Tabelle leeren (abgeleitete Tagesrechnung, `tag` ist ein Datum ohne Uhrzeit).
 */
const TABELLEN = [
  { name: "funnel_ereignisse", zeit: "erzeugt_am", info: "Rohprotokoll der Messung" },
  { name: "funnel_sitzungen", zeit: "begonnen_am", info: "Stand je Sitzung" },
  { name: "funnel_tage", zeit: "tag", alles: true, info: "Tagesrechnung" },
  { name: "funnel_tage_bauteile", zeit: "tag", alles: true, info: "Tagesrechnung: Klicks je Knopf" },
  { name: "funnel_tage_abschnitte", zeit: "tag", alles: true, info: "Tagesrechnung: Abschnitte" },
  { name: "checkout_sessions", zeit: "created_at", info: "Kassen-Trichter" },
];

function filter(anfrage, t) {
  return t.alles ? anfrage.gte(t.zeit, "1970-01-01") : anfrage.lt(t.zeit, grenzeIso);
}

async function zaehle(t) {
  const { count, error } = await filter(supabase.from(t.name).select("*", { count: "exact", head: true }), t);
  if (error) return { fehler: error.message };
  return { count: count ?? 0 };
}

const host = new URL(url).host;
console.log(`Datenbank: ${host}`);
console.log(`Grenze:    ${grenzeIso}${grenzeArg ? "" : " (jetzt)"}`);
console.log(`Modus:     ${scharf ? "SCHARF, es wird gelöscht" : "Trockenlauf, es wird nichts gelöscht"}\n`);

// ── Bestand ────────────────────────────────────────────────────────────────
const vorher = new Map();
let fehlerAufgetreten = false;
for (const t of TABELLEN) {
  const r = await zaehle(t);
  vorher.set(t.name, r);
  if (r.fehler) {
    fehlerAufgetreten = true;
    console.log(`  ${t.name.padEnd(26)} nicht lesbar: ${r.fehler}`);
  } else {
    console.log(`  ${t.name.padEnd(26)} ${String(r.count).padStart(7)}   ${t.info}`);
  }
}

// ── Kassen-Sitzungen genauer ansehen ───────────────────────────────────────
const { data: kassen, error: kassenFehler } = await supabase
  .from("checkout_sessions")
  .select("id, plan, status, created_at, bezahlt_am")
  .lt("created_at", grenzeIso)
  .order("created_at", { ascending: true });

if (!kassenFehler && kassen && kassen.length > 0) {
  const nachStatus = {};
  for (const k of kassen) nachStatus[k.status] = (nachStatus[k.status] ?? 0) + 1;
  console.log(
    `\nKassen-Sitzungen nach Status: ${Object.entries(nachStatus)
      .map(([s, n]) => `${s} ${n}`)
      .join(" · ")}`,
  );
  console.log(`Ältester Eintrag: ${kassen[0].created_at}   Neuester: ${kassen[kassen.length - 1].created_at}`);

  const bezahlt = kassen.filter((k) => k.status === "completed");
  if (bezahlt.length > 0) {
    console.log(`\n⚠ ${bezahlt.length} bezahlte Kasse(n) würden aus der Auswertung verschwinden (Zahlung und Abo bleiben unberührt):`);
    for (const k of bezahlt.slice(0, 20)) {
      console.log(`    ${k.id.slice(0, 18)}…  ${k.plan}  bezahlt ${k.bezahlt_am ?? "?"}`);
    }
    if (bezahlt.length > 20) console.log(`    … und ${bezahlt.length - 20} weitere`);
    console.log("  Sind das echte Käufe, stehen sie weiter in Stripe, `payments` und `subscriptions`.");
  }
}

if (fehlerAufgetreten) {
  console.error("\nMindestens eine Tabelle war nicht lesbar (fehlt Migration 101?). Abbruch, es wurde nichts gelöscht.");
  process.exit(1);
}

const summe = [...vorher.values()].reduce((a, r) => a + (r.count ?? 0), 0);
if (!scharf) {
  console.log(`\nTrockenlauf: ${summe} Zeilen würden gelöscht. Scharf mit: npm run kaufweg:reset -- --apply`);
  process.exit(0);
}

// ── Löschen ────────────────────────────────────────────────────────────────
console.log("\nLösche …");
for (const t of TABELLEN) {
  const { error } = await filter(supabase.from(t.name).delete(), t);
  if (error) {
    console.error(`  ${t.name}: FEHLER ${error.message}`);
    process.exit(1);
  }
  console.log(`  ${t.name} geleert`);
}

// ── Beleg: nachzählen ──────────────────────────────────────────────────────
console.log("\nNachgezählt (Zeilen vor der Grenze, soll überall 0 sein):");
let sauber = true;
for (const t of TABELLEN) {
  const r = await zaehle(t);
  const n = r.count ?? -1;
  if (n !== 0) sauber = false;
  console.log(`  ${t.name.padEnd(26)} ${String(n).padStart(7)} ${n === 0 ? "✓" : "✗"}`);
}
if (!sauber) {
  console.error("\nEs sind noch Zeilen übrig. Bitte Ausgabe prüfen.");
  process.exit(1);
}
console.log("\nFertig. Ab jetzt zählt die Auswertung bei null.");
