import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * POST /api/discord-funnel/visit
 * Zeichnet einen Seitenaufruf der öffentlichen Discord-Funnel-Landing auf.
 * Öffentlich zugänglich — Auth ist bewusst nicht erforderlich.
 *
 * Body: { session_id?, utm_source?, utm_medium?, utm_campaign?, utm_content?, utm_term?, referrer? }
 *
 * Visits werden per session_id dedupliziert (ein Visit pro Session).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const {
    session_id,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    referrer,
  } = body as Record<string, unknown>;

  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const service = createServiceClient();

  const sessionId = str(session_id);

  // Dedup: existiert bereits ein Visit für diese session_id?
  if (sessionId) {
    const { data: existing } = await service
      .from("discord_page_visits")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, skipped: true });
    }
  }

  const { error: insertError } = await service.from("discord_page_visits").insert({
    session_id: sessionId,
    utm_source: str(utm_source),
    utm_medium: str(utm_medium),
    utm_campaign: str(utm_campaign),
    utm_content: str(utm_content),
    utm_term: str(utm_term),
    referrer: str(referrer),
  });

  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
