import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { buildCsvResponse, toCsvRow } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/users/export — CSV-Export der aktuellen Mitgliederliste. */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const service = createServiceClient();

  const [{ data: authUsers, error: listErr }, { data: profiles, error: profilesErr }] = await Promise.all([
    service.auth.admin.listUsers({ perPage: 1000 }),
    service
      .from("profiles")
      .select("id, full_name, username, is_paid, membership_tier, access_until, created_at"),
  ]);

  if (listErr) {
    return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
  }
  if (profilesErr) {
    return NextResponse.json({ ok: false, error: profilesErr.message }, { status: 500 });
  }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  const header = ["id", "name", "email", "membership_tier", "is_paid", "created_at", "access_until"];
  const rows: string[] = [toCsvRow(header)];

  for (const u of authUsers.users ?? []) {
    const p = profileMap.get(u.id);
    rows.push(
      toCsvRow([
        u.id,
        (p?.full_name as string | null) ?? (p?.username as string | null) ?? "",
        u.email ?? "",
        (p?.membership_tier as string | null) ?? "free",
        p?.is_paid ? "true" : "false",
        u.created_at,
        (p?.access_until as string | null) ?? "",
      ]),
    );
  }

  const date = new Date().toISOString().slice(0, 10);
  return buildCsvResponse(rows, `capitalcircle_mitglieder_${date}.csv`);
}
