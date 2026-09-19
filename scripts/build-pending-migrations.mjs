/**
 * Baut aus den noch nicht eingespielten Migrationen eine einzelne, wiederholbar
 * ausfuehrbare SQL-Datei fuer den Supabase-SQL-Editor.
 *
 * `create policy` und `create trigger` kennen kein IF NOT EXISTS. Ohne Vorab-
 * Loeschen bricht ein zweiter Durchlauf mit 42710 ab — und genau das passiert,
 * wenn der erste Lauf mittendrin scheitert. Deshalb wird vor jedem CREATE ein
 * passendes `drop ... if exists` eingefuegt.
 *
 *   node scripts/build-pending-migrations.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const AUSSTEHEND = [
  "006_dashboard",
  "019_live_session_replays",
  "040_learning_seconds_accumulation",
  // Achtung: loescht alle Live-Session-Daten (Feedback 17.09.2026). Der Hinweis
  // steht ausfuehrlich im Kopf der Migration und wandert in die Sammeldatei mit.
  "070_live_session_kategorien_neu",
  // Lifetime-Freischaltung: Spalte `profiles.lifetime_offer_group` plus den
  // globalen Schalter in `app_settings`. Additiv, loescht nichts.
  "071_lifetime_freischaltung",
  // Kündigungsbutton (§ 312k BGB): neue Tabelle `kuendigungen`, RLS an, keine
  // Policies. Additiv. Solange sie fehlt, nimmt `/kuendigen` Kündigungen trotzdem
  // an — dann ist nur die Betreiber-Mail der Beleg.
  "072_kuendigungen",
  // Widerrufsfunktion (§ 356a BGB): neue Tabelle `widerrufe`, RLS an, keine
  // Policies, Rechte für anon/authenticated entzogen. Additiv. Solange sie
  // fehlt, nimmt `/widerrufen` Widerrufe trotzdem an — dann ist nur die
  // Betreiber-Mail der Beleg.
  "090_widerrufe",
];

const DIR = path.resolve(process.cwd(), "supabase/migrations");
const ZIEL = path.join(DIR, "_JETZT_EINSPIELEN.sql");

/**
 * `create policy "name" on tabelle` → vorher `drop policy if exists …`.
 * Einige Migrationen bringen den Guard schon mit; dann nicht doppelt einfuegen.
 */
function guardPolicies(sql) {
  return sql.replace(
    /^(\s*)create policy\s+("(?:[^"]+)"|[a-z_][a-z0-9_]*)\s+on\s+([a-z_.][a-z0-9_.]*)/gim,
    (treffer, einzug, name, tabelle, versatz, ganzes) => {
      const davor = ganzes.slice(Math.max(0, versatz - 200), versatz);
      if (new RegExp(`drop policy if exists\\s+${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`, "i").test(davor)) {
        return treffer;
      }
      return `${einzug}drop policy if exists ${name} on ${tabelle};\n${einzug}create policy ${name} on ${tabelle}`;
    },
  );
}

/** `create trigger name ... on tabelle` → vorher `drop trigger if exists name on tabelle`. */
function guardTriggers(sql) {
  return sql.replace(
    /^(\s*)create trigger\s+([a-z_][a-z0-9_]*)([\s\S]*?)\bon\s+([a-z_.][a-z0-9_.]*)/gim,
    (treffer, einzug, name, mitte, tabelle, versatz, ganzes) => {
      const davor = ganzes.slice(Math.max(0, versatz - 200), versatz);
      if (new RegExp(`drop trigger if exists\\s+${name}\\b`, "i").test(davor)) return treffer;
      return `${einzug}drop trigger if exists ${name} on ${tabelle};\n${einzug}create trigger ${name}${mitte}on ${tabelle}`;
    },
  );
}

const kopf = `-- ══════════════════════════════════════════════════════════════════════════
-- Sammeldatei: fehlende Migrationen — erzeugt am ${new Date().toISOString().slice(0, 10)}
-- von scripts/build-pending-migrations.mjs. Nicht von Hand bearbeiten.
--
-- Diese Migrationen fehlen auf der Produktions-Datenbank. Ermittelt mit
-- scripts/check-migrations-applied.mjs (prueft Tabellen und Spalten einzeln,
-- weil es in diesem Projekt keine Migrationstabelle gibt).
--
-- Einspielen: Supabase Dashboard → SQL Editor → Inhalt einfuegen → Run.
--
-- Wiederholbar: vor jedem CREATE POLICY / CREATE TRIGGER steht ein
-- DROP ... IF EXISTS, Tabellen/Spalten/Indizes nutzen IF NOT EXISTS.
-- Ein abgebrochener Lauf kann also einfach neu gestartet werden.
-- ══════════════════════════════════════════════════════════════════════════
`;

