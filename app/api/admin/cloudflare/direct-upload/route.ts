import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import {
  createDirectUpload,
  createDirectUploadTus,
  getCloudflareStreamMisconfiguration,
} from "@/lib/cloudflare-stream";

export const runtime = "nodejs";

const SMALL_FILE_LIMIT_BYTES = 190 * 1024 * 1024;

/**
 * Liefert eine Cloudflare-Direct-Creator-Upload-URL für den Admin-Video-Upload.
 * <190MB: klassischer JSON-`/direct_upload`-Endpoint (Single-POST).
 * >=190MB: TUS-Erstellung (`createDirectUploadTus`) — resumable, für große Dateien nötig.
 *
 * GET /api/admin/cloudflare/direct-upload?sizeBytes=...&name=...&maxDurationSeconds=...
 */
export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const cfgErr = getCloudflareStreamMisconfiguration();
  if (cfgErr) {
    return NextResponse.json({ ok: false, error: cfgErr }, { status: 503 });
  }

  const url = new URL(request.url);
  const sizeBytes = Number(url.searchParams.get("sizeBytes") ?? "0");
  const name = url.searchParams.get("name") ?? undefined;
  const maxDurationSecondsParam = url.searchParams.get("maxDurationSeconds");
  const maxDurationSeconds = maxDurationSecondsParam ? Number(maxDurationSecondsParam) : undefined;

  if (!sizeBytes || sizeBytes <= 0) {
    return NextResponse.json({ ok: false, error: "missing_or_invalid_sizeBytes" }, { status: 400 });
  }

  try {
    const result =
      sizeBytes >= SMALL_FILE_LIMIT_BYTES
        ? await createDirectUploadTus({ fileSizeBytes: sizeBytes, maxDurationSeconds })
        : await createDirectUpload({ name, maxDurationSeconds });
    return NextResponse.json({ ok: true, uploadUrl: result.uploadUrl, uid: result.uid });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "direct_upload_failed";
    console.error("[cloudflare/direct-upload] error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
