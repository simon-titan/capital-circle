import jwt from "jsonwebtoken";

/**
 * Cloudflare Stream — Admin-Upload + signierte Wiedergabe für das Institut/
 * Ausbildung-Modul. Strukturell getrennt von der bestehenden Free-Live-Stream-
 * Integration (`stream_settings`, `/stream`, `StreamRoom.tsx`) — diese hier
 * verwaltet viele On-Demand-Videos statt einer Live-Übertragung.
 *
 * Stilistisch an `lib/storage.ts` angelehnt (einfache exportierte Funktionen).
 */

/** Konsistent an beiden Upload-Pfaden (Direct Upload + Copy) — nicht retrofittbar. */
export const REQUIRE_SIGNED_URLS = true;

/** Trimmt .env-Werte: BOM, literal `\n`-Platzhalter, Anführungszeichen, Inline-`#`-Kommentare. */
const BOM = String.fromCharCode(0xfeff);

function normalizeEnvValue(raw: string | undefined): string {
  if (!raw) return "";
  let s = (raw.startsWith(BOM) ? raw.slice(1) : raw).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  const hash = s.indexOf("#");
  if (hash >= 0 && !s.includes("BEGIN ")) s = s.slice(0, hash).trim();
  return s;
}

/** PEM-Private-Key: literal `\n` (typisches .env-Mangling) zu echten Zeilenumbrüchen. */
function normalizePrivateKey(raw: string | undefined): string {
  const s = normalizeEnvValue(raw);
  return s.includes("\\n") ? s.replace(/\\n/g, "\n") : s;
}

function accountId(): string {
  return normalizeEnvValue(process.env.CLOUDFLARE_ACCOUNT_ID);
}
function apiToken(): string {
  return normalizeEnvValue(process.env.CLOUDFLARE_STREAM_API_TOKEN);
}
function customerSubdomain(): string {
  return normalizeEnvValue(process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN);
}
function signingKeyId(): string {
  return normalizeEnvValue(process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID);
}
function signingPrivateKey(): string {
  return normalizePrivateKey(process.env.CLOUDFLARE_STREAM_SIGNING_PRIVATE_KEY);
}

/** Prüft Konfiguration für Upload/Status/Delete (Account-API). */
export function getCloudflareStreamMisconfiguration(): string | null {
  if (!accountId()) return "CLOUDFLARE_ACCOUNT_ID fehlt in der Umgebung (.env.local).";
  if (!apiToken()) return "CLOUDFLARE_STREAM_API_TOKEN fehlt (Stream:Edit-Berechtigung erforderlich).";
  if (!customerSubdomain()) {
    return "NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN fehlt (Format: customer-<hash>).";
  }
  return null;
}

/** Prüft Konfiguration für signierte Wiedergabe-URLs (separat, da eigenes Key-Paar). */
export function getCloudflareSigningMisconfiguration(): string | null {
  if (!signingKeyId()) return "CLOUDFLARE_STREAM_SIGNING_KEY_ID fehlt.";
  if (!signingPrivateKey()) return "CLOUDFLARE_STREAM_SIGNING_PRIVATE_KEY fehlt.";
  return null;
}

function apiBase(): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId()}/stream`;
}

async function cfFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cfgErr = getCloudflareStreamMisconfiguration();
  if (cfgErr) throw new Error(cfgErr);

  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken()}`,
      ...(init?.headers ?? {}),
    },
  });

  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    result?: T;
    errors?: { code: number; message: string }[];
  } | null;

  if (!res.ok || !json?.success) {
    const msg = json?.errors?.map((e) => e.message).join("; ") || `Cloudflare-API-Fehler (${res.status})`;
    throw new Error(msg);
  }
  return json.result as T;
}

function toBase64(s: string): string {
  return Buffer.from(s, "utf-8").toString("base64");
}

export type DirectUploadResult = { uploadUrl: string; uid: string };

/** Erzeugt eine Direct-Creator-Upload-URL (Browser lädt direkt zu Cloudflare, kein Vercel-Body-Limit). */
export async function createDirectUpload(params: {
  maxDurationSeconds?: number;
  name?: string;
  requireSignedURLs?: boolean;
}): Promise<DirectUploadResult> {
  const result = await cfFetch<{ uploadURL: string; uid: string }>("/direct_upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      maxDurationSeconds: params.maxDurationSeconds ?? 3 * 60 * 60,
      requireSignedURLs: params.requireSignedURLs ?? REQUIRE_SIGNED_URLS,
      ...(params.name ? { meta: { name: params.name } } : {}),
    }),
  });
  return { uploadUrl: result.uploadURL, uid: result.uid };
}

/**
 * TUS-Erstellung für große Dateien (>190MB) — abweichend vom JSON-`/direct_upload`-Endpoint:
 * POST direkt gegen `/stream?direct_user=true` mit TUS-Headern; die Upload-URL kommt im
 * `Location`-Header zurück (nicht im JSON-Body), die Video-UID im `stream-media-id`-Header.
 * Die zurückgegebene URL ist danach ohne weitere Auth per TUS-Client (z. B. tus-js-client) nutzbar.
 */
