/**
 * Direkter Upload zu Hetzner Object Storage per Presigned PUT (umgeht Vercel ~4.5 MB Body-Limit).
 * Voraussetzung: Bucket-CORS, siehe docs/hetzner-presigned-upload-cors.md
 */

export type PresignParams = Record<string, string | undefined>;

async function fetchPresignPayload(
  file: File,
  extraParams: PresignParams,
): Promise<{ presignedUrl: string; storageKey: string }> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(extraParams)) {
    if (v !== undefined && v !== "") params.set(k, v);
  }
  params.set("fileName", file.name);
  params.set("contentType", file.type || "application/octet-stream");

  const res = await fetch(`/api/admin/presign-upload?${params.toString()}`);
  const json = (await res.json()) as {
    ok?: boolean;
    presignedUrl?: string;
    storageKey?: string;
    error?: string;
  };
  if (!res.ok || !json.ok || !json.presignedUrl || !json.storageKey) {
    throw new Error(json.error || `Presign fehlgeschlagen (${res.status})`);
  }
  return { presignedUrl: json.presignedUrl, storageKey: json.storageKey };
}

function putFileToPresignedUrl(
  presignedUrl: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const ct = file.type || "application/octet-stream";
  if (!onProgress) {
    return fetch(presignedUrl, { method: "PUT", headers: { "Content-Type": ct }, body: file }).then(
      (put) => {
        if (!put.ok) throw new Error(`Upload fehlgeschlagen (${put.status})`);
      },
    );
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", ct);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Upload fehlgeschlagen (${xhr.status})`));
        return;
      }
      resolve();
    };
    xhr.onerror = () => reject(new Error("Netzwerkfehler beim Upload"));
    xhr.send(file);
  });
}

/** Kleine Dateien (Cover, Thumbnail) ohne Fortschrittsanzeige — PUT direkt zum Bucket. */
export async function uploadSmallFilePresigned(file: File, extraParams: PresignParams): Promise<string> {
  const { presignedUrl, storageKey } = await fetchPresignPayload(file, extraParams);
  await putFileToPresignedUrl(presignedUrl, file);
  return storageKey;
}

/**
 * Große Dateien mit optionalem Fortschritt — Presign über die App, PUT direkt zu Hetzner.
 * `onProgress` gesetzt: XMLHttpRequest.upload (Fortschritt bis zum Bucket, nicht über Vercel).
 */
export async function uploadViaPresigned(
  file: File,
  extraParams: PresignParams,
  onProgress?: (pct: number) => void,
): Promise<string> {
  onProgress?.(0);
  const { presignedUrl, storageKey } = await fetchPresignPayload(file, extraParams);
  await putFileToPresignedUrl(presignedUrl, file, onProgress);
  onProgress?.(100);
  return storageKey;
}
