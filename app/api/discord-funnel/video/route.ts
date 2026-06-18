import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * POST /api/discord-funnel/video
 * Aktualisiert den Video-Fortschritt eines Discord-Funnel-Leads.
 * Öffentlich zugänglich — Auth ist bewusst nicht erforderlich.
 *
 * Body: { token, watchSeconds, percent }
 *
 * video_watch_seconds = max(existing, watchSeconds)
 * video_max_percent    = max(existing, percent)
 * video_completed_at wird gesetzt, sobald percent >= 95 und noch nicht gesetzt.
 *
 * Unbekannter Token → { ok: true, skipped: true } (still).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { token, watchSeconds, percent } = body as Record<string, unknown>;

  if (typeof token !== "string" || !token.trim()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const watch = typeof watchSeconds === "number" && Number.isFinite(watchSeconds)
    ? Math.max(0, Math.floor(watchSeconds))
    : 0;
  const pct = typeof percent === "number" && Number.isFinite(percent)
    ? Math.max(0, Math.min(100, Math.floor(percent)))
    : 0;

  const service = createServiceClient();

  const { data: lead } = await service
    .from("discord_leads")
    .select("video_watch_seconds, video_max_percent, video_completed_at")
    .eq("token", token.trim())
    .maybeSingle();

  if (!lead) {
    // Unbekannter Token — still ignorieren.
    return NextResponse.json({ ok: true, skipped: true });
  }

  const existingSeconds = typeof lead.video_watch_seconds === "number" ? lead.video_watch_seconds : 0;
  const existingPercent = typeof lead.video_max_percent === "number" ? lead.video_max_percent : 0;

  const update: Record<string, unknown> = {
    video_watch_seconds: Math.max(existingSeconds, watch),
    video_max_percent: Math.max(existingPercent, pct),
    updated_at: new Date().toISOString(),
  };

  if (pct >= 95 && !lead.video_completed_at) {
    update.video_completed_at = new Date().toISOString();
  }

  const { error: updateError } = await service
    .from("discord_leads")
    .update(update)
    .eq("token", token.trim());

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
