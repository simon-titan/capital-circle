import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { bewerbungAblehnen, bewerbungAnnehmen } from "@/lib/training/bewerbung";

export const runtime = "nodejs";

/**
 * POST /api/admin/training/bewerbungen/[id] — Emres Entscheidung.
 * Body `{ aktion: "annehmen" | "ablehnen", notiz? }`.
 *
 * Annehmen schaltet 30 Tage frei und schickt A02, Ablehnen schickt A03 und ist
 * endgültig. Ein zweiter Klick ändert nichts (`schon_entschieden`).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin();
  if (error || !user) return error;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { aktion?: string; notiz?: unknown };
  const service = createServiceClient();

  if (body.aktion === "annehmen") {
    const r = await bewerbungAnnehmen(service, id, user.id);
    return NextResponse.json(r.ok ? { ok: true, endeAm: r.endeAm } : { ok: false, error: r.fehler }, { status: r.ok ? 200 : 409 });
  }
  if (body.aktion === "ablehnen") {
    const notiz = typeof body.notiz === "string" ? body.notiz.trim() || null : null;
    const r = await bewerbungAblehnen(service, id, user.id, notiz);
    return NextResponse.json(r.ok ? { ok: true } : { ok: false, error: r.fehler }, { status: r.ok ? 200 : 409 });
  }
  return NextResponse.json({ ok: false, error: "aktion" }, { status: 400 });
}
