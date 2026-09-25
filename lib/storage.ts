import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Objektspeicher der Plattform: **Cloudflare R2** (S3-kompatibel).
 *
 * Vorher lief das auf Hetzner Object Storage. Der Bucket dort ist am 16.09.2026
 * nicht mehr erreichbar gewesen (`NoSuchBucket` in allen Regionen, die Keys
 * liefern `InvalidAccessKeyId`) — die Ablösung ist damit keine Optimierung
 * mehr, sondern die Reparatur.
 *
 * Die Schlüssel (`storage_key` in der Datenbank) bleiben unverändert: R2 nutzt
 * dieselbe Struktur, sodass wiederhergestellte oder neu hochgeladene Dateien
 * unter demselben Pfad liegen.
 *
 * Ist `HETZNER_*` noch gesetzt, dient Hetzner nur als Lese-Rückfallebene für
 * Altbestände (`STORAGE_LEGACY_FALLBACK=1`). Geschrieben wird ausschließlich
 * nach R2.
 */

/** Trimmt .env-Werte: BOM, literal `\n`-Platzhalter, Anführungszeichen, Inline-`#`-Kommentare, Rest nach Leerzeichen. */
function normalizeEndpoint(raw: string | undefined): string {
  if (!raw) return "";
  let s = raw.replace(/^﻿/, "").replace(/\\n/g, "").trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  const hash = s.indexOf("#");
  if (hash >= 0) s = s.slice(0, hash).trim();
  const space = s.search(/\s/);
  if (space >= 0) s = s.slice(0, space).trim();
  return s;
}

function env(name: string): string {
  return normalizeEndpoint(process.env[name]);
}

const r2Endpoint = env("R2_ENDPOINT");
const bucket = env("R2_BUCKET_NAME");

/**
 * `region: "auto"` ist bei R2 Pflicht — jede andere Region lässt die
 * SigV4-Signatur scheitern.
 */
export const storageClient = new S3Client({
  endpoint: r2Endpoint || undefined,
  region: "auto",
  credentials: {
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
  },
});

/** Lese-Rückfallebene auf den Altbestand — nur aktiv, wenn ausdrücklich eingeschaltet. */
const legacyFallbackAktiv =
  process.env.STORAGE_LEGACY_FALLBACK === "1" &&
  Boolean(env("HETZNER_ENDPOINT")) &&
  Boolean(env("HETZNER_BUCKET_NAME"));

const legacyClient = legacyFallbackAktiv
  ? new S3Client({
      endpoint: env("HETZNER_ENDPOINT"),
      region: "eu-central-1",
      credentials: {
        accessKeyId: env("HETZNER_ACCESS_KEY"),
        secretAccessKey: env("HETZNER_SECRET_KEY"),
      },
    })
  : null;

const legacyBucket = env("HETZNER_BUCKET_NAME");

/** Prüft die S3-Konfiguration für List/Presign/Upload. */
export function getStorageMisconfiguration(): string | null {
  if (!bucket) return "R2_BUCKET_NAME fehlt in der Umgebung (.env.local).";
  if (!r2Endpoint) {
    return "R2_ENDPOINT fehlt. Format: https://<ACCOUNT_ID>.r2.cloudflarestorage.com, bei einem Bucket in der EU-Jurisdiktion mit `.eu.` im Host.";
  }
  try {
    new URL(r2Endpoint);
  } catch {
    return `R2_ENDPOINT ist keine gültige URL (nach Normalisierung: "${r2Endpoint.slice(0, 80)}${r2Endpoint.length > 80 ? "…" : ""}"). Prüfe Anführungszeichen, Leerzeichen oder # am Zeilenende in .env.`;
  }
  if (!env("R2_ACCESS_KEY_ID") || !env("R2_SECRET_ACCESS_KEY")) {
    return "R2_ACCESS_KEY_ID oder R2_SECRET_ACCESS_KEY fehlt.";
  }
  return null;
}

/**
 * Alter Name, damit bestehende Aufrufer weiterlaufen.
 * @deprecated `getStorageMisconfiguration()` verwenden — der Speicher ist R2, nicht Hetzner.
 */
export const getHetznerStorageMisconfiguration = getStorageMisconfiguration;

/**
 * Liegt der Schlüssel in R2? Gemerkt werden nur Treffer: Eine fehlende Datei kann jederzeit per
 * Presigned PUT direkt aus dem Browser nachgeladen werden, ohne dass dieser Prozess davon erfährt.
 */
const r2TrefferCache = new Set<string>();

export async function existiertInR2(storageKey: string): Promise<boolean> {
  if (r2TrefferCache.has(storageKey)) return true;
  try {
    await storageClient.send(new HeadObjectCommand({ Bucket: bucket, Key: storageKey }));
    r2TrefferCache.add(storageKey);
    return true;
  } catch {
    return false;
  }
}

