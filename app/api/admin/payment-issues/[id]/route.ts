import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/payment-issues/[id]
 * Speichert eine manuelle Admin-Notiz (z. B. "kontaktiert am ...") auf profiles.dunning_admin_note.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { dunning_admin_note?: string | null } | null;
  if (!body || (typeof body.dunning_admin_note !== "string" && body.dunning_admin_note !== null)) {
    return NextResponse.json({ ok: false, error: "dunning_admin_note_required" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("profiles")
    .update({ dunning_admin_note: body.dunning_admin_note?.trim() || null })
    .eq("id", id)
    .select("id,dunning_admin_note")
    .single();

  if (dbErr) {
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}
