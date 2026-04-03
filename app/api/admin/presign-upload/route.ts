import { NextResponse } from "next/server";
import { buildAdminStorageKey, type AdminUploadKeyInput } from "@/lib/admin-upload-key";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { getHetznerStorageMisconfiguration, getPresignedPutUrl } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Liefert eine Presigned PUT-URL zum direkten Upload zum Hetzner-Bucket (umgeht Vercel Body-Limits).
 *
 * GET /api/admin/presign-upload?folder=...&courseId=...&fileName=...&contentType=...
 * (gleiche Query-Parameter wie upload-proxy; kein Request-Body.)
 */
export async function GET(request: Request) {
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

  const rawFileName = qs("fileName") ?? "upload.bin";
  let fileName = rawFileName;
  try {
    fileName = decodeURIComponent(rawFileName);
  } catch {
    fileName = rawFileName;
  }
  const contentTypeQs = qs("contentType") ?? "application/octet-stream";

  const body: AdminUploadKeyInput = {
    fileName: decodeURIComponent(fileName),
    contentType: contentTypeQs === "application/octet-stream" ? undefined : contentTypeQs,
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
    const presignedUrl = await getPresignedPutUrl(storageKey, contentType);
    return NextResponse.json({ ok: true, presignedUrl, storageKey });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "presign_failed";
    console.error("[presign-upload] error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