const teile = [kopf];
for (const name of AUSSTEHEND) {
  const roh = readFileSync(path.join(DIR, `${name}.sql`), "utf8");
  const sql = guardTriggers(guardPolicies(roh));
  teile.push(
    `\n\n-- ───────────────────────────────────────────────────────────────────────────`,
    `\n-- ${name}.sql`,
    `\n-- ───────────────────────────────────────────────────────────────────────────\n`,
    sql.trimEnd(),
    "\n",
  );
}

/**
 * Manche Quell-Migrationen bringen ihren Guard schon mit — je nach Abstand zum
 * CREATE greift die Vorab-Pruefung oben nicht. Hier faellt jede Wiederholung
 * derselben DROP-Anweisung raus, solange dazwischen nur Leerzeilen stehen.
 */
function entdoppleGuards(sql) {
  const zeilen = sql.split("\n");
  const raus = new Set();
  const gesehen = new Map(); // normalisierte DROP-Anweisung → Zeilenindex
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i].trim();
    if (!/^drop (policy|trigger) if exists/i.test(z)) {
      if (z !== "") gesehen.clear();
      continue;
    }
    const key = z.toLowerCase();
    if (gesehen.has(key)) raus.add(i);
    else gesehen.set(key, i);
  }
  return zeilen.filter((_, i) => !raus.has(i)).join("\n");
}

/**
 * Klammern zaehlen — ausserhalb von Zeichenketten, Dollar-Quoting und Kommentaren.
 * Migration 040 lag mit einer fehlenden `)` im Repo; der Fehler faellt erst im
 * SQL-Editor auf, und dann mitten im Einspielen. Lieber hier abbrechen.
 */
function klammerSaldo(sql) {
  let saldo = 0;
  let i = 0;
  while (i < sql.length) {
    const rest = sql.slice(i);
    if (rest.startsWith("--")) {
      i = sql.indexOf("\n", i);
      if (i < 0) break;
      continue;
    }
    if (rest.startsWith("/*")) {
      const ende = sql.indexOf("*/", i + 2);
      i = ende < 0 ? sql.length : ende + 2;
      continue;
    }
    if (sql[i] === "'") {
      i++;
      while (i < sql.length && sql[i] !== "'") i++;
      i++;
      continue;
    }
    const dollar = rest.match(/^\$[a-z_]*\$/i);
    if (dollar) {
      const marke = dollar[0];
      const ende = sql.indexOf(marke, i + marke.length);
      i = ende < 0 ? sql.length : ende + marke.length;
      continue;
    }
    if (sql[i] === "(") saldo++;
    else if (sql[i] === ")") saldo--;
    i++;
  }
  return saldo;
}

for (const name of AUSSTEHEND) {
  const saldo = klammerSaldo(readFileSync(path.join(DIR, `${name}.sql`), "utf8"));
  if (saldo !== 0) {
    console.error(
      `ABBRUCH: ${name}.sql hat eine unausgeglichene Klammerbilanz (${saldo > 0 ? `${saldo} zu viel offen` : `${-saldo} zu viel geschlossen`}).`,
    );
    console.error("Die Datei wuerde im SQL-Editor mit einem Syntaxfehler abbrechen. Erst korrigieren.");
    process.exit(1);
  }
}

const inhalt = entdoppleGuards(teile.join(""));
writeFileSync(ZIEL, inhalt, "utf8");

const policies = (inhalt.match(/drop policy if exists/gi) ?? []).length;
const trigger = (inhalt.match(/drop trigger if exists/gi) ?? []).length;
console.log(`${path.relative(process.cwd(), ZIEL)} geschrieben`);
console.log(`  ${AUSSTEHEND.length} Migrationen · ${inhalt.split("\n").length} Zeilen`);
console.log(`  ${policies} Policy-Guards, ${trigger} Trigger-Guards eingefuegt`);
