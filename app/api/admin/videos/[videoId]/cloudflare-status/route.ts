import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { getVideoStatus } from "@/lib/cloudflare-stream";

export const runtime = "nodejs";

/**
 * Fragt den aktuellen Cloudflare-Verarbeitungsstatus für ein Video ab und
 * schreibt ihn in die DB zurück — genutzt vom Admin-Auto-Poll UND vom
 * manuellen Refresh-Button in VideoManager.tsx.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ videoId: string }> }) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { videoId } = await params;
  const { data: video, error: fetchError } = await supabase
    .from("videos")
    .select("id, cloudflare_uid, duration_seconds")
    .eq("id", videoId)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ ok: false, error: fetchError.message }, { status: 400 });
  if (!video) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (!video.cloudflare_uid) {
    return NextResponse.json({ ok: false, error: "no_cloudflare_uid" }, { status: 400 });
  }

  try {
    const status = await getVideoStatus(video.cloudflare_uid);

    const updates: Record<string, unknown> = {};
    if (status.state === "ready" && status.readyToStream) {
      updates.cloudflare_status = "ready";
      updates.cloudflare_ready_at = new Date().toISOString();
      updates.cloudflare_error = null;
      if (video.duration_seconds == null && status.durationSeconds != null) {
        updates.duration_seconds = status.durationSeconds;
      }
    } else if (status.state === "error") {
      updates.cloudflare_status = "error";
      updates.cloudflare_error = status.errorReasonText ?? "Unbekannter Cloudflare-Fehler.";
    } else {
      updates.cloudflare_status = "processing";
    }

    const { data: updated, error: updateError } = await supabase
      .from("videos")
      .update(updates)
      .eq("id", videoId)
      .select("*")
      .single();
    if (updateError) return NextResponse.json({ ok: false, error: updateError.message }, { status: 400 });

    return NextResponse.json({ ok: true, item: updated, cloudflareState: status.state });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "cloudflare_status_failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
