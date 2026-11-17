import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { zugangVerlaengern } from "@/lib/training/bewerbung";
import { kontaktPauseAufheben, kontaktPauseSetzen } from "@/lib/mailsystem/pause";

export const runtime = "nodejs";

/**
 * POST /api/admin/training/zugang/[userId] — Handlungen des Teams am Konto:
 *   `{ aktion: "verlaengern" }`                       einmalig +7 Tage, E03
 *   `{ aktion: "pause_setzen", grund }`               persönliche Kontaktpause
 *   `{ aktion: "pause_aufheben", naechsterSchritt }`  Pause beenden (Pflichtangabe)
 */
export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { user, error } = await requireAdmin();
  if (error || !user) return error;
  const { userId } = await params;
  const body = (await request.json().catch(() => ({}))) as { aktion?: string; grund?: unknown; naechsterSchritt?: unknown };
  const service = createServiceClient();
  const text = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 500) : "");

  if (body.aktion === "verlaengern") {
    const r = await zugangVerlaengern(service, userId, user.id);
    return NextResponse.json(r.ok ? { ok: true, endeAm: r.endeAm } : { ok: false, error: r.fehler }, { status: r.ok ? 200 : 409 });
  }

  const { data: auth } = await service.auth.admin.getUserById(userId);
  const email = auth?.user?.email;
  if (!email) return NextResponse.json({ ok: false, error: "kein_konto" }, { status: 404 });

  if (body.aktion === "pause_setzen") {
    const grund = text(body.grund);
    if (grund.length < 3) return NextResponse.json({ ok: false, error: "grund" }, { status: 400 });
    await kontaktPauseSetzen(service, { email, userId, grund, von: user.id });
    return NextResponse.json({ ok: true });
  }
  if (body.aktion === "pause_aufheben") {
    const naechsterSchritt = text(body.naechsterSchritt);
    if (naechsterSchritt.length < 3) return NextResponse.json({ ok: false, error: "naechster_schritt" }, { status: 400 });
    await kontaktPauseAufheben(service, { email, naechsterSchritt, von: user.id });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "aktion" }, { status: 400 });
}
