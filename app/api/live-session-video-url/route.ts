import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getPresignedGetUrl } from "@/lib/storage";
import { buildManifestUrl } from "@/lib/cloudflare-stream";
import { liveSessionIstFrei } from "@/lib/access-control/inhalt-zugang";
import { hatInhaltsZugang } from "@/lib/membership";

// jsonwebtoken (RS256) braucht Node-crypto, siehe `app/api/video-url/route.ts`.
export const runtime = "nodejs";

/**
 * Signed URL für Live-Session-Videos: Cloudflare Stream (signiertes HLS-Manifest,
 * `live_session_videos.cloudflare_uid`) oder, für Altbestand, ein R2-Key
 * (`storage_key`). Der Parameter `key` trägt die Stream-ID bzw. den Schlüssel.
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
  type Zeile = { id: string; storage_key: string | null; cloudflare_uid: string | null; session_id: string | null };
  const SPALTEN = "id, storage_key, cloudflare_uid, session_id";

  const [{ data: profile }, { data: perStreamId }] = await Promise.all([
    supabase.from("profiles").select("is_admin, is_paid").eq("id", authData.user.id).maybeSingle(),
    service.from("live_session_videos").select(SPALTEN).eq("cloudflare_uid", key).limit(1).maybeSingle(),
  ]);

  let video = perStreamId as Zeile | null;
  if (!video) {
    const { data: perSchluessel } = await service
      .from("live_session_videos")
      .select(SPALTEN)
      .eq("storage_key", key)
      .limit(1)
      .maybeSingle();
    video = perSchluessel as Zeile | null;
  }
  if (!video || (!video.cloudflare_uid && !video.storage_key)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (!hatInhaltsZugang(profile) && !(await liveSessionIstFrei(service, video.session_id))) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  if (video.cloudflare_uid) {
    const expiresInSeconds = 4 * 60 * 60;
    try {
      return NextResponse.json({
        ok: true,
        url: buildManifestUrl(video.cloudflare_uid, { signed: true, ttlSeconds: expiresInSeconds }),
        expiresInSeconds,
        expiresAt: Date.now() + expiresInSeconds * 1000,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "cloudflare_signing_failed";
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
  }

  const signedUrl = await getPresignedGetUrl(video.storage_key as string);
  const expiresInSeconds = 60 * 15;
  return NextResponse.json({
    ok: true,
    url: signedUrl,
    expiresInSeconds,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  });
}
