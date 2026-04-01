import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPresignedGetUrl } from "@/lib/storage";

/**
 * Signed URL für Live-Session-Videos (Hetzner-Key in live_session_videos.storage_key).
 * Nur eingeloggte Nutzer; Key muss einer Zeile in live_session_videos entsprechen.
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

  const { data: row } = await supabase
    .from("live_session_videos")
    .select("id, storage_key")
    .eq("storage_key", key)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
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
