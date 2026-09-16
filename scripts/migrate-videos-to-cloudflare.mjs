/**
 * Bulk-Migration der Institut/Ausbildung-Videos von Hetzner S3 zu Cloudflare Stream.
 * Mutiert Produktions-DB + ruft eine bezahlte Drittanbieter-API auf — deshalb höhere
 * Reibung als sonst üblich: Dry-Run per Default, `--apply` nötig für echte Änderungen.
 *
 * Auswahl (Migrations-Modus): videos wo cloudflare_uid is null and storage_key is not
 * null — idempotent, beliebig oft wiederholbar (bereits migrierte Zeilen werden nicht
 * erneut angefasst).
 *
 * Aufruf:
 *   node scripts/migrate-videos-to-cloudflare.mjs                 Dry-Run: listet unmigrierte Videos
 *   node scripts/migrate-videos-to-cloudflare.mjs --apply          startet Cloudflare-Copy-Jobs
 *   node scripts/migrate-videos-to-cloudflare.mjs --poll           Dry-Run: zeigt Verarbeitungsstatus laufender Jobs
 *   node scripts/migrate-videos-to-cloudflare.mjs --apply --poll   prüft laufende Jobs, aktualisiert Status in der DB
 *   node scripts/migrate-videos-to-cloudflare.mjs --apply --limit=10 --course=<slug>
 */

import { existsSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import dotenv from "dotenv";

for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) dotenv.config({ path: full, override: false });
}

// Erlaubt den direkten Import der .ts-Quellen (Alias @/ + Extension-Auflösung).
register("./ts-loader.mjs", import.meta.url);

const { createServiceClient } = await import("../lib/supabase/service.ts");
const { getPresignedGetUrl } = await import("../lib/storage.ts");
const { copyFromUrl, getVideoStatus } = await import("../lib/cloudflare-stream.ts");

const argv = process.argv.slice(2);
const apply = argv.includes("--apply");
const poll = argv.includes("--poll");
const limitArg = argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
const courseArg = argv.find((a) => a.startsWith("--course="));
const courseSlug = courseArg ? courseArg.split("=")[1] : undefined;

const supabase = createServiceClient();

/** Löst einen Course-Slug in die betroffenen module_id/subcategory_id auf (für --course=). */
async function resolveCourseScope(slug) {
  const { data: course, error: courseErr } = await supabase
    .from("courses")
    .select("id, title")
    .eq("slug", slug)
    .maybeSingle();
  if (courseErr) throw new Error(courseErr.message);
  if (!course) throw new Error(`Kein Kurs mit slug="${slug}" gefunden.`);

  const { data: modules, error: modErr } = await supabase.from("modules").select("id").eq("course_id", course.id);
  if (modErr) throw new Error(modErr.message);
  const moduleIds = (modules ?? []).map((m) => m.id);

  const { data: subs, error: subErr } =
    moduleIds.length > 0
      ? await supabase.from("subcategories").select("id").in("module_id", moduleIds)
      : { data: [], error: null };
  if (subErr) throw new Error(subErr.message);
  const subIds = (subs ?? []).map((s) => s.id);

  return { course, moduleIds, subIds };
}

