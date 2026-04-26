import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * GET /api/admin/step2-applications?status=pending|approved|rejected|all
 *
 * Liefert Step-2-Bewerbungen + Profil-Daten (Name, E-Mail) + Reviewer-Name.
 * Antworten liegen als JSONB in `answers` — die UI löst sie über STEP2_QUESTIONS auf.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "pending";

  const service = createServiceClient();

  let query = service
    .from("step2_applications")
    .select(
      "id,user_id,answers,status,reviewed_at,reviewed_by,rejection_reason,created_at,calendly_booked_at,calendly_event_uri",
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

  const rows = (data ?? []) as Array<Record<string, unknown>>;

  const userIds = Array.from(
    new Set(rows.map((r) => r.user_id as string).filter(Boolean)),
  );

  let profileMap = new Map<string, { name: string | null; email: string }>();
  if (userIds.length > 0) {
    const { data: profiles } = await service
      .from("profiles")
      .select("id,full_name,username,email")
      .in("id", userIds);
    profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.id as string,
        {
          name: ((p.full_name as string | null) || (p.username as string | null)) ?? null,
          email: (p.email as string) ?? "",
        },
      ]),
    );
  }

  const reviewerIds = Array.from(
    new Set(
      rows
        .map((r) => r.reviewed_by as string | null)
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

  const { data: counts } = await service
    .from("step2_applications")
    .select("status", { count: "exact", head: false });

  const counters = { pending: 0, approved: 0, rejected: 0, all: 0 };
  for (const row of (counts ?? []) as Array<{ status: string }>) {
    counters.all += 1;
    if (row.status === "pending") counters.pending += 1;
    else if (row.status === "approved") counters.approved += 1;
    else if (row.status === "rejected") counters.rejected += 1;
  }

  const items = rows.map((row) => {
    const prof = profileMap.get(row.user_id as string);
    return {
      id: row.id as string,
      userId: (row.user_id as string | null) ?? null,
      email: prof?.email ?? "",
      name: prof?.name ?? null,
      answers: (row.answers ?? {}) as Record<string, string>,
      status: (row.status as "pending" | "approved" | "rejected") ?? "pending",
      reviewedAt: (row.reviewed_at as string | null) ?? null,
      reviewedBy: (row.reviewed_by as string | null) ?? null,
      reviewedByName: row.reviewed_by ? reviewerMap.get(row.reviewed_by as string) ?? null : null,
      rejectionReason: (row.rejection_reason as string | null) ?? null,
      createdAt: (row.created_at as string) ?? "",
      calendlyBookedAt: (row.calendly_booked_at as string | null) ?? null,
      calendlyEventUri: (row.calendly_event_uri as string | null) ?? null,
    };
  });

  return NextResponse.json({ ok: true, items, counters });
}
