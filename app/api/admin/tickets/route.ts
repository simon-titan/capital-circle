import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * GET /api/admin/tickets — alle Tickets + Absender-Infos + Ø-Antwortzeit (30 Tage).
 *
 * Filter nach Status/Priorität passieren client-seitig in AdminTicketsManager,
 * damit die KPI-Kachel (Ø Antwortzeit) immer auf der vollständigen Basis rechnet.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const service = createServiceClient();

  const { data: tickets, error: ticketsErr } = await service
    .from("support_tickets")
    .select(
      "id,user_id,subject,category,status,priority,created_at,first_response_at,resolved_at,updated_at,contact_email,contact_name,quelle",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (ticketsErr) {
    return NextResponse.json({ ok: false, error: ticketsErr.message }, { status: 500 });
  }

  const rows = tickets ?? [];

  const userIds = Array.from(new Set(rows.map((t) => t.user_id as string).filter(Boolean)));
  let userMap = new Map<string, { email: string; name: string | null }>();
  if (userIds.length > 0) {
    const [{ data: profiles }, { data: authUsers }] = await Promise.all([
      service.from("profiles").select("id,full_name,username").in("id", userIds),
      service.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));
    const authMap = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    userMap = new Map(
      userIds.map((id) => {
        const p = profileMap.get(id);
        const name = (p?.full_name as string | null) || (p?.username as string | null) || null;
        return [id, { email: authMap.get(id) ?? "", name }];
      }),
    );
  }

  const items = rows.map((t) => {
    const u = t.user_id ? userMap.get(t.user_id as string) : undefined;
    return {
      id: t.id as string,
      subject: t.subject as string,
      category: (t.category as string | null) ?? null,
      status: t.status as string,
      priority: t.priority as string,
      createdAt: t.created_at as string,
      firstResponseAt: (t.first_response_at as string | null) ?? null,
      resolvedAt: (t.resolved_at as string | null) ?? null,
      updatedAt: t.updated_at as string,
      userId: (t.user_id as string | null) ?? null,
      // Tickets aus dem Kontaktformular tragen den Absender selbst (Migration 102).
      userEmail: u?.email ?? (t.contact_email as string | null) ?? "",
      userName: u?.name ?? (t.contact_name as string | null) ?? null,
      ohneKonto: !t.user_id,
    };
  });

  // Ø Antwortzeit letzte 30 Tage: nur Tickets, die in diesem Zeitraum ERSTELLT wurden
  // und bereits eine erste Admin-Antwort haben.
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const respondedRecent = rows.filter((t) => {
    if (!t.first_response_at) return false;
    return new Date(t.created_at as string).getTime() >= thirtyDaysAgo;
  });
  const avgResponseMs =
    respondedRecent.length > 0
      ? respondedRecent.reduce((sum, t) => {
          const created = new Date(t.created_at as string).getTime();
          const responded = new Date(t.first_response_at as string).getTime();
          return sum + Math.max(0, responded - created);
        }, 0) / respondedRecent.length
      : null;

  return NextResponse.json({
    ok: true,
    tickets: items,
    stats: {
      avgResponseMs,
      respondedCount30d: respondedRecent.length,
      openCount: rows.filter((t) => t.status === "open").length,
      totalCount: rows.length,
    },
  });
}