async function fetchMigrationCandidates() {
  let q = supabase
    .from("videos")
    .select("id, title, storage_key, module_id, subcategory_id")
    .is("cloudflare_uid", null)
    .not("storage_key", "is", null)
    .order("created_at", { ascending: true });

  if (courseSlug) {
    const { moduleIds, subIds } = await resolveCourseScope(courseSlug);
    const clauses = [];
    if (moduleIds.length > 0) clauses.push(`module_id.in.(${moduleIds.join(",")})`);
    if (subIds.length > 0) clauses.push(`subcategory_id.in.(${subIds.join(",")})`);
    if (clauses.length === 0) return [];
    q = q.or(clauses.join(","));
  }

  if (limit) q = q.limit(limit);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function runMigrate() {
  const candidates = await fetchMigrationCandidates();
  console.log(`\nVideo-Migration → Cloudflare Stream (${apply ? "APPLY" : "Dry-Run"})`);
  console.log(`${candidates.length} Video(s) zu migrieren${courseSlug ? ` (Kurs: ${courseSlug})` : ""}.\n`);

  if (candidates.length === 0) {
    console.log("✅ Nichts zu tun.\n");
    return;
  }

  if (!apply) {
    for (const v of candidates) {
      console.log(`  - ${v.title} (${v.id}) ← ${v.storage_key}`);
    }
    console.log("\nDry-Run — keine Änderungen. Mit --apply ausführen, um Cloudflare-Copy-Jobs zu starten.\n");
    return;
  }

  let started = 0;
  let failed = 0;

  for (const v of candidates) {
    await supabase.from("videos").update({ cloudflare_status: "uploading" }).eq("id", v.id);
    try {
      const sourceUrl = await getPresignedGetUrl(v.storage_key, 60 * 60);
      const { uid } = await copyFromUrl({ sourceUrl, name: v.title, requireSignedURLs: true });
      const { error: updErr } = await supabase
        .from("videos")
        .update({ cloudflare_uid: uid, cloudflare_status: "processing", cloudflare_error: null })
        .eq("id", v.id);
      if (updErr) throw new Error(updErr.message);
      console.log(`  ✓ ${v.title} (${v.id}) → uid ${uid}`);
      started += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase.from("videos").update({ cloudflare_status: "error", cloudflare_error: msg }).eq("id", v.id);
      console.log(`  ✗ ${v.title} (${v.id}): ${msg}`);
      failed += 1;
    }
  }

  console.log(`\nGestartet: ${started}   Fehlgeschlagen: ${failed}\n`);
}

async function fetchProcessingVideos() {
  let q = supabase
    .from("videos")
    .select("id, title, cloudflare_uid, duration_seconds, module_id, subcategory_id")
    .eq("cloudflare_status", "processing")
    .not("cloudflare_uid", "is", null);

  if (courseSlug) {
    const { moduleIds, subIds } = await resolveCourseScope(courseSlug);
    const clauses = [];
    if (moduleIds.length > 0) clauses.push(`module_id.in.(${moduleIds.join(",")})`);
    if (subIds.length > 0) clauses.push(`subcategory_id.in.(${subIds.join(",")})`);
    if (clauses.length === 0) return [];
    q = q.or(clauses.join(","));
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function runPoll() {
  const pending = await fetchProcessingVideos();
  console.log(`\nCloudflare-Status-Check (${apply ? "APPLY" : "Dry-Run"})`);
  console.log(`${pending.length} Video(s) in Verarbeitung${courseSlug ? ` (Kurs: ${courseSlug})` : ""}.\n`);

  if (pending.length === 0) {
    console.log("✅ Nichts in Verarbeitung.\n");
    return;
  }

  let ready = 0;
  let stillProcessing = 0;
  let erroredNow = 0;

  for (const v of pending) {
    try {
      const status = await getVideoStatus(v.cloudflare_uid);
      if (status.state === "ready" && status.readyToStream) {
        console.log(`  ✓ ${v.title} (${v.id}) → bereit${status.durationSeconds ? ` (${status.durationSeconds}s)` : ""}`);
        ready += 1;
        if (apply) {
          const updates = { cloudflare_status: "ready", cloudflare_ready_at: new Date().toISOString(), cloudflare_error: null };
          if (v.duration_seconds == null && status.durationSeconds != null) updates.duration_seconds = status.durationSeconds;
          await supabase.from("videos").update(updates).eq("id", v.id);
        }
      } else if (status.state === "error") {
        console.log(`  ✗ ${v.title} (${v.id}): ${status.errorReasonText ?? "Unbekannter Fehler"}`);
        erroredNow += 1;
        if (apply) {
          await supabase
            .from("videos")
            .update({ cloudflare_status: "error", cloudflare_error: status.errorReasonText ?? "Unbekannter Cloudflare-Fehler." })
            .eq("id", v.id);
        }
      } else {
        console.log(`  … ${v.title} (${v.id}) — ${status.state}`);
        stillProcessing += 1;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ ${v.title} (${v.id}): Status-Abfrage fehlgeschlagen — ${msg}`);
      erroredNow += 1;
    }
  }

  console.log(`\nBereit: ${ready}   Weiterhin in Verarbeitung: ${stillProcessing}   Fehler: ${erroredNow}`);
  if (!apply) console.log("Dry-Run — keine Änderungen. Mit --apply ausführen, um die DB zu aktualisieren.");
  console.log();
}

try {
  if (poll) {
    await runPoll();
  } else {
    await runMigrate();
  }
  process.exit(0);
} catch (err) {
  console.error("❌ Migration fehlgeschlagen:", err instanceof Error ? err.message : err);
  process.exit(1);
}
