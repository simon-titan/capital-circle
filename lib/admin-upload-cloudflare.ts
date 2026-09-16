/**
 * Admin-Upload direkt zu Cloudflare Stream — analog zu `lib/admin-upload-presigned.ts`
 * (Hetzner), aber Cloudflares Direct-Creator-Upload-Ziel statt presigntem S3-PUT.
 *
 * <190MB: einfacher `multipart/form-data`-POST (Cloudflares Grenze für Single-Request-
 * Uploads). Größere Dateien: resumable TUS-Upload (`tus-js-client`) — Cloudflares
 * Direct-Upload-Ziel ist direkt TUS-1.0.0-kompatibel.
 */
import * as tus from "tus-js-client";

const SMALL_FILE_LIMIT_BYTES = 190 * 1024 * 1024;

async function requestDirectUpload(meta: {
  name?: string;
  maxDurationSeconds?: number;
  sizeBytes: number;
}): Promise<{ uploadUrl: string; uid: string }> {
  const params = new URLSearchParams();
  if (meta.name) params.set("name", meta.name);
  if (meta.maxDurationSeconds) params.set("maxDurationSeconds", String(meta.maxDurationSeconds));
  params.set("sizeBytes", String(meta.sizeBytes));

  const res = await fetch(`/api/admin/cloudflare/direct-upload?${params.toString()}`);
  const json = (await res.json()) as { ok?: boolean; uploadUrl?: string; uid?: string; error?: string };
  if (!res.ok || !json.ok || !json.uploadUrl || !json.uid) {
    throw new Error(json.error || `Direct-Upload-URL konnte nicht angefordert werden (${res.status})`);
  }
  return { uploadUrl: json.uploadUrl, uid: json.uid };
}

function uploadSmallFile(
  uploadUrl: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress?.(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Cloudflare-Upload fehlgeschlagen (${xhr.status})`));
        return;
      }
      resolve();
    };
    xhr.onerror = () => reject(new Error("Netzwerkfehler beim Cloudflare-Upload"));
    xhr.send(form);
  });
}

function uploadLargeFileViaTus(
  uploadUrl: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      uploadUrl,
      chunkSize: 50 * 1024 * 1024,
      retryDelays: [0, 1000, 3000, 5000],
      metadata: { filename: file.name, filetype: file.type || "video/mp4" },
      onError: (err) => reject(err instanceof Error ? err : new Error(String(err))),
      onProgress: (bytesUploaded, bytesTotal) => {
        if (bytesTotal > 0) onProgress?.(Math.round((bytesUploaded / bytesTotal) * 100));
      },
      onSuccess: () => resolve(),
    });
    upload.start();
  });
}

export type CloudflareUploadResult = { uid: string };

/** Einheitlicher Einstiegspunkt — wählt automatisch kleinen oder TUS-Upload-Pfad. */
export async function uploadVideoToCloudflare(
  file: File,
  meta: { name?: string; maxDurationSeconds?: number },
  onProgress?: (pct: number) => void,
): Promise<CloudflareUploadResult> {
  onProgress?.(0);
  const { uploadUrl, uid } = await requestDirectUpload({ ...meta, sizeBytes: file.size });

  if (file.size <= SMALL_FILE_LIMIT_BYTES) {
    await uploadSmallFile(uploadUrl, file, onProgress);
  } else {
    await uploadLargeFileViaTus(uploadUrl, file, onProgress);
  }

  onProgress?.(100);
  return { uid };
}
