import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type Outcome = "pending" | "closed_won" | "closed_lost" | "no_show";
type BudgetTier = "under_2000" | "over_2000";

const OUTCOMES: Outcome[] = ["pending", "closed_won", "closed_lost", "no_show"];
const BUDGETS: BudgetTier[] = ["under_2000", "over_2000"];

/**
 * GET /api/admin/ht-applications?budget=all|under_2000|over_2000&outcome=all|pending|closed_won|closed_lost|no_show
 *
 * Sortierung: `over_2000` immer zuerst (Priority), danach nach created_at desc.
 * Liefert zusätzlich Counter über alle Bewerbungen.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const budgetFilter = url.searchParams.get("budget") ?? "all";
  const outcomeFilter = url.searchParams.get("outcome") ?? "all";

  const service = createServiceClient();

  let query = service
    .from("high_ticket_applications")
    .select(
      "id,user_id,email,name,whatsapp_number,answers,budget_tier,outcome,internal_notes,contacted_at,call_scheduled_at,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (budgetFilter !== "all") {
    if (!BUDGETS.includes(budgetFilter as BudgetTier)) {
      return NextResponse.json(
        { ok: false, error: "Invalid budget filter." },
        { status: 400 },
      );
    }
    query = query.eq("budget_tier", budgetFilter);
  }

  if (outcomeFilter !== "all") {
    if (!OUTCOMES.includes(outcomeFilter as Outcome)) {
      return NextResponse.json(
        { ok: false, error: "Invalid outcome filter." },
        { status: 400 },
      );
    }
    query = query.eq("outcome", outcomeFilter);
  }

  const { data, error: listErr } = await query;
  if (listErr) {
    return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
  }

  // Counter über alle Bewerbungen (unabhängig vom Filter, für Tab-Badges).
  const { data: countRows } = await service
    .from("high_ticket_applications")
    .select("budget_tier,outcome");

  const counters = {
    all: 0,
    over_2000: 0,
    under_2000: 0,
    pending: 0,
    closed_won: 0,
    closed_lost: 0,
    no_show: 0,
  };
  for (const row of (countRows ?? []) as Array<{
    budget_tier: BudgetTier;
    outcome: Outcome | null;
  }>) {
    counters.all += 1;
    if (row.budget_tier === "over_2000") counters.over_2000 += 1;
    else if (row.budget_tier === "under_2000") counters.under_2000 += 1;

    const o = row.outcome ?? "pending";
    if (o === "pending") counters.pending += 1;
    else if (o === "closed_won") counters.closed_won += 1;
    else if (o === "closed_lost") counters.closed_lost += 1;
    else if (o === "no_show") counters.no_show += 1;
  }

  const items = ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => ({
      id: row.id as string,
      userId: (row.user_id as string | null) ?? null,
      email: (row.email as string) ?? "",
      name: (row.name as string | null) ?? null,
      whatsappNumber: (row.whatsapp_number as string | null) ?? null,
      answers: (row.answers as Record<string, string>) ?? {},
      budgetTier: (row.budget_tier as BudgetTier) ?? "under_2000",
      outcome: ((row.outcome as Outcome | null) ?? "pending") as Outcome,
      internalNotes: (row.internal_notes as string | null) ?? null,
      contactedAt: (row.contacted_at as string | null) ?? null,
      callScheduledAt: (row.call_scheduled_at as string | null) ?? null,
      createdAt: (row.created_at as string) ?? "",
    }))
    // over_2000 priorisieren — secondary sort = created_at desc bleibt aus DB-Order
    .sort((a, b) => {
      if (a.budgetTier === b.budgetTier) return 0;
      if (a.budgetTier === "over_2000") return -1;
      return 1;
    });

  return NextResponse.json({ ok: true, items, counters });
}
