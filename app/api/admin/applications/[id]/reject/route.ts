import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { sendApplicationRejected } from "@/lib/email/templates";

export const runtime = "nodejs";

/**
 * POST /api/admin/applications/[id]/reject
 *
 * Body: { reason?: string }   // intern, NICHT im Email-Body
 *
 * Optimistic-Lock auf `status='pending'`. Email ist neutral
 * (Template `application-rejected` enthält keinen Grund).
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { error: adminErr, user } = await requireAdmin();
  if (adminErr) return adminErr;
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing application id." }, { status: 400 });
  }

  let reason: string | null = null;
  try {
    const body = (await request.json().catch(() => null)) as { reason?: unknown } | null;
    if (body && typeof body.reason === "string") {
      const trimmed = body.reason.trim();
      reason = trimmed.length > 0 ? trimmed.slice(0, 1000) : null;
    }
  } catch {
    reason = null;
  }

  const service = createServiceClient();

  const { data: updated, error: updateErr } = await service
    .from("applications")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      rejection_reason: reason,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id,user_id,email,name")
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
      .update({ application_status: "rejected" })
      .eq("id", updated.user_id);
    if (profileErr) {
      console.error("[admin/applications/reject] profile sync failed:", profileErr);
    }
  }

  void (async () => {
    try {
      const firstName = firstNameFrom(updated.name as string | null, updated.email as string);
      await sendApplicationRejected({
        firstName,
        email: updated.email as string,
        userId: (updated.user_id as string) ?? "",
        applicationId: updated.id as string,
      });
    } catch (err) {
      console.error("[admin/applications/reject] rejection mail failed:", err);
    }
  })();

  return NextResponse.json({ ok: true });
}

function firstNameFrom(fullName: string | null, email: string): string {
  const fromName = fullName?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const local = email.split("@")[0] ?? "";
  return local.charAt(0).toUpperCase() + local.slice(1) || "Hallo";
}