export async function createDirectUploadTus(params: {
  fileSizeBytes: number;
  maxDurationSeconds?: number;
  requireSignedURLs?: boolean;
}): Promise<DirectUploadResult> {
  const cfgErr = getCloudflareStreamMisconfiguration();
  if (cfgErr) throw new Error(cfgErr);

  const maxDuration = params.maxDurationSeconds ?? 3 * 60 * 60;
  const metaParts = [`maxDurationSeconds ${toBase64(String(maxDuration))}`];
  if (params.requireSignedURLs ?? REQUIRE_SIGNED_URLS) metaParts.push("requiresignedurls");

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId()}/stream?direct_user=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken()}`,
      "Tus-Resumable": "1.0.0",
      "Upload-Length": String(params.fileSizeBytes),
      "Upload-Metadata": metaParts.join(","),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Cloudflare-TUS-Erstellung fehlgeschlagen (${res.status}): ${body.slice(0, 200)}`);
  }

  const uploadUrl = res.headers.get("Location");
  const uid = res.headers.get("stream-media-id");
  if (!uploadUrl || !uid) {
    throw new Error("Cloudflare-TUS-Antwort ohne Location- oder stream-media-id-Header.");
  }
  return { uploadUrl, uid };
}

/** Ingestiert ein Video von einer (kurzlebigen, presignten) Quell-URL — für Bulk-Migration. */
export async function copyFromUrl(params: {
  sourceUrl: string;
  name?: string;
  requireSignedURLs?: boolean;
}): Promise<{ uid: string; readyToStream: boolean }> {
  const result = await cfFetch<{ uid: string; readyToStream: boolean }>("/copy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: params.sourceUrl,
      requireSignedURLs: params.requireSignedURLs ?? REQUIRE_SIGNED_URLS,
      ...(params.name ? { meta: { name: params.name } } : {}),
    }),
  });
  return result;
}

export type CloudflareVideoStatus = {
  uid: string;
  readyToStream: boolean;
  state: "pendingupload" | "downloading" | "queued" | "inprogress" | "ready" | "error";
  errorReasonText: string | null;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
};

export async function getVideoStatus(uid: string): Promise<CloudflareVideoStatus> {
  const result = await cfFetch<{
    uid: string;
    readyToStream: boolean;
    status: { state: string; errReasonText?: string };
    duration?: number;
    thumbnail?: string;
  }>(`/${encodeURIComponent(uid)}`);

  return {
    uid: result.uid,
    readyToStream: result.readyToStream,
    state: (result.status?.state as CloudflareVideoStatus["state"]) ?? "queued",
    errorReasonText: result.status?.errReasonText ?? null,
    durationSeconds:
      typeof result.duration === "number" && result.duration > 0 ? Math.round(result.duration) : null,
    thumbnailUrl: result.thumbnail ?? null,
  };
}

export async function deleteVideo(uid: string): Promise<void> {
  await cfFetch<null>(`/${encodeURIComponent(uid)}`, { method: "DELETE" });
}

/** RS256-JWT für signierte Wiedergabe-URLs — kurzlebig, `sub`=Video-UID. */
export function signPlaybackToken(uid: string, ttlSeconds = 4 * 60 * 60): string {
  const cfgErr = getCloudflareSigningMisconfiguration();
  if (cfgErr) throw new Error(cfgErr);

  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { sub: uid, kid: signingKeyId(), exp: now + ttlSeconds },
    signingPrivateKey(),
    { algorithm: "RS256", keyid: signingKeyId() },
  );
}

/**
 * Standbild-URL eines Videos. Seit alle Kursvideos `requireSignedURLs` tragen,
 * braucht auch das Thumbnail einen Token — sonst antwortet Cloudflare mit 401
 * und im UI bleibt die Vorschaufläche leer.
 *
 * `time` wählt den Bildzeitpunkt (z. B. der gespeicherte Fortschritt), sodass
 * die Vorschau dort steht, wo weitergeschaut wird.
 */
export function buildThumbnailUrl(
  uid: string,
  opts: { signed?: boolean; ttlSeconds?: number; timeSeconds?: number; width?: number } = {},
): string {
  const subdomain = customerSubdomain();
  if (!subdomain) throw new Error("NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN fehlt.");

  const params = new URLSearchParams();
  if (opts.timeSeconds && opts.timeSeconds > 0) params.set("time", `${Math.floor(opts.timeSeconds)}s`);
  if (opts.width) params.set("width", String(opts.width));
  const query = params.toString() ? `?${params.toString()}` : "";

  const pfad = (opts.signed ?? true) ? signPlaybackToken(uid, opts.ttlSeconds) : uid;
  return `https://${subdomain}.cloudflarestream.com/${pfad}/thumbnails/thumbnail.jpg${query}`;
}

/** HLS-Manifest-URL — signiert (Standard) oder unsigniert (falls `requireSignedURLs: false` verwendet würde). */
export function buildManifestUrl(uid: string, opts: { signed?: boolean; ttlSeconds?: number } = {}): string {
  const subdomain = customerSubdomain();
  if (!subdomain) throw new Error("NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN fehlt.");
  const signed = opts.signed ?? true;
  if (!signed) {
    return `https://${subdomain}.cloudflarestream.com/${uid}/manifest/video.m3u8`;
  }
  const token = signPlaybackToken(uid, opts.ttlSeconds);
  return `https://${subdomain}.cloudflarestream.com/${token}/manifest/video.m3u8`;
}
