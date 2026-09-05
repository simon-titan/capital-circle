import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type CertificateRow = {
  id: string;
  user_id: string;
  storage_key: string;
  caption: string | null;
  status: "pending" | "approved" | "rejected";
  is_public: boolean;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

type ProfileRow = { id: string; full_name: string | null; username: string | null };

/** GET /api/admin/certificates — alle Einreichungen, pending zuerst. */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("certificates")
    .select("id, user_id, storage_key, caption, status, is_public, submitted_at, reviewed_at, reviewed_by")
    .order("submitted_at", { ascending: false });

  if (dbErr) {
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }

  const rows = (data ?? []) as CertificateRow[];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));

  let profileMap = new Map<string, ProfileRow>();
  if (userIds.length > 0) {
    const { data: profileRows } = await service
      .from("profiles")
      .select("id, full_name, username")
      .in("id", userIds);
    profileMap = new Map((profileRows as ProfileRow[] | null ?? []).map((p) => [p.id, p]));
  }

  // Stabiler Sort: pending-Gruppe zuerst, sonst Reihenfolge (submitted_at desc) beibehalten.
  const items = rows
    .slice()
    .sort((a, b) => (a.status === "pending" ? -1 : 0) - (b.status === "pending" ? -1 : 0))
    .map((row) => {
      const profile = profileMap.get(row.user_id);
      return {
        id: row.id,
        userId: row.user_id,
        memberName: profile?.full_name || profile?.username || "Unbekanntes Mitglied",
        storageKey: row.storage_key,
        caption: row.caption,
        status: row.status,
        isPublic: row.is_public,
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at,
      };
    });

  return NextResponse.json({ ok: true, items });
}
