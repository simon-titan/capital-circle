import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * GET /api/admin/applications?status=pending|approved|rejected|all
 *
 * Liefert Bewerbungen + Reviewer-Name (für Approved/Rejected-Badges).
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "pending";

  const service = createServiceClient();
  let query = service
    .from("applications")
    .select(
      "id,user_id,email,name,experience,biggest_problem,goal_6_months,status,reviewed_at,reviewed_by,rejection_reason,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (status !== "all") {
    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ ok: false, error: "Invalid status filter." }, { status: 400 });
    }
    query = query.eq("status", status);
  }

  const { data, error: listErr } = await query;
  if (listErr) {
    return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
  }

  const reviewerIds = Array.from(
    new Set(
      ((data ?? []) as Array<{ reviewed_by: string | null }>)
        .map((r) => r.reviewed_by)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  let reviewerMap = new Map<string, string>();
  if (reviewerIds.length > 0) {
    const { data: reviewers } = await service
      .from("profiles")
      .select("id,full_name,username")
      .in("id", reviewerIds);
    reviewerMap = new Map(
      (reviewers ?? []).map((r) => [
        r.id as string,
        ((r.full_name as string | null) || (r.username as string | null) || "Admin") as string,
      ]),
    );
  }

  // Counter über alle Status für Tabs
  const { data: counts } = await service
    .from("applications")
    .select("status", { count: "exact", head: false });

  const counters = { pending: 0, approved: 0, rejected: 0, all: 0 };
  for (const row of (counts ?? []) as Array<{ status: string }>) {
    counters.all += 1;
    if (row.status === "pending") counters.pending += 1;
    else if (row.status === "approved") counters.approved += 1;
    else if (row.status === "rejected") counters.rejected += 1;
  }

  const items = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    userId: (row.user_id as string | null) ?? null,
    email: (row.email as string) ?? "",
    name: (row.name as string | null) ?? null,
    experience: (row.experience as string) ?? "",
    biggestProblem: (row.biggest_problem as string) ?? "",
    goal6Months: (row.goal_6_months as string) ?? "",
    status: (row.status as "pending" | "approved" | "rejected") ?? "pending",
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    reviewedBy: (row.reviewed_by as string | null) ?? null,
    reviewedByName: row.reviewed_by ? reviewerMap.get(row.reviewed_by as string) ?? null : null,
    rejectionReason: (row.rejection_reason as string | null) ?? null,
    createdAt: (row.created_at as string) ?? "",
  }));

  return NextResponse.json({ ok: true, items, counters });
}
