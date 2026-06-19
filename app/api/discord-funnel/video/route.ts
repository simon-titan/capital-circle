import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { VIDEO_SOURCES, type VideoSource } from "@/lib/discord-funnel/types";

export const runtime = "nodejs";

/**
 * POST /api/discord-funnel/video
 * Aktualisiert den Video-Fortschritt — sowohl als Event-Row in
 * `discord_video_views` (eine Row je session_id+source bzw. token+source) als
 * auch denormalisiert am verknüpften `discord_leads`-Lead.
 *
 * Öffentlich zugänglich — Auth ist bewusst nicht erforderlich.
 *
 * Body (rückwärtskompatibel):
 *   { token?, session_id?, watchSeconds, percent, source?, completed?, sessionStart? }
 *
 * Alte Aufrufer mit nur { token, watchSeconds, percent } funktionieren weiter.
 *
 * - watched_seconds / max_percent werden monoton mit max() fortgeschrieben.
 * - completed = completed || (percent >= 95) || bestehend.
 * - Unbekannter Token wird NICHT verworfen: der View landet trotzdem in
 *   discord_video_views (lose Session) und { ok: true } wird zurückgegeben.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const {
    token,
    session_id,
    watchSeconds,
    percent,
    source,
    completed,
    sessionStart,
  } = body as Record<string, unknown>;

  const tokenVal =
    typeof token === "string" && token.trim() ? token.trim() : null;
  const sessionId =
    typeof session_id === "string" && session_id.trim() ? session_id.trim() : null;

  const watch =
    typeof watchSeconds === "number" && Number.isFinite(watchSeconds)
      ? Math.max(0, Math.floor(watchSeconds))
      : 0;
  const pct =
    typeof percent === "number" && Number.isFinite(percent)
      ? Math.max(0, Math.min(100, Math.floor(percent)))
      : 0;

  const sourceVal: VideoSource = VIDEO_SOURCES.includes(source as VideoSource)
    ? (source as VideoSource)
    : "unknown";

  const completedReq = completed === true || pct >= 95;
  const sessionStartVal =
    typeof sessionStart === "string" && sessionStart.trim() ? sessionStart.trim() : null;

  // Ohne jegliche Identität (kein token, keine session_id) lässt sich kein View
  // sinnvoll persistieren — still ignorieren.
  if (!tokenVal && !sessionId) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const service = createServiceClient();
  const nowIso = new Date().toISOString();

  // Verknüpften Lead (falls per Token auflösbar) ermitteln — für lead_id +
  // Denormalisierung.
  let leadId: string | null = null;
  let leadSeconds = 0;
  let leadPercent = 0;
  let leadCompletedAt: string | null = null;
  let leadFound = false;

  if (tokenVal) {
    const { data: lead } = await service
      .from("discord_leads")
      .select("id, video_watch_seconds, video_max_percent, video_completed_at")
      .eq("token", tokenVal)
      .maybeSingle();

    if (lead) {
      leadFound = true;
      leadId = typeof lead.id === "string" ? lead.id : null;
      leadSeconds = typeof lead.video_watch_seconds === "number" ? lead.video_watch_seconds : 0;
      leadPercent = typeof lead.video_max_percent === "number" ? lead.video_max_percent : 0;
      leadCompletedAt =
        typeof lead.video_completed_at === "string" ? lead.video_completed_at : null;
    }
  }

  /* ── Upsert in discord_video_views ───────────────────────────────────────── */
  // Schlüssel: (session_id, source) wenn session_id vorhanden, sonst (token, source).
  let viewQuery = service
    .from("discord_video_views")
    .select("id, watched_seconds, max_percent, completed")
    .eq("source", sourceVal);

  viewQuery = sessionId
    ? viewQuery.eq("session_id", sessionId)
    : viewQuery.eq("token", tokenVal as string);

  const { data: existingView } = await viewQuery.maybeSingle();

  if (existingView) {
    const existingSeconds =
      typeof existingView.watched_seconds === "number" ? existingView.watched_seconds : 0;
    const existingPercent =
      typeof existingView.max_percent === "number" ? existingView.max_percent : 0;
    const existingCompleted = existingView.completed === true;

    const update: Record<string, unknown> = {
      watched_seconds: Math.max(existingSeconds, watch),
      max_percent: Math.max(existingPercent, pct),
      completed: existingCompleted || completedReq,
      session_end: nowIso,
      updated_at: nowIso,
    };
    // token/lead_id nachziehen, sobald verfügbar (Session war evtl. zuerst anonym).
    if (tokenVal) update.token = tokenVal;
    if (leadId) update.lead_id = leadId;

    const { error: viewUpdateError } = await service
      .from("discord_video_views")
      .update(update)
      .eq("id", existingView.id);

    if (viewUpdateError) {
      return NextResponse.json({ ok: false, error: viewUpdateError.message }, { status: 500 });
    }
  } else {
    const { error: viewInsertError } = await service.from("discord_video_views").insert({
      session_id: sessionId,
      token: tokenVal,
      lead_id: leadId,
      source: sourceVal,
      watched_seconds: watch,
      max_percent: pct,
      completed: completedReq,
      session_start: sessionStartVal ?? nowIso,
      session_end: nowIso,
    });

    if (viewInsertError) {
      return NextResponse.json({ ok: false, error: viewInsertError.message }, { status: 500 });
    }
  }

  /* ── Denormalisierung auf den Lead (nur bei aufgelöstem Lead) ─────────────── */
  if (leadFound) {
    // View-Count = Anzahl Rows in discord_video_views für diesen Lead
    // (per lead_id ODER token).
    let viewCount = 0;
    {
      const orParts: string[] = [];
      if (leadId) orParts.push(`lead_id.eq.${leadId}`);
      if (tokenVal) orParts.push(`token.eq.${tokenVal}`);

      let countQuery = service
        .from("discord_video_views")
        .select("id", { count: "exact", head: true });
      countQuery = orParts.length > 0 ? countQuery.or(orParts.join(",")) : countQuery;

      const { count } = await countQuery;
      viewCount = typeof count === "number" ? count : 0;
    }

    const leadUpdate: Record<string, unknown> = {
      video_watch_seconds: Math.max(leadSeconds, watch),
      video_max_percent: Math.max(leadPercent, pct),
      video_view_count: viewCount,
      video_last_watched_at: nowIso,
      updated_at: nowIso,
    };
    if (pct >= 95 && !leadCompletedAt) {
      leadUpdate.video_completed_at = nowIso;
    }

    const { error: leadUpdateError } = await service
      .from("discord_leads")
      .update(leadUpdate)
      .eq("token", tokenVal as string);

    if (leadUpdateError) {
      return NextResponse.json({ ok: false, error: leadUpdateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
