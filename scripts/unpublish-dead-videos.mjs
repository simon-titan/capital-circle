/**
 * Nimmt Videos vom Netz, deren Datei nicht mehr existiert: keine
 * `cloudflare_uid`, nur ein `storage_key` auf den verschwundenen Hetzner-Bucket.
 * Mitglieder klicken sonst auf Kacheln, hinter denen nichts liegt.
 *
 * Bewusst KEIN Loeschen: Titel, Beschreibung, Modulzuordnung und Reihenfolge
 * bleiben erhalten. Taucht eine Aufnahme wieder auf, reicht ein Upload und das
 * Video ist mit einem Klick wieder da.
 *
 * Idempotent — bereits unveroeffentlichte Zeilen werden uebersprungen.
 *
 *   node scripts/unpublish-dead-videos.mjs           Dry-Run mit Liste + CSV
 *   node scripts/unpublish-dead-videos.mjs --apply   setzt is_published = false
 *   node scripts/unpublish-dead-videos.mjs --zurueck --apply
 *       macht den Lauf rueckgaengig (veroeffentlicht die Zeilen aus der CSV wieder)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) dotenv.config({ path: full, override: false });
}

const argv = process.argv.slice(2);
const apply = argv.includes("--apply");
const zurueck = argv.includes("--zurueck");

const BERICHT = path.resolve(process.cwd(), "exports/tote-videos.csv");

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const supabase = createServiceClient();

// ── Rueckwaerts: die im letzten Lauf abgeschalteten Zeilen wieder einschalten ──
if (zurueck) {
  if (!existsSync(BERICHT)) throw new Error(`${BERICHT} fehlt — ohne die Liste gibt es nichts zurueckzudrehen.`);
  const zeilen = readFileSync(BERICHT, "utf8").replace(/^﻿/, "").split(/\r?\n/).slice(1).filter(Boolean);
  const ids = zeilen.map((z) => z.match(/"([^"]*)"/)?.[1]).filter(Boolean);
  console.log(`${ids.length} Zeilen aus dem Bericht${apply ? "" : " (Dry-Run)"}`);
  if (!apply) {
    console.log("Mit --zurueck --apply erneut aufrufen.");
    process.exit(0);
  }
  let ok = 0;
  for (const id of ids) {
    const { error } = await supabase.from("videos").update({ is_published: true }).eq("id", id);
    if (error) console.log(`  FEHLER ${id}: ${error.message}`);
    else ok++;
  }
  console.log(`${ok}/${ids.length} wieder veroeffentlicht.`);
  process.exit(0);
}

// ── Vorwaerts ────────────────────────────────────────────────────────────────
const { data, error } = await supabase
  .from("videos")
  .select("id,title,storage_key,module_id,subcategory_id,is_published,duration_seconds")
  .is("cloudflare_uid", null);
if (error) throw new Error(error.message);

const tot = (data ?? []).filter((v) => v.storage_key);
const betroffen = tot.filter((v) => v.is_published);

console.log(`Modus: ${apply ? "APPLY" : "DRY-RUN"}`);
console.log(`\nVideos ohne Cloudflare-Datei: ${tot.length}`);
console.log(`  davon noch veroeffentlicht:  ${betroffen.length}  ← werden abgeschaltet`);
console.log(`  bereits unveroeffentlicht:   ${tot.length - betroffen.length}`);

if (betroffen.length > 0) {
  console.log(`\nWerden unveroeffentlicht:`);
  for (const v of betroffen) console.log(`  ${v.title}`);
}

// Liste immer schreiben — sie ist der Rueckweg.
const kopf = ["id", "titel", "storage_key", "module_id", "subcategory_id", "dauer_s"];
const csv =
  "﻿" +
  [kopf, ...betroffen.map((v) => [v.id, v.title, v.storage_key ?? "", v.module_id ?? "", v.subcategory_id ?? "", v.duration_seconds ?? ""])]
    .map((z) => z.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
writeFileSync(BERICHT, csv, "utf8");
console.log(`\nListe: ${path.relative(process.cwd(), BERICHT)}`);

if (!apply) {
  console.log(`\nDry-Run — nichts geaendert. Mit --apply erneut aufrufen.`);
  process.exit(0);
}

let ok = 0;
for (const v of betroffen) {
  const { error: uErr } = await supabase.from("videos").update({ is_published: false }).eq("id", v.id);
  if (uErr) console.log(`  FEHLER "${v.title}": ${uErr.message}`);
  else ok++;
}

console.log(`\n${ok}/${betroffen.length} Videos unveroeffentlicht.`);
console.log(`Rueckgaengig: node scripts/unpublish-dead-videos.mjs --zurueck --apply`);
