import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

interface ProfileRow {
  id: string;
  full_name: string | null;
  username: string | null;
  is_paid: boolean;
  access_until: string | null;
  payment_failed_email_1_sent_at: string | null;
  payment_failed_email_2_sent_at: string | null;
  payment_failed_email_3_sent_at: string | null;
  dunning_admin_note: string | null;
}

interface PaymentRow {
  user_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  failure_reason: string | null;
  attempt_count: number | null;
  created_at: string;
}

/**
 * GET /api/admin/payment-issues
 * Mitglieder im Grace-Zeitraum (access_until in der Zukunft, is_paid=false)
 * ODER mit einer fehlgeschlagenen Zahlung in den letzten 30 Tagen.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const service = createServiceClient();
  const nowIso = new Date().toISOString();
  const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [graceRes, failedPaymentsRes] = await Promise.all([
    service
      .from("profiles")
      .select(
        "id,full_name,username,is_paid,access_until,payment_failed_email_1_sent_at,payment_failed_email_2_sent_at,payment_failed_email_3_sent_at,dunning_admin_note",
      )
      .eq("is_paid", false)
      .gt("access_until", nowIso)
      .limit(500),
    service
      .from("payments")
      .select("user_id,amount_cents,currency,status,failure_reason,attempt_count,created_at")
      .eq("status", "failed")
      .gte("created_at", thirtyDaysAgoIso)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  if (graceRes.error) {
    return NextResponse.json({ ok: false, error: graceRes.error.message }, { status: 500 });
  }
  if (failedPaymentsRes.error) {
    return NextResponse.json({ ok: false, error: failedPaymentsRes.error.message }, { status: 500 });
  }

  const failedPayments = (failedPaymentsRes.data ?? []) as PaymentRow[];
  const latestFailedByUser = new Map<string, PaymentRow>();
  for (const payment of failedPayments) {
    if (!payment.user_id) continue;
    if (!latestFailedByUser.has(payment.user_id)) {
      latestFailedByUser.set(payment.user_id, payment);
    }
  }

  const graceProfiles = (graceRes.data ?? []) as ProfileRow[];
  const userIds = new Set<string>(graceProfiles.map((p) => p.id));
  for (const userId of latestFailedByUser.keys()) userIds.add(userId);

  const missingIds = [...userIds].filter((id) => !graceProfiles.some((p) => p.id === id));
  let extraProfiles: ProfileRow[] = [];
  if (missingIds.length > 0) {
    const { data, error: extraErr } = await service
      .from("profiles")
      .select(
        "id,full_name,username,is_paid,access_until,payment_failed_email_1_sent_at,payment_failed_email_2_sent_at,payment_failed_email_3_sent_at,dunning_admin_note",
      )
      .in("id", missingIds);
    if (extraErr) {
      return NextResponse.json({ ok: false, error: extraErr.message }, { status: 500 });
    }
    extraProfiles = (data ?? []) as ProfileRow[];
  }

  const allProfiles = [...graceProfiles, ...extraProfiles];
  const emailByUserId = new Map<string, string | null>();
  await Promise.all(
    allProfiles.map(async (p) => {
      const { data } = await service.auth.admin.getUserById(p.id);
      emailByUserId.set(p.id, data.user?.email ?? null);
    }),
  );

  const items = allProfiles.map((p) => {
    const lastFailed = latestFailedByUser.get(p.id) ?? null;
    return {
      id: p.id,
      full_name: p.full_name,
      username: p.username,
      email: emailByUserId.get(p.id) ?? null,
      is_paid: p.is_paid,
      access_until: p.access_until,
      payment_failed_email_1_sent_at: p.payment_failed_email_1_sent_at,
      payment_failed_email_2_sent_at: p.payment_failed_email_2_sent_at,
      payment_failed_email_3_sent_at: p.payment_failed_email_3_sent_at,
      dunning_admin_note: p.dunning_admin_note,
      last_failed_amount_cents: lastFailed?.amount_cents ?? null,
      last_failed_currency: lastFailed?.currency ?? null,
      last_failed_reason: lastFailed?.failure_reason ?? null,
      last_failed_attempt_count: lastFailed?.attempt_count ?? null,
      last_failed_at: lastFailed?.created_at ?? null,
    };
  });

  items.sort((a, b) => {
    const aTime = a.access_until ? new Date(a.access_until).getTime() : 0;
    const bTime = b.access_until ? new Date(b.access_until).getTime() : 0;
    return aTime - bTime;
  });

  return NextResponse.json({ ok: true, items });
}
