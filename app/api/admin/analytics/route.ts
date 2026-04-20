import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Capital Circle Monthly = 97 € (siehe Master-Prompt §6).
 * Falls dieser Preis sich ändert, hier UND in Stripe synchron halten.
 */
const MONTHLY_PRICE_EUR = 97;

const DAY_MS = 24 * 60 * 60 * 1000;

interface PaymentRow {
  id: string;
  user_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
}

interface CancellationRow {
  id: string;
  user_id: string | null;
  reason: string | null;
  structured_reason: string | null;
  feedback: string | null;
  canceled_at: string;
}

interface ApplicationStatusRow {
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  user_id: string | null;
}

interface ProfileFunnelRow {
  id: string;
  created_at: string;
  is_paid: boolean;
  membership_tier: "free" | "monthly" | "lifetime" | "ht_1on1" | null;
}

interface EmailLogRow {
  sequence: string;
  step: number;
  opened_at: string | null;
  clicked_at: string | null;
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const supabase = createServiceClient();
  const since30 = isoDaysAgo(30);
  const since60 = isoDaysAgo(60);
  const since7 = isoDaysAgo(7);

  // ── MRR & Lifetime-Revenue ────────────────────────────────────────────────
  // Monthly active = profiles with membership_tier='monthly' AND is_paid=true
  // Lifetime active = profiles with membership_tier='lifetime' (für Info)
  // Revenue 30d = SUM(payments.amount_cents) WHERE status='succeeded' & created_at > now()-30d

  const [
    monthlyActiveRes,
    lifetimeActiveRes,
    revenue30dRes,
    canceled30dRes,
    activeAtStartRes,
    paymentsRes,
    cancellationsRes,
    emailLogRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("membership_tier", "monthly")
      .eq("is_paid", true),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("membership_tier", "lifetime"),
    supabase
      .from("payments")
      .select("amount_cents,status,created_at")
      .eq("status", "succeeded")
      .gte("created_at", since30),
    // Churn-Zähler: cancellations.canceled_at in den letzten 30d
    supabase
      .from("cancellations")
      .select("id", { count: "exact", head: true })
      .gte("canceled_at", since30),
    // Aktive User vor dem Zeitfenster — Approximation: Profile mit
    // is_paid=true UND created_at < (now-30d). Genauer wäre eine
    // Subscription-State-History; das reicht für die MVP-Churn-Rate.
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_paid", true)
      .lt("created_at", since30),
    // Payments-Log (letzte 30 Tage, neueste zuerst, max. 100 Zeilen)
    supabase
      .from("payments")
      .select(
        "id,user_id,amount_cents,currency,status,created_at,paid_at,stripe_invoice_id,stripe_payment_intent_id",
      )
      .gte("created_at", since30)
      .order("created_at", { ascending: false })
      .limit(100),
    // Cancellations-Inbox (letzte 30 Antworten)
    supabase
      .from("cancellations")
      .select("id,user_id,reason,structured_reason,feedback,canceled_at")
      .order("canceled_at", { ascending: false })
      .limit(30),
    // Email-Log für Performance-Stats — letzte 60 Tage reichen für Aggregation
    supabase
      .from("email_sequence_log")
      .select("sequence,step,opened_at,clicked_at")
      .gte("sent_at", since60),
  ]);

  // Revenue summieren
  const revenue30dEur =
    ((revenue30dRes.data as { amount_cents: number }[] | null) ?? []).reduce(
      (acc, r) => acc + (r.amount_cents ?? 0),
      0,
    ) / 100;

  const monthlyActive = monthlyActiveRes.count ?? 0;
  const lifetimeActive = lifetimeActiveRes.count ?? 0;
  const mrrFromSubs = monthlyActive * MONTHLY_PRICE_EUR;

  // ── Churn-Rate (canceled 30d / aktiv zu Beginn 30d) ───────────────────────
  const canceled30d = canceled30dRes.count ?? 0;
  const activeAtStart = activeAtStartRes.count ?? 0;
  const churnRate30dPct =
    activeAtStart > 0 ? (canceled30d / activeAtStart) * 100 : 0;

  // ── Funnel (7d und 30d) ───────────────────────────────────────────────────
  const funnel = await buildFunnel(supabase, since7, since30);

  // ── Payments-Log: User-Namen anreichern ───────────────────────────────────
  const payments = (paymentsRes.data as PaymentRow[] | null) ?? [];
  const cancellations =
    (cancellationsRes.data as CancellationRow[] | null) ?? [];

  const userIds = new Set<string>();
  payments.forEach((p) => p.user_id && userIds.add(p.user_id));
  cancellations.forEach((c) => c.user_id && userIds.add(c.user_id));

  let userMap: Record<string, { name: string | null; email: string | null }> = {};
  if (userIds.size > 0) {
    const { data: profilesRaw } = await supabase
      .from("profiles")
      .select("id,full_name,username")
      .in("id", Array.from(userIds));
    const profiles =
      (profilesRaw as
        | { id: string; full_name: string | null; username: string | null }[]
        | null) ?? [];

    // Email aus auth.users
    const { data: authList } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });
    const emailById = new Map(
      (authList?.users ?? []).map((u) => [u.id, u.email ?? null]),
    );

    userMap = Object.fromEntries(
      profiles.map((p) => [
        p.id,
        {
          name: p.full_name ?? p.username ?? null,
          email: emailById.get(p.id) ?? null,
        },
      ]),
    );
  }

  const paymentsLog = payments.map((p) => {
    const u = p.user_id ? userMap[p.user_id] : undefined;
    return {
      id: p.id,
      userName: u?.name ?? null,
      userEmail: u?.email ?? null,
      amountEur: (p.amount_cents ?? 0) / 100,
      currency: p.currency,
      status: p.status,
      type: inferPaymentType(p),
      createdAt: p.created_at,
      paidAt: p.paid_at,
      stripeInvoiceId: p.stripe_invoice_id,
    };
  });

  const cancellationsList = cancellations.map((c) => {
    const u = c.user_id ? userMap[c.user_id] : undefined;
    return {
      id: c.id,
      userName: u?.name ?? null,
      userEmail: u?.email ?? null,
      structuredReason: c.structured_reason,
      reason: c.reason,
      feedback: c.feedback,
      canceledAt: c.canceled_at,
    };
  });

  // ── Email-Performance (Aggregation pro Sequence/Step) ─────────────────────
  const emailLogs = (emailLogRes.data as EmailLogRow[] | null) ?? [];
  const emailAgg = new Map<
    string,
    { sequence: string; step: number; sent: number; opened: number; clicked: number }
  >();
  for (const row of emailLogs) {
    const key = `${row.sequence}::${row.step}`;
    const cur =
      emailAgg.get(key) ??
      { sequence: row.sequence, step: row.step, sent: 0, opened: 0, clicked: 0 };
    cur.sent += 1;
    if (row.opened_at) cur.opened += 1;
    if (row.clicked_at) cur.clicked += 1;
    emailAgg.set(key, cur);
  }
  const emailPerformance = Array.from(emailAgg.values())
    .sort((a, b) => (a.sequence === b.sequence ? a.step - b.step : a.sequence.localeCompare(b.sequence)))
    .map((e) => ({
      sequence: e.sequence,
      step: e.step,
      sent: e.sent,
      opened: e.opened,
      clicked: e.clicked,
      openRatePct: e.sent > 0 ? (e.opened / e.sent) * 100 : 0,
      clickRatePct: e.sent > 0 ? (e.clicked / e.sent) * 100 : 0,
    }));

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    mrr: {
      mrrEur: mrrFromSubs,
      monthlyActiveSubs: monthlyActive,
      lifetimeActive,
      lifetimeRevenue30dEur: revenue30dEur,
      monthlyPriceEur: MONTHLY_PRICE_EUR,
    },
    churn: {
      canceled30d,
      activeAtStart,
      churnRate30dPct,
    },
    funnel,
    paymentsLog,
    cancellations: cancellationsList,
    emailPerformance,
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function inferPaymentType(p: PaymentRow): "monthly" | "lifetime" | "unknown" {
  // Heuristik: Lifetime ≥ 500 €, Monthly < 200 €. Bei Bedarf später per
  // stripe_price_id-Lookup ersetzen.
  if (!p.amount_cents) return "unknown";
  if (p.amount_cents >= 50_000) return "lifetime";
  if (p.amount_cents <= 20_000) return "monthly";
  return "unknown";
}

