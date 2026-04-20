import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendReactivationOffer } from "@/lib/email/templates";
import { isAuthorizedCron, pickFirstNameFor } from "@/lib/cron/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron: 14-Tage-Reaktivierungs-Angebot nach Kündigung.
 *
 * Schedule: täglich `0 6 * * *` (siehe vercel.json).
 *
 * Logik:
 *   - `cancellations.canceled_at < now()-14d`
 *   - User darf NICHT zurückgekommen sein (`profiles.is_paid = false`).
 *   - Noch keine Reaktivierungs-Mail in `email_sequence_log`
 *     (sequence='reactivation', step=0).
 *   - `unsubscribed_at IS NULL` (DSGVO).
 *
 * Idempotenz:
 *   - `sendReactivationOffer` benutzt `email_sequence_log` mit UNIQUE-Constraint.
 *   - Doppelte Cron-Läufe / mehrere `cancellations`-Rows pro User können nicht
 *     zu Doppel-Mails führen.
 */

interface CancellationRow {
  user_id: string;
  canceled_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  is_paid: boolean | null;
  unsubscribed_at: string | null;
}

interface LogRow {
  recipient_email: string;
}

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const service = createServiceClient();
  const cutoffISO = new Date(Date.now() - FOURTEEN_DAYS_MS).toISOString();

  const { data: cancellations, error: cancelErr } = await service
    .from("cancellations")
    .select("user_id,canceled_at")
    .lt("canceled_at", cutoffISO)
    .not("user_id", "is", null)
    .order("canceled_at", { ascending: true })
    .limit(500);

  if (cancelErr) {
    return NextResponse.json(
      { ok: false, error: cancelErr.message },
      { status: 500 },
    );
  }

  const rows = (cancellations ?? []) as CancellationRow[];
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  // Pro User nur die ÄLTESTE Kündigung berücksichtigen, falls jemand
  // mehrfach gekündigt + reaktiviert hat. Die Liste ist bereits aufsteigend
  // sortiert, daher der erste Eintrag pro user_id.
  const seen = new Set<string>();
  const userIds: string[] = [];
  for (const r of rows) {
    if (seen.has(r.user_id)) continue;
    seen.add(r.user_id);
    userIds.push(r.user_id);
  }

  // Profile nachladen (Filter: nicht zurückgekommen, nicht abgemeldet).
  const { data: profiles, error: profErr } = await service
    .from("profiles")
    .select("id,full_name,is_paid,unsubscribed_at")
    .in("id", userIds);

  if (profErr) {
    return NextResponse.json(
      { ok: false, error: profErr.message },
      { status: 500 },
    );
  }

  const eligibleProfiles = ((profiles ?? []) as ProfileRow[]).filter(
    (p) => p.is_paid === false && !p.unsubscribed_at,
  );

  if (eligibleProfiles.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  // Auth-Emails einmalig pro User holen (für Filter & Versand).
  const userEmailMap = new Map<string, string>();
  for (const p of eligibleProfiles) {
    const { data: authUser } = await service.auth.admin.getUserById(p.id);
    const email = authUser?.user?.email;
    if (email) userEmailMap.set(p.id, email);
  }

  // Bereits gesendete Reaktivierungs-Mails ausfiltern (effizient: 1 Query).
  const allEmails = [...userEmailMap.values()];
  const sentSet = new Set<string>();
  if (allEmails.length > 0) {
    const { data: logs } = await service
      .from("email_sequence_log")
      .select("recipient_email")
      .eq("sequence", "reactivation")
      .eq("step", 0)
      .in("recipient_email", allEmails);
    for (const l of (logs ?? []) as LogRow[]) {
      sentSet.add(l.recipient_email);
    }
  }

  let sent = 0;
  const errors: string[] = [];

  for (const profile of eligibleProfiles) {
    const email = userEmailMap.get(profile.id);
    if (!email) continue;
    if (sentSet.has(email)) continue;

    const firstName = pickFirstNameFor(profile.full_name, email);
    try {
      const result = await sendReactivationOffer({
        firstName,
        email,
        userId: profile.id,
      });
      if (!result.skipped) sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${profile.id}: ${msg}`);
      console.error("[cron/reactivation-offers] send failed:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    errorCount: errors.length,
    errors: errors.slice(0, 10),
  });
}
