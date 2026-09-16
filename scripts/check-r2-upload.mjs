/**
 * Prueft den kompletten Upload-Weg gegen R2 so, wie ihn der Browser geht:
 * presignte PUT-URL holen, CORS-Vorabfrage (OPTIONS) stellen, hochladen,
 * wieder lesen, aufraeumen.
 *
 * Hintergrund: Ein frisch angelegter R2-Bucket hat KEINE CORS-Regeln. Server-
 * seitig faellt das nicht auf — der Browser verweigert den PUT dann aber, und
 * im UI sieht es aus, als waere der Upload kaputt.
 *
 *   node --experimental-strip-types scripts/check-r2-upload.mjs [origin]
 */
import { existsSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import dotenv from "dotenv";

for (const f of [".env.local", ".env"]) {
  const p = path.resolve(process.cwd(), f);
  if (existsSync(p)) dotenv.config({ path: p, override: false });
}

register("./ts-loader.mjs", import.meta.url);
const { getPresignedPutUrl, getPresignedGetUrl, getStorageMisconfiguration } = await import("../lib/storage.ts");

const origin = process.argv[2] ?? "http://localhost:3000";
let fehler = 0;
const ok = (s) => console.log(`  OK    ${s}`);
const bad = (s) => {
  fehler++;
  console.log(`  FEHLT ${s}`);
};

const cfg = getStorageMisconfiguration();
if (cfg) {
  bad(cfg);
  process.exit(1);
}
ok(`Konfiguration vollstaendig (Bucket "${process.env.R2_BUCKET_NAME?.trim()}")`);

const key = `_pruefung/upload-test-${Date.now()}.txt`;
const inhalt = `Pruefupload ${new Date().toISOString()}`;

// 1) Presignte PUT-URL
const putUrl = await getPresignedPutUrl(key, "text/plain");
ok("presignte PUT-URL erzeugt");

// 2) CORS-Vorabfrage — genau das schickt der Browser vor dem PUT
const vorab = await fetch(putUrl, {
  method: "OPTIONS",
  headers: {
    Origin: origin,
    "Access-Control-Request-Method": "PUT",
    "Access-Control-Request-Headers": "content-type",
  },
});
const erlaubt = vorab.headers.get("access-control-allow-origin");
if (vorab.ok && erlaubt) ok(`CORS-Vorabfrage fuer ${origin} beantwortet (erlaubt: ${erlaubt})`);
else bad(`CORS-Vorabfrage fuer ${origin}: HTTP ${vorab.status}, allow-origin: ${erlaubt ?? "fehlt"} — Browser-Upload wuerde scheitern`);

// 3) Hochladen
const put = await fetch(putUrl, {
  method: "PUT",
  headers: { "Content-Type": "text/plain", Origin: origin },
  body: inhalt,
});
put.ok ? ok(`Upload durchgelaufen (HTTP ${put.status})`) : bad(`Upload fehlgeschlagen: HTTP ${put.status}`);

// 4) Wieder lesen
const getUrl = await getPresignedGetUrl(key, 60);
const get = await fetch(getUrl);
const zurueck = get.ok ? await get.text() : "";
zurueck === inhalt ? ok("Datei unveraendert zurueckgelesen") : bad(`Rueckgelesener Inhalt weicht ab (HTTP ${get.status})`);

// 5) Derselbe Weg noch einmal fuer ein Bild — so, wie der Admin es hochlaedt:
//    Key ueber buildAdminStorageKey, Content-Type image/png. `image/png` ist
//    kein CORS-safelisted Typ, der Browser stellt also zwingend eine Vorabfrage.
const { buildAdminStorageKey } = await import("../lib/admin-upload-key.ts");
const bildKey = buildAdminStorageKey({
  fileName: "Vorschau Bild äöü.png",
  contentType: "image/png",
  folder: "videos",
  courseId: crypto.randomUUID(),
  moduleId: crypto.randomUUID(),
  videoId: crypto.randomUUID(),
  kind: "thumbnail",
});
if (!bildKey.ok) {
  bad(`Storage-Key fuer das Bild: ${bildKey.error}`);
} else {
  ok(`Bild-Key gebaut: ${bildKey.storageKey} (${bildKey.contentType})`);
  const bildPut = await getPresignedPutUrl(bildKey.storageKey, bildKey.contentType);

  const bildVorab = await fetch(bildPut, {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  bildVorab.ok && bildVorab.headers.get("access-control-allow-origin")
    ? ok("Bild: CORS-Vorabfrage beantwortet")
    : bad(`Bild: CORS-Vorabfrage HTTP ${bildVorab.status} — Browser-Upload wuerde scheitern`);

  // 1×1-PNG
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const bildRes = await fetch(bildPut, {
    method: "PUT",
    headers: { "Content-Type": bildKey.contentType, Origin: origin },
    body: png,
  });
  bildRes.ok ? ok(`Bild hochgeladen (HTTP ${bildRes.status})`) : bad(`Bild-Upload fehlgeschlagen: HTTP ${bildRes.status}`);

  const bildGet = await fetch(await getPresignedGetUrl(bildKey.storageKey, 60));
  const bytes = bildGet.ok ? Buffer.from(await bildGet.arrayBuffer()) : Buffer.alloc(0);
  bytes.equals(png) ? ok("Bild unveraendert zurueckgelesen") : bad("Bild kam veraendert zurueck");

  const { S3Client: S3, DeleteObjectCommand: Del } = await import("@aws-sdk/client-s3");
  await new S3({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT.trim(),
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim(),
    },
  }).send(new Del({ Bucket: process.env.R2_BUCKET_NAME.trim(), Key: bildKey.storageKey }));
  ok("Bild wieder geloescht");
}

// 6) Aufraeumen
const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT.trim(),
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim(),
  },
});
await s3.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME.trim(), Key: key }));
ok("Pruefdatei wieder geloescht");

console.log(fehler === 0 ? "\nUpload-Weg in Ordnung." : `\n${fehler} Problem(e).`);
process.exit(fehler === 0 ? 0 : 1);
