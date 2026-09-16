/**
 * Findet Migrationen, die im Repo liegen, aber nicht in der Datenbank stecken.
 *
 * Es gibt keine Migrationstabelle in diesem Projekt (kein `supabase db push`),
 * deshalb wird nicht der Verlauf geprueft, sondern das Ergebnis: Aus jeder
 * `.sql` werden die erzeugten Tabellen und Spalten gelesen und einzeln gegen
 * PostgREST abgefragt. Was fehlt, ist nicht eingespielt.
 *
 * Aufgedeckt hat das zuerst ein 500er auf POST /api/progress: Der Select zog
 * `profiles.total_learning_seconds`, die Spalte fehlte, PostgREST lieferte einen
 * Fehler statt Daten — und weil der Code die Zeile fuer garantiert hielt, kippte
 * die Route. Kein Fortschritt wurde mehr gespeichert.
 *
 *   node scripts/check-migrations-applied.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

for (const f of [".env.local", ".env"]) {
  const p = path.resolve(process.cwd(), f);
  if (existsSync(p)) dotenv.config({ path: p, override: false });
}

const DIR = path.resolve(process.cwd(), "supabase/migrations");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/** `create table [if not exists] [public.]name (` → Tabellenname. */
function tabellenAus(sql) {
  return [...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?/gi)].map(
    (m) => m[1],
  );
}

/** `alter table [public.]name ... add column [if not exists] spalte` → [tabelle, spalte]. */
function spaltenAus(sql) {
  const out = [];
  // Ein `alter table` kann mehrere `add column` in einer Anweisung haben.
  for (const block of sql.split(/;\s*/)) {
    const tab = block.match(/alter\s+table\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?/i)?.[1];
    if (!tab) continue;
    for (const m of block.matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-z_][a-z0-9_]*)"?/gi)) {
      out.push([tab, m[1]]);
    }
  }
  return out;
}

const cacheTabelle = new Map();
async function tabelleExistiert(name) {
  if (cacheTabelle.has(name)) return cacheTabelle.get(name);
  const { error } = await supabase.from(name).select("*").limit(0);
  const da = !error || !/does not exist|schema cache/i.test(error.message);
  cacheTabelle.set(name, da);
  return da;
}

async function spalteExistiert(tabelle, spalte) {
  if (!(await tabelleExistiert(tabelle))) return "tabelle-fehlt";
  const { error } = await supabase.from(tabelle).select(spalte).limit(0);
  return error && /does not exist/i.test(error.message) ? false : true;
}

const dateien = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql") && !f.startsWith("_"))
  .sort();

console.log(`${dateien.length} Migrationsdateien werden gegen die Datenbank geprueft …\n`);

const offen = [];

for (const datei of dateien) {
  const sql = readFileSync(path.join(DIR, datei), "utf8");
  const fehlend = [];

  for (const t of new Set(tabellenAus(sql))) {
    if (!(await tabelleExistiert(t))) fehlend.push(`Tabelle ${t}`);
  }
  for (const [t, c] of spaltenAus(sql)) {
    const r = await spalteExistiert(t, c);
    // Fehlt die Tabelle schon, ist sie oben gemeldet — nicht doppelt auffuehren.
    if (r === false) fehlend.push(`${t}.${c}`);
  }

  if (fehlend.length > 0) {
    offen.push({ datei, fehlend });
    console.log(`  NICHT EINGESPIELT  ${datei}`);
    for (const f of fehlend.slice(0, 6)) console.log(`       fehlt: ${f}`);
    if (fehlend.length > 6) console.log(`       … und ${fehlend.length - 6} weitere`);
  }
}

console.log();
if (offen.length === 0) {
  console.log("Alle Migrationen sind eingespielt.");
} else {
  console.log(`${offen.length} Migration(en) fehlen in der Datenbank:`);
  for (const o of offen) console.log(`  ${o.datei}`);
  console.log(`\nMit "node scripts/build-pending-migrations.mjs" eine Sammeldatei daraus bauen.`);
}
process.exit(offen.length === 0 ? 0 : 1);
