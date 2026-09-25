/**
 * Prueft jeden Datei-Schluessel aus der Datenbank gegen den R2-Bucket (nur lesend).
 * Zeigt je Tabelle, welche Dateien fehlen — z. B. Altbestand, der auf Hetzner lag
 * und beim Umzug am 16.09.2026 nicht mitkam.
 *
 *   node scripts/check-r2-dateien.mjs
 */
import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
for (const f of [".env.local", ".env"]) { const p = path.resolve(process.cwd(), f); if (existsSync(p)) dotenv.config({ path: p, override: false }); }
const { createClient } = await import("@supabase/supabase-js");
const { S3Client, HeadObjectCommand, ListObjectsV2Command } = await import("@aws-sdk/client-s3");
const e = (n) => (process.env[n] ?? "").trim().replace(/^["']|["']$/g, "");
const sb = createClient(e("NEXT_PUBLIC_SUPABASE_URL"), e("SUPABASE_SERVICE_ROLE_KEY"));
const s3 = new S3Client({ endpoint: e("R2_ENDPOINT"), region: "auto", credentials: { accessKeyId: e("R2_ACCESS_KEY_ID"), secretAccessKey: e("R2_SECRET_ACCESS_KEY") } });
const Bucket = e("R2_BUCKET_NAME");
const ziele = [
  ["video_attachments", ["storage_key"]], ["standalone_attachments", ["storage_key"]],
  ["certificates", ["storage_key"]], ["modules", ["thumbnail_storage_key"]],
  ["videos", ["thumbnail_key"]], ["analysis_posts", ["image_storage_key","cover_image_storage_key"]],
  ["news_posts", ["cover_image_storage_key"]], ["arsenal_cards", ["logo_storage_key"]],
  ["live_sessions", ["thumbnail_storage_key"]], ["live_session_videos", ["thumbnail_key"]],
  ["journal_trades", ["screenshot_storage_key"]], ["journal_trade_bilder", ["storage_key"]],
];
let alle = 0;
for (const [t, cols] of ziele) {
  const { data, error } = await sb.from(t).select(["id", ...cols].join(",")).limit(5000);
  if (error) { console.log(`${t}: ${error.message}`); continue; }
  for (const c of cols) {
    const keys = data.map((r) => r[c]).filter((k) => k && !/^https?:/.test(k));
    let fehlt = [];
    for (const k of keys) { try { await s3.send(new HeadObjectCommand({ Bucket, Key: k })); } catch { fehlt.push(k); } }
    alle += fehlt.length;
    console.log(`${t}.${c}: ${keys.length} Keys, ${fehlt.length} fehlen in R2`);
    for (const k of fehlt) console.log(`   - ${k}`);
  }
}
let n = 0, tok; const pref = {};
do { const o = await s3.send(new ListObjectsV2Command({ Bucket, ContinuationToken: tok })); for (const x of o.Contents ?? []) { n++; const p = x.Key.split("/")[0]; pref[p] = (pref[p] ?? 0) + 1; } tok = o.IsTruncated ? o.NextContinuationToken : undefined; } while (tok);
console.log(`\nR2 gesamt: ${n} Objekte`, pref);
