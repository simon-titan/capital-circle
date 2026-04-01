import { NextResponse } from "next/server";
import { buildAdminStorageKey, type AdminUploadKeyInput } from "@/lib/admin-upload-key";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { getHetznerStorageMisconfiguration, putObjectBody } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Serverseitiger Upload-Proxy — umgeht Browser-CORS zum Object Storage.
 *
 * Protokoll: POST /api/admin/upload-proxy?folder=...&courseId=...&...
 * Body: roher Datei-Inhalt (application/octet-stream oder echter MIME-Type)
 * Header: X-File-Name: <Dateiname>, Content-Type: <MIME-Type>
 */
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const cfgErr = getHetznerStorageMisconfiguration();
  if (cfgErr) {
    return NextResponse.json({ ok: false, error: cfgErr }, { status: 503 });
  }

  const url = new URL(request.url);
  const qs = (key: string) => {
    const v = url.searchParams.get(key);
    return v && v.trim() !== "" ? v.trim() : undefined;
  };

  const fileName = request.headers.get("x-file-name") ?? qs("fileName") ?? "upload.bin";
  const contentTypeHeader = request.headers.get("content-type") ?? "application/octet-stream";

  const body: AdminUploadKeyInput = {
    fileName: decodeURIComponent(fileName),
    contentType: contentTypeHeader === "application/octet-stream" ? undefined : contentTypeHeader,
    folder: (qs("folder") as AdminUploadKeyInput["folder"]) ?? "attachments",
    courseId: qs("courseId"),
    moduleId: qs("moduleId"),
    videoId: qs("videoId"),
    sessionId: qs("sessionId"),
    subcategoryId: qs("subcategoryId"),
    kind: qs("kind") as AdminUploadKeyInput["kind"] | undefined,
    attachmentId: qs("attachmentId"),
  };

  const keyResult = buildAdminStorageKey(body);
  if (!keyResult.ok) {
    return NextResponse.json({ ok: false, error: keyResult.error }, { status: keyResult.status });
  }

  const { storageKey, contentType } = keyResult;

  try {
    const arrayBuffer = await request.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return NextResponse.json({ ok: false, error: "empty_body" }, { status: 400 });
    }
    const buffer = Buffer.from(arrayBuffer);
    await putObjectBody(storageKey, buffer, contentType);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "upload_failed";
    console.error("[upload-proxy] error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, storageKey });
}
