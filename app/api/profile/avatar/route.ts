import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHetznerStorageMisconfiguration, putObjectBody } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/profile/avatar
 *
 * Lädt ein Profilbild für den aktuell eingeloggten Nutzer hoch.
 * Protokoll identisch zum Admin-Upload-Proxy:
 *   - Body: roher Datei-Inhalt
 *   - Header: X-File-Name (URL-encoded), Content-Type
 *
 * Speicherpfad: avatars/<userId>/<dateiname>
 * Nach dem Upload wird profiles.avatar_url automatisch aktualisiert.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const cfgErr = getHetznerStorageMisconfiguration();
  if (cfgErr) {
    return NextResponse.json({ ok: false, error: cfgErr }, { status: 503 });
  }

  const contentType = request.headers.get("content-type") ?? "application/octet-stream";
  if (!ALLOWED_MIME.has(contentType)) {
    return NextResponse.json(
      { ok: false, error: "Nur Bildformate erlaubt (JPEG, PNG, WebP, GIF, AVIF)." },
      { status: 415 },
    );
  }

  const rawFileName = request.headers.get("x-file-name");
  const fileName = rawFileName
    ? decodeURIComponent(rawFileName).replace(/[^a-zA-Z0-9._-]/g, "_")
    : "avatar.jpg";

  const arrayBuffer = await request.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    return NextResponse.json({ ok: false, error: "empty_body" }, { status: 400 });
  }
  if (arrayBuffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Datei zu groß (max. 5 MB)." }, { status: 413 });
  }

  const userId = authData.user.id;
  const storageKey = `avatars/${userId}/${fileName}`;

  try {
    const buffer = Buffer.from(arrayBuffer);
    await putObjectBody(storageKey, buffer, contentType);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "upload_failed";
    console.error("[profile/avatar] upload error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ avatar_url: storageKey })
    .eq("id", userId);

  if (dbError) {
    console.error("[profile/avatar] db update error:", dbError.message);
    return NextResponse.json(
      { ok: false, error: "Upload erfolgreich, aber Profil konnte nicht aktualisiert werden." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, storageKey });
}