interface FunnelWindow {
  registrations: number;
  applicationsReviewed: number;
  approved: number;
  rejected: number;
  approvalRatePct: number;
  paidAfterApproval: number;
  paidConversionPct: number;
}

interface FunnelResponse {
  "7d": FunnelWindow;
  "30d": FunnelWindow;
}

async function buildFunnel(
  supabase: ReturnType<typeof createServiceClient>,
  since7: string,
  since30: string,
): Promise<FunnelResponse> {
  const [reg7, reg30, apps7, apps30] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since30),
    supabase
      .from("applications")
      .select("status,reviewed_at,user_id")
      .gte("created_at", since7),
    supabase
      .from("applications")
      .select("status,reviewed_at,user_id")
      .gte("created_at", since30),
  ]);

  const apps7Rows = (apps7.data as ApplicationStatusRow[] | null) ?? [];
  const apps30Rows = (apps30.data as ApplicationStatusRow[] | null) ?? [];

  // Paid-Conversion: User-IDs der approved Applications laden, dann gegen
  // profiles checken, ob sie aktuell is_paid=true sind.
  const paid7 = await countPaidAfterApproval(supabase, apps7Rows);
  const paid30 = await countPaidAfterApproval(supabase, apps30Rows);

  const window = (
    rows: ApplicationStatusRow[],
    registrations: number,
    paid: number,
  ): FunnelWindow => {
    const approved = rows.filter((r) => r.status === "approved").length;
    const rejected = rows.filter((r) => r.status === "rejected").length;
    const reviewed = approved + rejected;
    return {
      registrations,
      applicationsReviewed: reviewed,
      approved,
      rejected,
      approvalRatePct: reviewed > 0 ? (approved / reviewed) * 100 : 0,
      paidAfterApproval: paid,
      paidConversionPct: approved > 0 ? (paid / approved) * 100 : 0,
    };
  };

  return {
    "7d": window(apps7Rows, reg7.count ?? 0, paid7),
    "30d": window(apps30Rows, reg30.count ?? 0, paid30),
  };
}

async function countPaidAfterApproval(
  supabase: ReturnType<typeof createServiceClient>,
  apps: ApplicationStatusRow[],
): Promise<number> {
  const ids = apps
    .filter((a) => a.status === "approved" && a.user_id)
    .map((a) => a.user_id as string);
  if (ids.length === 0) return 0;
  const { data } = await supabase
    .from("profiles")
    .select("id,is_paid,membership_tier")
    .in("id", ids);
  const profiles = (data as ProfileFunnelRow[] | null) ?? [];
  return profiles.filter((p) => p.is_paid && p.membership_tier !== "free").length;
}
