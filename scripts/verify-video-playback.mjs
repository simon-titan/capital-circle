/**
 * Stichprobe auf den verknuepften Cloudflare-Videos: Spielt das signierte
 * HLS-Manifest, und ist dasselbe Video ohne Signatur zuverlaessig gesperrt?
 *
 * Beides muss stimmen. Nur "signiert spielt" hiesse, die Kursvideos waeren
 * weiterhin allein ueber ihre UID abrufbar — bei bezahlten Inhalten der
 * eigentliche Punkt der Uebung.
 *
 *   node --experimental-strip-types scripts/verify-video-playback.mjs [anzahl]
 */
import { existsSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

for (const f of [".env.local", ".env"]) {
  const p = path.resolve(process.cwd(), f);
  if (existsSync(p)) dotenv.config({ path: p, override: false });
}

register("./ts-loader.mjs", import.meta.url);
const { buildManifestUrl } = await import("../lib/cloudflare-stream.ts");

const anzahl = Number(process.argv[2] ?? "5") || 5;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data, error } = await supabase
  .from("videos")
  .select("id,title,cloudflare_uid,cloudflare_status,duration_seconds")
  .not("cloudflare_uid", "is", null)
  .limit(anzahl);
if (error) throw new Error(error.message);

const subdomain = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN.trim();
let fehler = 0;

console.log(`Stichprobe: ${data.length} von den verknuepften Videos\n`);

for (const v of data) {
  const signiert = buildManifestUrl(v.cloudflare_uid, { signed: true, ttlSeconds: 300 });
  const unsigniert = `https://${subdomain}.cloudflarestream.com/${v.cloudflare_uid}/manifest/video.m3u8`;

  const [a, b] = await Promise.all([fetch(signiert), fetch(unsigniert)]);
  const okSigniert = a.ok;
  const okGesperrt = !b.ok;
  if (!okSigniert || !okGesperrt) fehler++;

  console.log(`"${v.title}" · ${v.cloudflare_status} · ${v.duration_seconds ?? "?"}s`);
  console.log(`   signiert   ${a.status}  ${okSigniert ? "spielt" : "BLOCKIERT — Signatur stimmt nicht"}`);
  console.log(`   unsigniert ${b.status}  ${okGesperrt ? "korrekt gesperrt" : "OFFEN — Signatur-Zwang fehlt!"}`);
}

const { count: verknuepft } = await supabase
  .from("videos")
  .select("id", { count: "exact", head: true })
  .not("cloudflare_uid", "is", null);
const { count: gesamt } = await supabase.from("videos").select("id", { count: "exact", head: true });

console.log(`\nVerknuepft: ${verknuepft} von ${gesamt} Videos`);
console.log(fehler === 0 ? "Stichprobe in Ordnung." : `${fehler} Problem(e) in der Stichprobe.`);
process.exit(fehler === 0 ? 0 : 1);
