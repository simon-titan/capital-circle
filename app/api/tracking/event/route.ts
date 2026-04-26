import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * POST /api/tracking/event
 * Zeichnet ein Tracking-Event (visit oder application) für einen Insight-Link auf.
 * Öffentlich zugänglich — Auth ist bewusst nicht erforderlich.
 *
 * Body: { slug: string; type: "visit" | "application"; session_id?: string }
 *
 * Visits werden per session_id dedupliziert (ein Visit pro Session pro Link).
 * Applications werden nicht dedupliziert.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, type, session_id } = body as Record<string, unknown>;

  if (typeof slug !== "string" || !slug.trim()) {
    return NextResponse.json({ ok: false, error: "slug required" }, { status: 400 });
  }
  if (type !== "visit" && type !== "application") {
    return NextResponse.json({ ok: false, error: "type must be visit or application" }, { status: 400 });
  }

  const service = createServiceClient();

  // Prüfe ob der Link existiert
  const { data: link } = await service
    .from("insight_tracking_links")
    .select("slug")
    .eq("slug", slug.trim())
    .single();

  if (!link) {
    // Kein 404 — stilles Ignore damit Tracking-Links nicht enumerable sind
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Visit-Dedup: Existiert bereits ein Visit-Event für diese session_id + slug?
  if (type === "visit" && typeof session_id === "string" && session_id.trim()) {
    const { data: existing } = await service
      .from("insight_tracking_events")
      .select("id")
      .eq("link_slug", slug.trim())
      .eq("event_type", "visit")
      .eq("session_id", session_id.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, skipped: true });
    }
  }

  const { error: insertError } = await service
    .from("insight_tracking_events")
    .insert({
      link_slug: slug.trim(),
      event_type: type,
      session_id: typeof session_id === "string" && session_id.trim() ? session_id.trim() : null,
    });

  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
