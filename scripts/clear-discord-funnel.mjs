/**
 * Discord-Funnel aufräumen / zurücksetzen.
 *
 * Löscht Zeilen aus den Funnel-Tabellen (discord_leads, discord_page_visits,
 * discord_video_views). Die Kanal-Konfiguration (discord_channels) wird NIE angefasst.
 *
 * SICHERHEIT: Ohne --confirm läuft alles als Dry-Run (zeigt nur, was gelöscht WÜRDE).
 *
 * Nutzung:
 *   node scripts/clear-discord-funnel.mjs [optionen]
 *   npm run clear:discord-funnel -- [optionen]
 *
 * Ziel-Tabellen (Default: nur --leads, wenn nichts angegeben):
 *   --all              alle drei Tabellen (Komplett-Reset des Funnels)
 *   --leads            discord_leads
 *   --visits           discord_page_visits
 *   --views            discord_video_views
 *
 * Filter (wirken auf discord_leads; passende Video-Views werden mitgelöscht):
 *   --test             nur Test-Leads (email/name enthält test|example|demo|asdf)
 *   --email=<teil>     nur Leads, deren E-Mail <teil> enthält (z. B. --email=@test.de)
 *   --source=<origin>  nur discord_funnel | termin_direct
 *   --before=<datum>   nur Zeilen mit created_at < Datum (ISO, z. B. 2026-06-01)
 *
 * Ausführen:
 *   --confirm          tatsächlich löschen (sonst Dry-Run)
 *
 * Beispiele:
 *   node scripts/clear-discord-funnel.mjs --test            # Vorschau Test-Leads
 *   node scripts/clear-discord-funnel.mjs --test --confirm  # Test-Leads löschen
 *   node scripts/clear-discord-funnel.mjs --all --confirm   # kompletter Funnel-Reset
 *   node scripts/clear-discord-funnel.mjs --email=@test.de --confirm
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "node:path";
import { existsSync } from "node:fs";

/* ── Env laden (.env.local, dann .env) ─────────────────────────────────────── */
for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) dotenv.config({ path: full, override: false });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) {
  console.error("✗ NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.");
  process.exit(1);
}

/* ── Argumente parsen ──────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (name) => {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
};

const confirm = has("--confirm");
const wantAll = has("--all");
const targets = {
  leads: wantAll || has("--leads"),
  visits: wantAll || has("--visits"),
  views: wantAll || has("--views"),
};
// Default: wenn kein Ziel angegeben wurde, nur Leads.
if (!targets.leads && !targets.visits && !targets.views) targets.leads = true;

const filters = {
  test: has("--test"),
  email: valueOf("--email"),
  source: valueOf("--source"),
  before: valueOf("--before"),
};

if (filters.source && !["discord_funnel", "termin_direct"].includes(filters.source)) {
  console.error("✗ --source muss discord_funnel oder termin_direct sein.");
  process.exit(1);
}

const TEST_PATTERNS = ["test", "example", "demo", "asdf"];
const ALL_TIME = "1970-01-01T00:00:00.000Z"; // Filter, der „alle Zeilen" matcht

const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });

/* ── Lead-Filter auf eine Query anwenden ───────────────────────────────────── */
function applyLeadFilters(query) {
  let q = query;
  if (filters.email) q = q.ilike("email", `%${filters.email}%`);
  if (filters.source) q = q.eq("source_origin", filters.source);
  if (filters.before) q = q.lt("created_at", new Date(filters.before).toISOString());
  if (filters.test) {
    // E-Mail ODER Name enthält eines der Test-Muster.
    const ors = TEST_PATTERNS.flatMap((p) => [`email.ilike.%${p}%`, `name.ilike.%${p}%`]);
    q = q.or(ors.join(","));
  }
  return q;
}

const hasLeadFilter = filters.test || filters.email || filters.source || filters.before;

