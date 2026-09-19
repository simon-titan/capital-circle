import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Widerspruch gegen Discord-Direktnachrichten (`profiles.discord_dm_widerspruch`,
 * Migration 081) — lesen und setzen, nur für das eigene Konto.
 *
 * Geschrieben wird mit dem Service-Client, die `user.id` kommt ausschliesslich
 * aus der geprüften Sitzung. So hängt der Schalter nicht an den
 * Zeilen-Policies von `profiles`, die gerade gehärtet werden.
 *
 * Was der Schalter abstellt: Direktnachrichten des Bots (Zahlungshinweise,
 * Antworten aus der Fallakte, Angebote). Was er **nicht** abstellt: die Mail —
 * sie ist der verlässliche Weg und geht immer —, und die Rollen auf dem
 * Server samt Warteraum.
 */
async function nutzer() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function GET() {
  const user = await nutzer();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { data, error } = await createServiceClient()
    .from("profiles")
    .select("discord_dm_widerspruch")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    // 42703: Migration 081 fehlt — dann gibt es den Schalter noch nicht.
    return NextResponse.json({ ok: false, error: "nicht_verfuegbar" }, { status: 503 });
  }
  return NextResponse.json({
    ok: true,
    widerspruch: Boolean((data as { discord_dm_widerspruch: boolean | null } | null)?.discord_dm_widerspruch),
  });
}

export async function PUT(request: Request) {
  const user = await nutzer();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { widerspruch?: unknown };
  if (typeof body.widerspruch !== "boolean") {
    return NextResponse.json({ ok: false, error: "widerspruch muss true oder false sein" }, { status: 400 });
  }

  const { error } = await createServiceClient()
    .from("profiles")
    .update({ discord_dm_widerspruch: body.widerspruch })
    .eq("id", user.id)
    .select("id")
    .single();
  if (error) return NextResponse.json({ ok: false, error: "nicht_gespeichert" }, { status: 500 });
  return NextResponse.json({ ok: true, widerspruch: body.widerspruch });
}
