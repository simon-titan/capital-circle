import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * GET /api/discord-funnel/lead-info?lid={token}
 *
 * Liefert Vorname + E-Mail zu einem Lead-Token — ausschließlich zum Vorbefüllen
 * des Calendly-Widgets auf der Termin-Seite. Der Token ist ein nicht erratbarer
 * UUID, daher öffentlich. Es werden nur die fürs Prefill nötigen Felder zurückgegeben.
 */
export async function GET(request: NextRequest) {
  const lid = (new URL(request.url).searchParams.get("lid") ?? "").trim();
  if (!lid) {
    return NextResponse.json({ ok: false, error: "lid required" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data } = await service
    .from("discord_leads")
    .select("name, email")
    .eq("token", lid)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ ok: true, firstName: null, email: null });
  }

  const name = ((data.name as string | null) ?? "").trim();
  const firstName = name ? (name.split(/\s+/)[0] ?? null) : null;
  const email = ((data.email as string | null) ?? "").trim() || null;

  return NextResponse.json({ ok: true, firstName, email });
}
