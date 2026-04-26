import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ToggleBody = {
  isLive?: unknown;
  streamId?: unknown;
  title?: unknown;
};

/**
 * POST /api/admin/stream/toggle
 *
 * Schaltet das Free-Streaming an/aus und pflegt Titel + Video-UID.
 * Bei false -> true: started_at = now(); bei true -> false: started_at = null.
 * updated_by wird aus der Admin-Session gesetzt.
 */
export async function POST(request: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  let body: ToggleBody;
  try {
    body = (await request.json()) as ToggleBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  if (typeof body.isLive !== "boolean") {
    return NextResponse.json({ ok: false, error: "isLive must be boolean" }, { status: 400 });
  }

  const nextIsLive = body.isLive;
  const rawStreamId = typeof body.streamId === "string" ? body.streamId.trim() : "";
  const rawTitle = typeof body.title === "string" ? body.title.trim() : "";

  // Wenn eingeschaltet wird, darf die Video-UID nicht leer sein — sonst haette der Player nichts zu zeigen.
  if (nextIsLive && rawStreamId.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Cloudflare Video-UID fehlt. Bitte im Feld eintragen, bevor der Stream aktiviert wird." },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  // Aktuellen Zustand lesen, um den Uebergang korrekt zu handhaben (started_at setzen/zuruecksetzen).
  const { data: current, error: readErr } = await service
    .from("stream_settings")
    .select("is_live, started_at")
    .eq("id", 1)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ ok: false, error: readErr.message }, { status: 500 });
  }

  const prevIsLive = Boolean(current?.is_live);

  // started_at-Logik:
  // - Uebergang offline -> live: started_at = now()
  // - Uebergang live -> offline: started_at = null
  // - Sonst (kein Flip): bestehendes started_at beibehalten
  let nextStartedAt: string | null;
  if (!prevIsLive && nextIsLive) {
    nextStartedAt = new Date().toISOString();
  } else if (prevIsLive && !nextIsLive) {
    nextStartedAt = null;
  } else {
    nextStartedAt = (current?.started_at as string | null) ?? null;
  }

  const updatePayload: Record<string, unknown> = {
    is_live: nextIsLive,
    started_at: nextStartedAt,
    updated_by: user?.id ?? null,
  };

  // Titel nur ueberschreiben, wenn explizit mitgeschickt (sonst Default-Wert in DB nicht leeren).
  if (rawTitle.length > 0) {
    updatePayload.title = rawTitle;
  }

  // Video-UID: leer bedeutet "loeschen" (wenn der Admin bewusst raus-loescht), sonst setzen.
  if (typeof body.streamId === "string") {
    updatePayload.cloudflare_stream_id = rawStreamId.length > 0 ? rawStreamId : null;
  }

  const { data: updated, error: updErr } = await service
    .from("stream_settings")
    .update(updatePayload)
    .eq("id", 1)
    .select("is_live, cloudflare_stream_id, title, started_at, updated_at")
    .single();

  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }

  const row = updated as {
    is_live: boolean;
    cloudflare_stream_id: string | null;
    title: string;
    started_at: string | null;
    updated_at: string;
  };

  return NextResponse.json({
    ok: true,
    status: {
      isLive: row.is_live,
      streamId: row.cloudflare_stream_id,
      title: row.title,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
    },
  });
}
