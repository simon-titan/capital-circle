/**
 * Prueft die Cloudflare-Anbindung end-to-end, ohne etwas zu veraendern:
 * Stream-API erreichbar, Signing-Key-Paar gueltig, R2-Bucket ansprechbar.
 *
 *   node scripts/check-cloudflare.mjs
 */
import { existsSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import dotenv from "dotenv";

for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) dotenv.config({ path: full, override: false });
}

// Erlaubt den direkten Import der .ts-Quellen (Alias @/ + Extension-Aufloesung).
register("./ts-loader.mjs", import.meta.url);

const {
  getCloudflareStreamMisconfiguration,
  getCloudflareSigningMisconfiguration,
  buildManifestUrl,
  signPlaybackToken,
} = await import("../lib/cloudflare-stream.ts");

let fehler = 0;
const ok = (s) => console.log(`  OK    ${s}`);
const bad = (s) => {
  fehler++;
  console.log(`  FEHLT ${s}`);
};

console.log("── Konfiguration ──");
const cfgStream = getCloudflareStreamMisconfiguration();
cfgStream ? bad(cfgStream) : ok("Stream-Zugang (Account-ID, API-Token, Customer-Subdomain)");
const cfgSign = getCloudflareSigningMisconfiguration();
cfgSign ? bad(cfgSign) : ok("Signing-Key-Paar (Key-ID + privater Schluessel)");

console.log("\n── Stream-API ──");
if (!cfgStream) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID.trim()}/stream?per_page=1`,
    { headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_STREAM_API_TOKEN.trim()}` } },
  );
  const json = await res.json();
  json.success ? ok(`erreichbar (${json.result.length} Video(s) in der ersten Seite)`) : bad(JSON.stringify(json.errors));
}

console.log("\n── Signierte Wiedergabe ──");
if (!cfgSign) {
  try {
    const uid = "0".repeat(32);
    const token = signPlaybackToken(uid, 60);
    const teile = token.split(".");
    teile.length === 3 ? ok(`JWT erzeugt (${teile[0].length}/${teile[1].length}/${teile[2].length} Zeichen)`) : bad("JWT hat nicht 3 Teile");
    const url = buildManifestUrl(uid, { signed: true, ttlSeconds: 60 });
    url.includes(".cloudflarestream.com/") && url.endsWith("/manifest/video.m3u8")
      ? ok("Manifest-URL wird gebaut")
      : bad(`unerwartete URL: ${url}`);
  } catch (e) {
    bad(e instanceof Error ? e.message : String(e));
  }
}

console.log("\n── R2 ──");
const r2Endpoint = process.env.R2_ENDPOINT?.trim();
const r2Bucket = process.env.R2_BUCKET_NAME?.trim();
const r2Key = process.env.R2_ACCESS_KEY_ID?.trim();
const r2Secret = process.env.R2_SECRET_ACCESS_KEY?.trim();
if (!r2Endpoint || !r2Bucket || !r2Key || !r2Secret) {
  bad("R2_ENDPOINT / R2_BUCKET_NAME / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY");
} else {
  const { S3Client, ListObjectsV2Command } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: "auto",
    endpoint: r2Endpoint,
    credentials: { accessKeyId: r2Key, secretAccessKey: r2Secret },
  });
  try {
    const out = await s3.send(new ListObjectsV2Command({ Bucket: r2Bucket, MaxKeys: 1 }));
    ok(`Bucket "${r2Bucket}" ansprechbar (${out.KeyCount ?? 0} Objekt(e) in der ersten Seite)`);
  } catch (e) {
    bad(`Bucket "${r2Bucket}": ${e instanceof Error ? e.message : String(e)}`);
  }
}

// Nur informativ: der Hetzner-Bucket war am 16.09.2026 in keiner Region mehr
// erreichbar. Der Check bleibt drin, damit ein Wiederauftauchen auffaellt —
// er zaehlt aber nicht als Fehler, weil R2 der aktive Speicher ist.
console.log("\n── Hetzner (Altbestand, nur informativ) ──");
const hzEndpoint = process.env.HETZNER_ENDPOINT?.trim();
const hzBucket = process.env.HETZNER_BUCKET_NAME?.trim();
if (!hzEndpoint || !hzBucket) {
  console.log("  --    nicht konfiguriert (in Ordnung — R2 hat uebernommen)");
} else {
  const { S3Client, ListObjectsV2Command } = await import("@aws-sdk/client-s3");
  const hz = new S3Client({
    endpoint: hzEndpoint,
    region: "eu-central-1",
    credentials: {
      accessKeyId: process.env.HETZNER_ACCESS_KEY?.trim() ?? "",
      secretAccessKey: process.env.HETZNER_SECRET_KEY?.trim() ?? "",
    },
  });
  try {
    const out = await hz.send(new ListObjectsV2Command({ Bucket: hzBucket, MaxKeys: 1 }));
    console.log(`  OK    Bucket "${hzBucket}" erreichbar (${out.KeyCount ?? 0} Objekt(e) in der ersten Seite)`);
  } catch (e) {
    console.log(`  WEG   Bucket "${hzBucket}": ${e instanceof Error ? e.name : String(e)} — Altdateien sind nicht abrufbar`);
  }
}

console.log(fehler === 0 ? "\nAlles gruen." : `\n${fehler} Problem(e).`);
process.exit(fehler === 0 ? 0 : 1);
