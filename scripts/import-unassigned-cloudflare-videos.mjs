/**
 * Holt Videos, die in Cloudflare Stream liegen aber keine Datenbankzeile haben,
 * als **nicht zugeordnete** Videos in die Plattform. Sie landen ohne Modul und
 * ohne Untermodul im Stapel und werden im Admin per Drag & Drop einsortiert.
 *
 * Braucht Migration 070 (erlaubt `module_id is null and subcategory_id is null`).
 *
 * Idempotent: Videos, deren UID schon in `videos.cloudflare_uid` steht, werden
 * uebersprungen. Beliebig oft wiederholbar.
 *
 *   node scripts/import-unassigned-cloudflare-videos.mjs           Dry-Run
 *   node scripts/import-unassigned-cloudflare-videos.mjs --apply   legt die Zeilen an
 *   ... --apply --nur-fertige     nur Videos mit Status "ready" (Vorgabe)
 *   ... --apply --auch-unfertige  auch solche, die noch verarbeitet werden
 */
import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) dotenv.config({ path: full, override: false });
}

const argv = process.argv.slice(2);
const apply = argv.includes("--apply");
const auchUnfertige = argv.includes("--auch-unfertige");

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const API_TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN?.trim();
if (!ACCOUNT_ID || !API_TOKEN) throw new Error("CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_STREAM_API_TOKEN fehlen");

/**
 * UIDs, die absichtlich nicht in die Plattform gehoeren: oeffentliche Funnel-
 * Videos aus den NEXT_PUBLIC_*-Variablen. Die laufen auf Landingpages ohne Login
 * und wuerden hier nur als Karteileiche im Stapel liegen.
 */
const AUSNAHMEN = new Set(
  Object.entries(process.env)
    .filter(([k]) => k.startsWith("NEXT_PUBLIC_") && k.includes("VIDEO"))
    .map(([, v]) => v?.match(/cloudflarestream\.com\/([a-f0-9]{32})\//)?.[1])
    .filter(Boolean),
);

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** "12 DoL - Narrative - Liquidity.mp4" → "DoL - Narrative - Liquidity" */
function titelAus(name) {
  if (!name) return "Unbenanntes Video";
  return (
    name
      .replace(/\.[a-z0-9]{2,4}$/i, "")
      .replace(/^\s*\d+(?:[.,]\d+)*\s*[.)-]?\s*/, "")
      .trim() || "Unbenanntes Video"
  );
}

/** Fuehrende Kapitelnummer als Sortierschluessel — "4.2" vor "10", nicht danach. */
function sortierWert(name) {
  const m = (name ?? "").match(/^\s*(\d+)(?:[.,](\d+))?/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return Number(m[1]) * 1000 + Number(m[2] ?? 0);
}

const supabase = createServiceClient();

const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream?per_page=1000`, {
  headers: { Authorization: `Bearer ${API_TOKEN}` },
});
const json = await res.json();
if (!json.success) throw new Error(JSON.stringify(json.errors));
const cfVideos = json.result ?? [];

const { data: vorhanden, error } = await supabase.from("videos").select("cloudflare_uid").not("cloudflare_uid", "is", null);
if (error) throw new Error(error.message);
const bekannt = new Set((vorhanden ?? []).map((v) => v.cloudflare_uid));

const kandidaten = cfVideos
  .filter((v) => !bekannt.has(v.uid))
  .filter((v) => !AUSNAHMEN.has(v.uid))
  .filter((v) => (auchUnfertige ? v.status?.state !== "error" : v.status?.state === "ready"))
  .sort((a, b) => sortierWert(a.meta?.name) - sortierWert(b.meta?.name) || (a.meta?.name ?? "").localeCompare(b.meta?.name ?? "", "de"));

console.log(`Modus: ${apply ? "APPLY" : "DRY-RUN"}`);
console.log(`Cloudflare: ${cfVideos.length} Videos · davon bereits verknuepft: ${cfVideos.filter((v) => bekannt.has(v.uid)).length}`);
if (AUSNAHMEN.size > 0) console.log(`Ausgenommen (oeffentliche Funnel-Videos): ${AUSNAHMEN.size}`);
console.log(`\nIn den Stapel zu uebernehmen: ${kandidaten.length}\n`);

for (const v of kandidaten.slice(0, 80)) {
  const min = Math.round((v.duration ?? 0) / 60);
  console.log(`  ${String(min).padStart(4)}min  ${titelAus(v.meta?.name)}`);
}
if (kandidaten.length > 80) console.log(`  … und ${kandidaten.length - 80} weitere`);

if (!apply) {
  console.log(`\nDry-Run — nichts geschrieben. Mit --apply erneut aufrufen.`);
  process.exit(0);
}

let ok = 0;
let fehler = 0;
for (let i = 0; i < kandidaten.length; i++) {
  const v = kandidaten[i];
  const dauer = Math.round(v.duration ?? 0);
  const { error: insErr } = await supabase.from("videos").insert({
    id: crypto.randomUUID(),
    title: titelAus(v.meta?.name),
    // `position` haelt die Kapitelreihenfolge im Stapel fest, damit beim
    // Einsortieren nicht neu sortiert werden muss.
    position: i,
    module_id: null,
    subcategory_id: null,
    storage_key: null,
    cloudflare_uid: v.uid,
    cloudflare_status: "ready",
    cloudflare_ready_at: v.readyToStreamAt ?? new Date().toISOString(),
    duration_seconds: dauer > 0 ? dauer : null,
    is_published: false,
  });
  if (insErr) {
    fehler++;
    console.log(`  FEHLER "${titelAus(v.meta?.name)}": ${insErr.message}`);
  } else {
    ok++;
  }
}

console.log(`\n${ok} Videos in den Stapel uebernommen, ${fehler} Fehler.`);
if (ok > 0) {
  console.log(`Sie liegen jetzt unter /admin/kurse im Stapel "Nicht zugeordnet" und lassen sich`);
  console.log(`im Modul-Editor per Drag & Drop in Module und Untermodule ziehen.`);
}
process.exit(fehler === 0 ? 0 : 1);
