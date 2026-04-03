import { NextResponse } from "next/server";
import { buildAdminStorageKey } from "@/lib/admin-upload-key";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { getPresignedPutUrl } from "@/lib/storage";

/**
 * Liefert eine Presigned-PUT-URL (z. B. für externe Tools). Browser-Uploads nutzen
 * GET /api/admin/presign-upload + PUT zum Bucket (siehe docs/hetzner-presigned-upload-cors.md).
 */
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as Parameters<typeof buildAdminStorageKey>[0];

  const keyResult = buildAdminStorageKey(body);
  if (!keyResult.ok) {
    return NextResponse.json({ ok: false, error: keyResult.error }, { status: keyResult.status });
  }

  const { storageKey, contentType } = keyResult;
  const uploadUrl = await getPresignedPutUrl(storageKey, contentType);
  return NextResponse.json({ ok: true, storageKey, uploadUrl });
}
