import { NextResponse } from "next/server";
import { ADMIN_ROLES, requireAdminRole, type AdminRole } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PostBody {
  email?: string;
  adminRole?: AdminRole;
}

/** GET /api/admin/team — Liste aller is_admin=true-Profile mit Rolle. */
export async function GET() {
  const { error } = await requireAdminRole("owner");
  if (error) return error;

  const service = createServiceClient();

  const [{ data: authUsers, error: listErr }, { data: profiles, error: profilesErr }] = await Promise.all([
    service.auth.admin.listUsers({ perPage: 1000 }),
    service
      .from("profiles")
      .select("id, full_name, username, admin_role, created_at")
      .eq("is_admin", true),
  ]);

  if (listErr) {
    return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
  }
  if (profilesErr) {
    return NextResponse.json({ ok: false, error: profilesErr.message }, { status: 500 });
  }

  const authMap = new Map((authUsers.users ?? []).map((u) => [u.id, u.email ?? ""]));

  const admins = (profiles ?? []).map((p) => ({
    id: p.id as string,
    email: authMap.get(p.id as string) ?? "",
    fullName: (p.full_name as string | null) ?? null,
    username: (p.username as string | null) ?? null,
    adminRole: (p.admin_role as AdminRole | null) ?? null,
    createdAt: p.created_at as string,
  }));

  return NextResponse.json({ ok: true, admins });
}

/** POST /api/admin/team — bestehenden Nutzer per E-Mail zum Admin machen + Rolle vergeben. */
export async function POST(request: Request) {
  const { error, user: actingAdmin } = await requireAdminRole("owner");
  if (error) return error;
  if (!actingAdmin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const role = body.adminRole;

  if (!email) {
    return NextResponse.json({ ok: false, error: "E-Mail-Adresse ist erforderlich." }, { status: 400 });
  }
  if (!role || !ADMIN_ROLES.includes(role)) {
    return NextResponse.json(
      { ok: false, error: `adminRole muss einer von: ${ADMIN_ROLES.join(", ")}` },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  const { data: list, error: listErr } = await service.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
  }

  const match = (list.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email);
  if (!match) {
    return NextResponse.json(
      { ok: false, error: "Kein Nutzer mit dieser E-Mail gefunden. Nutzer muss zuerst existieren (z.B. über die Mitglieder-Seite anlegen)." },
      { status: 404 },
    );
  }

  const { data: oldProfile } = await service
    .from("profiles")
    .select("is_admin, admin_role")
    .eq("id", match.id)
    .maybeSingle();

  const { error: updErr } = await service
    .from("profiles")
    .update({ is_admin: true, admin_role: role })
    .eq("id", match.id);

  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }

  const { error: auditErr } = await service.from("user_audit_log").insert({
    target_user_id: match.id,
    admin_user_id: actingAdmin.id,
    action: "admin_added",
    field: "admin_role",
    old_value: (oldProfile?.admin_role as string | null) ?? null,
    new_value: role,
    metadata: { email, was_admin: (oldProfile?.is_admin as boolean | null) ?? false },
  });

  if (auditErr) {
    console.error("[admin/team] audit-log insert failed:", auditErr.message);
  }

  return NextResponse.json({
    ok: true,
    admin: { id: match.id, email: match.email ?? email, adminRole: role },
  });
}
