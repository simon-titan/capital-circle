import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stream/status
 *
 * Liefert den aktuellen Live-Status fuer den Free-User-Poller.
 * Nur fuer authentifizierte Nutzer (Free + Admin) — Zugriffsfilter auf /stream
 * selbst laeuft schon auf der Page. Hier zusaetzlich Auth-Gate als Minimalschutz.
 */
export async function GET() {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("stream_settings")
    .select("is_live, cloudflare_stream_id, title, started_at, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const row = data as
    | {
        is_live: boolean;
        cloudflare_stream_id: string | null;
        title: string;
        started_at: string | null;
        updated_at: string;
      }
    | null;

  return NextResponse.json(
    {
      ok: true,
      status: {
        isLive: Boolean(row?.is_live),
        streamId: row?.cloudflare_stream_id ?? null,
        title: row?.title ?? "Live Analyse",
        startedAt: row?.started_at ?? null,
        updatedAt: row?.updated_at ?? null,
      },
    },
    {
      headers: {
        // Nicht cachen: Status muss stets frisch geladen werden.
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
