import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPresignedGetUrl } from "@/lib/storage";

/**
 * Kurzlebige Signed-URL für Session-Thumbnails (live_sessions.thumbnail_storage_key).
 * Optional: videoId für live_session_videos.thumbnail_key.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  const videoId = url.searchParams.get("videoId");

  let key: string | null = null;

  if (videoId) {
    const { data: v } = await supabase
      .from("live_session_videos")
      .select("thumbnail_key")
      .eq("id", videoId)
      .maybeSingle();
    key = (v as { thumbnail_key?: string | null } | null)?.thumbnail_key?.trim() ?? null;
  } else if (sessionId) {
    const { data: s } = await supabase
      .from("live_sessions")
      .select("thumbnail_storage_key")
      .eq("id", sessionId)
      .maybeSingle();
    key = (s as { thumbnail_storage_key?: string | null } | null)?.thumbnail_storage_key?.trim() ?? null;
  }

  if (!key) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const signed = await getPresignedGetUrl(key);
  return NextResponse.redirect(signed, 307);
}
