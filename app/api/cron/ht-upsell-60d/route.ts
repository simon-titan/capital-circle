import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendHtUpsell60d } from "@/lib/email/templates";
import { isAuthorizedCron, pickFirstNameFor } from "@/lib/cron/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron: 60-Tage-HT-Upsell für Monthly-Subscriber.
 *
 * Schedule: täglich `0 7 * * *` (siehe vercel.json).
 *
 * Logik:
 *   - `membership_tier = 'monthly'`
 *   - `created_at + 60d < now()`
 *   - `ht_upsell_email_sent_at IS NULL` (noch nie versendet)
 *   - User hat NOCH KEINE `high_ticket_applications`-Row
 *   - `unsubscribed_at IS NULL`
 *
 * Idempotenz:
 *   - Profil-Spalte `ht_upsell_email_sent_at` + Sequence-Log
 *     (sequence='ht_upsell', step=0) garantieren Single-Send.
 */

interface CandidateProfile {
  id: string;
  full_name: string | null;
  created_at: string;
}

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const service = createServiceClient();
  const cutoffISO = new Date(Date.now() - SIXTY_DAYS_MS).toISOString();

  const { data: candidates, error: candErr } = await service
    .from("profiles")
    .select("id,full_name,created_at")
    .eq("membership_tier", "monthly")
    .lt("created_at", cutoffISO)
    .is("ht_upsell_email_sent_at", null)
    .is("unsubscribed_at", null)
    .limit(500);

  if (candErr) {
    return NextResponse.json(
      { ok: false, error: candErr.message },
      { status: 500 },
    );
  }

  const profiles = (candidates ?? []) as CandidateProfile[];
  if (profiles.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  // Existierende HT-Bewerbungen rausfiltern (User, die schon einen
  // Erstgespräch-Slot beantragt haben, brauchen keinen Upsell-Push mehr).
  const ids = profiles.map((p) => p.id);
  const { data: htRows } = await service
    .from("high_ticket_applications")
    .select("user_id")
    .in("user_id", ids);
  const skipIds = new Set(
    (htRows ?? [])
      .map((r) => (r as { user_id: string | null }).user_id)
      .filter((v): v is string => Boolean(v)),
  );

  const eligible = profiles.filter((p) => !skipIds.has(p.id));
  if (eligible.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const profile of eligible) {
    try {
      const { data: authUser, error: authErr } =
        await service.auth.admin.getUserById(profile.id);
      if (authErr || !authUser?.user?.email) {
        errors.push(`${profile.id}: keine Email auffindbar`);
        continue;
      }
      const email = authUser.user.email;
      const firstName = pickFirstNameFor(profile.full_name, email);

      const result = await sendHtUpsell60d({
        firstName,
        email,
        userId: profile.id,
      });

      // Profil-Stempel auch dann setzen, wenn der Versand "skipped" war
      // (Sequence-Log existiert bereits) — sonst läuft der User in jedem
      // Cron erneut auf.
      await service
        .from("profiles")
        .update({ ht_upsell_email_sent_at: new Date().toISOString() })
        .eq("id", profile.id);

      if (!result.skipped) sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${profile.id}: ${msg}`);
      console.error("[cron/ht-upsell-60d] send failed:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    errorCount: errors.length,
    errors: errors.slice(0, 10),
  });
}
