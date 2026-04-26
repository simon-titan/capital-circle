import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AuditRow {
  id: string;
  target_user_id: string | null;
  admin_user_id: string | null;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: unknown;
  created_at: string;
}

/**
 * GET /api/admin/users/[id]/audit-log
 *
 * Liefert die letzten Audit-Log-Einträge für einen User. Default-Limit: 50.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id: targetUserId } = await ctx.params;
  if (!targetUserId) {
    return NextResponse.json(
      { ok: false, error: "Missing user id." },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
    200,
  );

  const supabase = createServiceClient();

  const { data, error: queryErr } = await supabase
    .from("user_audit_log")
    .select(
      "id,target_user_id,admin_user_id,action,field,old_value,new_value,metadata,created_at",
    )
    .eq("target_user_id", targetUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (queryErr) {
    return NextResponse.json(
      { ok: false, error: queryErr.message },
      { status: 500 },
    );
  }

  const rows = (data as AuditRow[] | null) ?? [];

  // Admin-Namen anreichern
  const adminIds = Array.from(
    new Set(rows.map((r) => r.admin_user_id).filter(Boolean) as string[]),
  );

  let adminNames: Record<string, string> = {};
  if (adminIds.length > 0) {
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id,full_name,username")
      .in("id", adminIds);
    adminNames = Object.fromEntries(
      (
        (adminProfiles as
          | { id: string; full_name: string | null; username: string | null }[]
          | null) ?? []
      ).map((p) => [p.id, p.full_name ?? p.username ?? p.id.slice(0, 8)]),
    );
  }

  return NextResponse.json({
    ok: true,
    items: rows.map((r) => ({
      id: r.id,
      action: r.action,
      field: r.field,
      oldValue: r.old_value,
      newValue: r.new_value,
      metadata: r.metadata,
      createdAt: r.created_at,
      adminId: r.admin_user_id,
      adminName: r.admin_user_id ? adminNames[r.admin_user_id] ?? null : null,
    })),
  });
}
