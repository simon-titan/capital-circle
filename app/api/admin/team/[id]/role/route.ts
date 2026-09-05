import { NextResponse } from "next/server";
import { ADMIN_ROLES, requireAdminRole, type AdminRole } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatchBody {
  adminRole?: AdminRole;
  remove?: boolean;
}

/**
 * PATCH /api/admin/team/[id]/role
 *
 * Ändert die Admin-Rolle eines Nutzers, oder entfernt ihn (remove: true → is_admin=false,
 * admin_role=null). Jede Änderung schreibt eine Zeile in user_audit_log.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error, user: actingAdmin } = await requireAdminRole("owner");
  if (error) return error;
  if (!actingAdmin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id: targetId } = await ctx.params;
  if (!targetId) {
    return NextResponse.json({ ok: false, error: "Missing user id." }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: oldProfile, error: readErr } = await service
    .from("profiles")
    .select("is_admin, admin_role")
    .eq("id", targetId)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ ok: false, error: readErr.message }, { status: 500 });
  }
  if (!oldProfile) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  if (body.remove) {
    const { error: updErr } = await service
      .from("profiles")
      .update({ is_admin: false, admin_role: null })
      .eq("id", targetId);

    if (updErr) {
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
    }

    const { error: auditErr } = await service.from("user_audit_log").insert({
      target_user_id: targetId,
      admin_user_id: actingAdmin.id,
      action: "admin_removed",
      field: "admin_role",
      old_value: (oldProfile.admin_role as string | null) ?? null,
      new_value: null,
    });
    if (auditErr) {
      console.error("[admin/team/role] audit-log insert failed:", auditErr.message);
    }

    return NextResponse.json({ ok: true });
  }

  const role = body.adminRole;
  if (!role || !ADMIN_ROLES.includes(role)) {
    return NextResponse.json(
      { ok: false, error: `adminRole muss einer von: ${ADMIN_ROLES.join(", ")}` },
      { status: 400 },
    );
  }

  const { error: updErr } = await service.from("profiles").update({ admin_role: role }).eq("id", targetId);
  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }

  const { error: auditErr } = await service.from("user_audit_log").insert({
    target_user_id: targetId,
    admin_user_id: actingAdmin.id,
    action: "admin_role_changed",
    field: "admin_role",
    old_value: (oldProfile.admin_role as string | null) ?? null,
    new_value: role,
  });
  if (auditErr) {
    console.error("[admin/team/role] audit-log insert failed:", auditErr.message);
  }

  return NextResponse.json({ ok: true, adminRole: role });
}