export async function getPresignedGetUrl(storageKey: string, expiresIn = 60 * 15) {
  if (legacyClient && !(await existiertInR2(storageKey))) {
    return getSignedUrl(legacyClient, new GetObjectCommand({ Bucket: legacyBucket, Key: storageKey }), {
      expiresIn,
    });
  }
  return getSignedUrl(storageClient, new GetObjectCommand({ Bucket: bucket, Key: storageKey }), { expiresIn });
}

/**
 * Wie `getPresignedGetUrl`, liefert aber `null`, wenn die Datei in R2 fehlt. Für Downloads, die der
 * Browser direkt öffnet: Eine signierte URL auf einen fehlenden Schlüssel landet sonst als rohe
 * `NoSuchKey`-XML-Seite beim Nutzer. (Mit Legacy-Rückfallebene wird nicht geprüft, dort entscheidet Hetzner.)
 */
export async function getPresignedGetUrlWennVorhanden(storageKey: string, expiresIn = 60 * 15) {
  if (!legacyClient && !(await existiertInR2(storageKey))) return null;
  return getPresignedGetUrl(storageKey, expiresIn);
}

export async function getPresignedPutUrl(storageKey: string, contentType: string) {
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    ContentType: contentType,
  });
  return getSignedUrl(storageClient, cmd, { expiresIn: 60 * 15 });
}

/** Serverseitiger Upload (kein Browser-CORS zum Bucket). `body` z. B. `Readable.fromWeb(file.stream())`. */
export async function putObjectBody(
  storageKey: string,
  body: PutObjectCommandInput["Body"],
  contentType: string,
  /** Optional: für S3-kompatible Stores zuverlässiger als reiner Stream ohne Länge. */
  contentLength?: number,
) {
  const cfgErr = getStorageMisconfiguration();
  if (cfgErr) {
    throw new Error(cfgErr);
  }
  await storageClient.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      Body: body,
      ContentType: contentType,
      ...(contentLength !== undefined ? { ContentLength: contentLength } : {}),
    }),
  );
  r2TrefferCache.add(storageKey);
}

/**
 * Löscht ein Objekt in R2. Fehlt es schon, meldet S3 trotzdem Erfolg — ein
 * zweiter Aufruf ist also harmlos. Der Altbestand (Hetzner) wird nie
 * angefasst: Dort wird nur noch gelesen.
 */
export async function deleteObject(storageKey: string) {
  const cfgErr = getStorageMisconfiguration();
  if (cfgErr) {
    throw new Error(cfgErr);
  }
  await storageClient.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }));
  r2TrefferCache.delete(storageKey);
}

/** Größe eines Objekts in R2 in Bytes — `null`, wenn es nicht existiert. */
export async function getObjectSize(storageKey: string): Promise<number | null> {
  try {
    const out = await storageClient.send(new HeadObjectCommand({ Bucket: bucket, Key: storageKey }));
    r2TrefferCache.add(storageKey);
    return typeof out.ContentLength === "number" ? out.ContentLength : 0;
  } catch {
    return null;
  }
}

export type ListedObject = { key: string; size?: number };

/** Listet alle Objekt-Keys unter einem Prefix (paginiert). */
export async function listObjectKeysUnderPrefix(prefix: string): Promise<ListedObject[]> {
  const cfgErr = getStorageMisconfiguration();
  if (cfgErr) {
    throw new Error(cfgErr);
  }
  const keys: ListedObject[] = [];
  let continuationToken: string | undefined;

  do {
    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix.endsWith("/") ? prefix : `${prefix}/`,
      ContinuationToken: continuationToken,
    });
    const out = await storageClient.send(cmd);
    for (const obj of out.Contents ?? []) {
      if (obj.Key && !obj.Key.endsWith("/")) {
        keys.push({ key: obj.Key, size: obj.Size });
      }
    }
    continuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

/**
 * Listet direkte Unterordner unter einem Prefix (S3 CommonPrefixes mit Delimiter "/").
 * z. B. Prefix "modules/" liefert ["modules/ModA/", "modules/ModB/"].
 */
export async function listFolderPrefixes(prefix: string): Promise<string[]> {
  const cfgErr = getStorageMisconfiguration();
  if (cfgErr) {
    throw new Error(cfgErr);
  }
  const normalized = prefix.endsWith("/") ? prefix : `${prefix}/`;
  const out: string[] = [];
  let continuationToken: string | undefined;

  do {
    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: normalized,
      Delimiter: "/",
      ContinuationToken: continuationToken,
    });
    const res = await storageClient.send(cmd);
    for (const cp of res.CommonPrefixes ?? []) {
      if (cp.Prefix) out.push(cp.Prefix);
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return out;
}
