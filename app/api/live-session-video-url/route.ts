import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getPresignedGetUrl } from "@/lib/storage";
import { liveSessionIstFrei } from "@/lib/access-control/inhalt-zugang";
import { hatInhaltsZugang } from "@/lib/membership";

/**
 * Signed URL für Live-Session-Videos (R2-Key in live_session_videos.storage_key).
 *
 * Zugang: Der Key muss einer Zeile in live_session_videos entsprechen, und
 * - mit Zahlung (`profiles.is_paid`) oder als Admin: jedes Video,
 * - ohne Zahlung: nur Videos der freien Kategorie (`live-session-free.ts`).
 *
 * Nachgeschlagen wird über den Service-Client, geprüft wird hier — so hängt
 * die Sperre nicht davon ab, ob Migration 076 schon eingespielt ist.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key")?.trim();
  if (!key) {
    return NextResponse.json({ ok: false, error: "missing_key" }, { status: 400 });
  }

  const service = createServiceClient();
  const [{ data: profile }, { data: row }] = await Promise.all([
    supabase.from("profiles").select("is_admin, is_paid").eq("id", authData.user.id).maybeSingle(),
    service
      .from("live_session_videos")
      .select("id, storage_key, session_id")
      .eq("storage_key", key)
      .limit(1)
      .maybeSingle(),
  ]);

  const video = row as { id: string; storage_key: string | null; session_id: string | null } | null;
  if (!video?.storage_key) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (!hatInhaltsZugang(profile) && !(await liveSessionIstFrei(service, video.session_id))) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const signedUrl = await getPresignedGetUrl(video.storage_key);
  const expiresInSeconds = 60 * 15;
  return NextResponse.json({
    ok: true,
    url: signedUrl,
    expiresInSeconds,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  });
}
