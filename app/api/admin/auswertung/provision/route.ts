import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * POST /api/admin/auswertung/provision — Provision freigeben oder als
 * ausgezahlt markieren (Tracking-Playbook 10.4).
 *
 *   { ids: string[], aktion: "freigeben" }              accrued → approved
 *   { ids: string[], aktion: "ausgezahlt", ref?: str }   approved → paid (Datum, Bearbeiter, Referenz)
 *
 * Nur Statusübergänge vorwärts; Beträge werden nie geändert (Korrekturen sind
 * eigene, negative Einträge aus Erstattung/Chargeback).
 */
export async function POST(request: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json().catch(() => null)) as { ids?: unknown; aktion?: unknown; ref?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x): x is string => typeof x === "string").slice(0, 500) : [];
  if (!ids.length) return NextResponse.json({ ok: false, error: "ids" }, { status: 400 });
  const jetzt = new Date().toISOString();
  const db = createServiceClient();

  if (body?.aktion === "freigeben") {
    const { data, error: e } = await db
      .from("provision")
      .update({ status: "approved", freigegeben_am: jetzt, freigegeben_von: user!.id })
      .in("id", ids)
      .eq("status", "accrued")
      .select("id");
    if (e) return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    return NextResponse.json({ ok: true, geaendert: (data ?? []).length });
  }
  if (body?.aktion === "ausgezahlt") {
    const ref = typeof body.ref === "string" ? body.ref.trim().slice(0, 200) || null : null;
    const { data, error: e } = await db
      .from("provision")
      .update({ status: "paid", ausgezahlt_am: jetzt, ausgezahlt_von: user!.id, auszahlung_ref: ref })
      .in("id", ids)
      .eq("status", "approved")
      .select("id");
    if (e) return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    return NextResponse.json({ ok: true, geaendert: (data ?? []).length });
  }
  return NextResponse.json({ ok: false, error: "aktion" }, { status: 400 });
}
