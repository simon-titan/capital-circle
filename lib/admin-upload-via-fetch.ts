/**
 * Großer Datei-Upload zum Admin-Proxy mit Fortschritt — per fetch + ReadableStream
 * (kein XMLHttpRequest: XHR puffert den Body und löst bei großen Videos 413 aus).
 *
 * Erfordert duplex: "half" (Chromium 105+, Firefox 112+, Safari 17.4+).
 */
export async function uploadFileViaFetchWithProgress(
  file: File,
  url: string,
  headers: Record<string, string>,
  onProgress: (pct: number) => void,
): Promise<string> {
  onProgress(0);
  let uploaded = 0;
  const total = file.size;
  const stream = file.stream().pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        uploaded += chunk.byteLength;
        onProgress(total > 0 ? Math.min(100, Math.round((uploaded / total) * 100)) : 0);
        controller.enqueue(chunk);
      },
    }),
  );

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: stream,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  let j: { ok?: boolean; storageKey?: string; error?: string };
  try {
    j = (await res.json()) as { ok?: boolean; storageKey?: string; error?: string };
  } catch {
    throw new Error(`Upload fehlgeschlagen (${res.status})`);
  }
  if (!res.ok || !j.ok || !j.storageKey) {
    throw new Error(j.error || `Upload fehlgeschlagen (${res.status})`);
  }
  onProgress(100);
  return j.storageKey;
}
