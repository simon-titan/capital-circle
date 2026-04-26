import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * POST /api/admin/step2-applications/[id]/approve
 *
 * Optimistic-Lock via `WHERE status='pending'`.
 * Synchronisiert `step2_applications.status` + `profiles.step2_application_status`.
 */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { error: adminErr, user } = await requireAdmin();
  if (adminErr) return adminErr;
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing application id." }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: updated, error: updateErr } = await service
    .from("step2_applications")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id,user_id")
    .maybeSingle();

  if (updateErr) {
    return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Bewerbung nicht gefunden oder bereits bearbeitet." },
      { status: 409 },
    );
  }

  if (updated.user_id) {
    const { error: profileErr } = await service
      .from("profiles")
      .update({ step2_application_status: "approved" })
      .eq("id", updated.user_id as string);
    if (profileErr) {
      console.error("[admin/step2-applications/approve] profile sync failed:", profileErr);
    }
  }

  return NextResponse.json({ ok: true });
}
