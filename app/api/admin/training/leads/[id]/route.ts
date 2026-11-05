import { NextResponse } from "next/server";
import { LEAD_STATUS } from "@/config/training";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/training/leads/[id] — Pipeline-Felder eines Leads ändern.
 * Body (alles optional): `{ status, closer, produkt, revenue_cents, notizen }`.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.status !== undefined) {
    if (!(LEAD_STATUS as readonly string[]).includes(String(body.status))) {
      return NextResponse.json({ ok: false, error: "status" }, { status: 400 });
    }
    update.status = body.status;
    if (body.status === "gewonnen") update.gewonnen_am = new Date().toISOString();
  }
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) || null : null);
  if (body.closer !== undefined) update.closer = text(body.closer, 60);
  if (body.produkt !== undefined) update.produkt = text(body.produkt, 120);
  if (body.notizen !== undefined) update.notizen = text(body.notizen, 4000);
  if (body.revenue_cents !== undefined) {
    const n = Number(body.revenue_cents);
    update.revenue_cents = Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  }

  const { data, error: dbErr } = await createServiceClient()
    .from("training_leads")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (dbErr) return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "nicht_gefunden" }, { status: 404 });
  return NextResponse.json({ ok: true, lead: data });
}
