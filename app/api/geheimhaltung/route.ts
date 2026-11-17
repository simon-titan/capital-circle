import { NextResponse, type NextRequest } from "next/server";
import { GEHEIMHALTUNG_FASSUNG } from "@/config/geheimhaltung";
import { brauchtGeheimhaltung } from "@/lib/geheimhaltung";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Geheimhaltungsvereinbarung (Migration 116, `config/geheimhaltung.ts`).
 *
 * GET  → `{ zeigen, name }`: ob das Popup jetzt sperrt; `name` füllt das Feld vor.
 * POST → `{ name, zustimmung: true }` speichert die Zustimmung zur aktuellen
 *        Fassung mit Name, Zeitpunkt, IP und Browser. Doppelt ist kein Fehler.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ zeigen: false }, { status: 401 });
  const service = createServiceClient();
  try {
    const zeigen = await brauchtGeheimhaltung(service, auth.user.id);
    if (!zeigen) return NextResponse.json({ zeigen: false });
    const { data } = await service.from("profiles").select("full_name").eq("id", auth.user.id).maybeSingle();
    return NextResponse.json({ zeigen: true, name: (data as { full_name?: string | null } | null)?.full_name ?? "" });
  } catch {
    return NextResponse.json({ zeigen: false });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { name?: unknown; zustimmung?: unknown };
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (body.zustimmung !== true) return NextResponse.json({ ok: false, error: "zustimmung_fehlt" }, { status: 400 });
  if (name.length < 3 || name.length > 120 || !name.includes(" ")) {
    return NextResponse.json({ ok: false, error: "name_ungueltig" }, { status: 400 });
  }

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
  const { error } = await createServiceClient()
    .from("geheimhaltung_zustimmung")
    .insert({
      user_id: auth.user.id,
      fassung: GEHEIMHALTUNG_FASSUNG,
      name,
      email: auth.user.email ?? "",
      ip,
      user_agent: request.headers.get("user-agent")?.slice(0, 400) ?? null,
    });
  if (error && error.code !== "23505") {
    console.error("[geheimhaltung] Zustimmung nicht gespeichert:", error.message);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
