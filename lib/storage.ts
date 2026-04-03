import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** Trimmt .env-Werte: BOM, literal `\n`-Platzhalter, Anführungszeichen, Inline-`#`-Kommentare, Rest nach Leerzeichen. */
function normalizeHetznerEndpoint(raw: string | undefined): string {
  if (!raw) return "";
  let s = raw.replace(/^\uFEFF/, "").replace(/\\n/g, "").trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  const hash = s.indexOf("#");
  if (hash >= 0) s = s.slice(0, hash).trim();
  const space = s.search(/\s/);
  if (space >= 0) s = s.slice(0, space).trim();
  return s;
}

const hetznerEndpoint = normalizeHetznerEndpoint(process.env.HETZNER_ENDPOINT);

export const storageClient = new S3Client({
  endpoint: hetznerEndpoint || undefined,
  region: "eu-central-1",
  credentials: {
    accessKeyId: process.env.HETZNER_ACCESS_KEY ?? "",
    secretAccessKey: process.env.HETZNER_SECRET_KEY ?? "",
  },
});

const bucket = process.env.HETZNER_BUCKET_NAME ?? "";

/**
 * Prüft S3-Konfiguration für List/Presign (nicht identisch mit öffentlicher Object-Storage-URL fürs Intro).
 */
export function getHetznerStorageMisconfiguration(): string | null {
  if (!process.env.HETZNER_BUCKET_NAME?.trim()) {
    return "HETZNER_BUCKET_NAME fehlt in der Umgebung (.env.local).";
  }
  const ep = normalizeHetznerEndpoint(process.env.HETZNER_ENDPOINT);
  if (!ep) {
    return "HETZNER_ENDPOINT fehlt. Verwende die S3-API-URL (z. B. https://nbg1.your-objectstorage.com), nicht die öffentliche HTTPS-URL einzelner Dateien.";
  }
  try {
    // eslint-disable-next-line no-new
    new URL(ep);
  } catch {
    return `HETZNER_ENDPOINT ist keine gültige URL (nach Normalisierung: "${ep.slice(0, 80)}${ep.length > 80 ? "…" : ""}"). Prüfe Anführungszeichen, Leerzeichen oder # am Zeilenende in .env.`;
  }
  if (!process.env.HETZNER_ACCESS_KEY?.trim() || !process.env.HETZNER_SECRET_KEY?.trim()) {
    return "HETZNER_ACCESS_KEY oder HETZNER_SECRET_KEY fehlt.";
  }
  return null;
}

export async function getPresignedGetUrl(storageKey: string) {
  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: storageKey,
  });
  return getSignedUrl(storageClient, cmd, { expiresIn: 60 * 15 });
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
) {
  const cfgErr = getHetznerStorageMisconfiguration();
  if (cfgErr) {
    throw new Error(cfgErr);
  }
  await storageClient.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export type ListedObject = { key: string; size?: number };

/** Listet alle Objekt-Keys unter einem Prefix (paginiert). */
export async function listObjectKeysUnderPrefix(prefix: string): Promise<ListedObject[]> {
  const cfgErr = getHetznerStorageMisconfiguration();
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
  const cfgErr = getHetznerStorageMisconfiguration();
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
