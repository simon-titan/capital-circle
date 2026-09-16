import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStorageMisconfiguration, getPresignedPutUrl } from "@/lib/storage";

export const runtime = "nodejs";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Presigned PUT fuer Zertifikats-Uploads (eingeloggte Mitglieder, kein Admin noetig).
 * GET /api/certificates/presign-upload?fileName=&contentType=
 */
export async function GET(request: Request) {
  const cfgErr = getStorageMisconfiguration();
  if (cfgErr) {
    return NextResponse.json({ ok: false, error: cfgErr }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawFileName = url.searchParams.get("fileName")?.trim() || "nachweis.jpg";
  const contentType = url.searchParams.get("contentType")?.trim() || "image/jpeg";

  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "only_images_allowed" }, { status: 400 });
  }

  const safeName = sanitizeFileName(rawFileName);
  const storageKey = `certificates/${user.id}/${Date.now()}-${safeName}`;

  try {
    const presignedUrl = await getPresignedPutUrl(storageKey, contentType);
    return NextResponse.json({ ok: true, presignedUrl, storageKey });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "presign_failed";
    console.error("[certificates/presign-upload] error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