async function countLeads() {
  const { count, error } = await applyLeadFilters(
    supabase.from("discord_leads").select("id", { count: "exact", head: true }),
  );
  if (error) throw error;
  return count ?? 0;
}

async function fetchTargetLeadIds() {
  // Holt alle betroffenen Lead-IDs/Token (für das Mitlöschen der Video-Views).
  const ids = [];
  const tokens = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await applyLeadFilters(
      supabase.from("discord_leads").select("id, token"),
    ).range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) {
      ids.push(r.id);
      if (r.token) tokens.push(r.token);
    }
    if (data.length < pageSize) break;
  }
  return { ids, tokens };
}

async function countAll(table) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/* ── Hauptlauf ─────────────────────────────────────────────────────────────── */
const mode = confirm ? "LÖSCHEN" : "DRY-RUN (nur Vorschau)";
console.log(`\n🧹 Discord-Funnel bereinigen — Modus: ${mode}`);
console.log(`   Ziel-Tabellen: ${Object.entries(targets).filter(([, v]) => v).map(([k]) => k).join(", ")}`);
console.log(
  `   Filter: ${hasLeadFilter
    ? [
        filters.test && "test",
        filters.email && `email~${filters.email}`,
        filters.source && `source=${filters.source}`,
        filters.before && `before<${filters.before}`,
      ].filter(Boolean).join(", ")
    : "keine (ALLE Zeilen)"}`,
);
console.log("");

try {
  /* Leads (+ zugehörige Video-Views) */
  if (targets.leads) {
    const leadCount = hasLeadFilter ? await countLeads() : await countAll("discord_leads");
    console.log(`• discord_leads: ${leadCount} Zeile(n) betroffen`);

    if (confirm && leadCount > 0) {
      if (hasLeadFilter) {
        const { ids } = await fetchTargetLeadIds();
        // Zugehörige Video-Views zuerst (FK ist ON DELETE SET NULL → würden sonst verwaisen).
        if (ids.length > 0) {
          const { error: vErr } = await supabase
            .from("discord_video_views")
            .delete()
            .in("lead_id", ids);
          if (vErr) throw vErr;
        }
        // Leads in Blöcken löschen.
        for (let i = 0; i < ids.length; i += 1000) {
          const chunk = ids.slice(i, i + 1000);
          const { error } = await supabase.from("discord_leads").delete().in("id", chunk);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from("discord_leads").delete().gte("created_at", ALL_TIME);
        if (error) throw error;
      }
      console.log(`  ✓ ${leadCount} Lead(s) gelöscht (inkl. zugehöriger Video-Views).`);
    }
  }

  /* Page Visits */
  if (targets.visits) {
    const c = await countAll("discord_page_visits");
    console.log(`• discord_page_visits: ${c} Zeile(n) betroffen`);
    if (confirm && c > 0) {
      const { error } = await supabase.from("discord_page_visits").delete().gte("created_at", ALL_TIME);
      if (error) throw error;
      console.log(`  ✓ ${c} Visit(s) gelöscht.`);
    }
  }

  /* Video Views (komplett — nur wenn explizit als Ziel gewählt) */
  if (targets.views) {
    const c = await countAll("discord_video_views");
    console.log(`• discord_video_views: ${c} Zeile(n) betroffen`);
    if (confirm && c > 0) {
      const { error } = await supabase.from("discord_video_views").delete().gte("created_at", ALL_TIME);
      if (error) throw error;
      console.log(`  ✓ ${c} View(s) gelöscht.`);
    }
  }

  console.log("");
  if (confirm) {
    console.log("✅ Fertig. discord_channels wurde NICHT verändert.");
  } else {
    console.log("ℹ️  Dry-Run — es wurde nichts gelöscht. Mit --confirm ausführen, um wirklich zu löschen.");
  }
  console.log("");
} catch (err) {
  console.error("\n✗ Fehler:", err?.message ?? err);
  process.exit(1);
}
