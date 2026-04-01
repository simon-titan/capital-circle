import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPresignedGetUrl } from "@/lib/storage";

/**
 * Liefert eine kurzlebige Signed-URL zum Abspielen (MP4).
 * Nur eingeloggte Nutzer; published Video oder Admin-Vorschau.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ ok: false, error: "missing_key" }, { status: 400 });
  }

  const [{ data: profile }, { data: video }] = await Promise.all([
    supabase.from("profiles").select("is_admin").eq("id", authData.user.id).single(),
    supabase.from("videos").select("id, is_published, storage_key").eq("storage_key", key).maybeSingle(),
  ]);

  if (!video) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (!video.is_published && !profile?.is_admin) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const signedUrl = await getPresignedGetUrl(key);
  const expiresInSeconds = 60 * 15;
  return NextResponse.json({
    ok: true,
    url: signedUrl,
    expiresInSeconds,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  });
}
