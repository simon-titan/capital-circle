import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  sendChurnInactive7d,
  sendChurnInactive14d,
} from "@/lib/email/templates";
import { isAuthorizedCron, pickFirstNameFor } from "@/lib/cron/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron: Inaktivitäts-Check (Churn-Prevention Stufe 1+2).
 *
 * Schedule: `0 5 * * *` (siehe vercel.json).
 *
 * Logik:
 *   - **Tag 7:** `is_paid=true` UND `last_login_at < now()-7d` UND
 *     `churn_email_1_sent_at IS NULL` UND `unsubscribed_at IS NULL`
 *     → Reminder-Mail 1 (`churn_inactive`/step 7) + Profil-Spalte stempeln.
 *   - **Tag 14:** Selbe Logik mit `last_login_at < now()-14d` und
 *     `churn_email_2_sent_at IS NULL`.
 *
 * Idempotenz:
 *   - `email_sequence_log` UNIQUE (recipient_email,sequence,step) blockt
 *     Doppelversand bei parallelen Cron-Läufen.
 *   - Profil-Stempel verhindert dass die Mail später erneut "fällig" wird.
 *   - Beim Login werden beide Stempel von `proxy.ts` zurückgesetzt — das
 *     resettet auch den nächsten Inaktivitäts-Zyklus.
 *
 * Auth: Bearer `CRON_SECRET` (siehe `lib/cron/auth.ts`).
 */

interface InactiveProfile {
  id: string;
  full_name: string | null;
  last_login_at: string | null;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

async function fetchInactive(
  service: ReturnType<typeof createServiceClient>,
  cutoffISO: string,
  stampedColumn: "churn_email_1_sent_at" | "churn_email_2_sent_at",
): Promise<InactiveProfile[]> {
  const { data, error } = await service
    .from("profiles")
    .select("id,full_name,last_login_at")
    .eq("is_paid", true)
    .lt("last_login_at", cutoffISO)
    .is(stampedColumn, null)
    .is("unsubscribed_at", null)
    .limit(500);

  if (error) {
    throw new Error(`fetchInactive(${stampedColumn}): ${error.message}`);
  }
  return (data ?? []) as InactiveProfile[];
}

async function processStage(
  service: ReturnType<typeof createServiceClient>,
  stage: "tag7" | "tag14",
): Promise<{ sent: number; errors: string[] }> {
  const cutoff = new Date(
    Date.now() - (stage === "tag7" ? SEVEN_DAYS_MS : FOURTEEN_DAYS_MS),
  ).toISOString();
  const stampedColumn =
    stage === "tag7" ? "churn_email_1_sent_at" : "churn_email_2_sent_at";

  const candidates = await fetchInactive(service, cutoff, stampedColumn);
  if (candidates.length === 0) return { sent: 0, errors: [] };

  // Wenn Tag-7-Mail noch nicht raus ist, soll Tag-14 nicht überspringen —
  // hier filtern wir aber Stage 14 zusätzlich darauf, dass Mail 1 bereits
  // versendet wurde (sonst würde ein User, der zwischen Cron-Läufen 14 Tage
  // inaktiv wird, direkt Mail 2 statt Mail 1 bekommen).
  let workQueue = candidates;
  if (stage === "tag14") {
    const ids = candidates.map((c) => c.id);
    const { data: stamped } = await service
      .from("profiles")
      .select("id,churn_email_1_sent_at")
      .in("id", ids);
    const okIds = new Set(
      (stamped ?? [])
        .filter((s) => Boolean((s as { churn_email_1_sent_at?: string | null }).churn_email_1_sent_at))
        .map((s) => (s as { id: string }).id),
    );
    workQueue = candidates.filter((c) => okIds.has(c.id));
  }

  let sent = 0;
  const errors: string[] = [];

  for (const profile of workQueue) {
    try {
      const { data: authUser, error: authErr } =
        await service.auth.admin.getUserById(profile.id);
      if (authErr || !authUser?.user?.email) {
        errors.push(`${profile.id}: keine Email auffindbar`);
        continue;
      }
      const email = authUser.user.email;
      const firstName = pickFirstNameFor(profile.full_name, email);

      const result =
        stage === "tag7"
          ? await sendChurnInactive7d({ firstName, email, userId: profile.id })
          : await sendChurnInactive14d({
              firstName,
              email,
              userId: profile.id,
            });

      // Auch wenn das `email_sequence_log` schon existierte (skipped=true),
      // stempeln wir die Profil-Spalte trotzdem — andernfalls würde der
      // User in jedem Cron-Lauf erneut als Kandidat auftauchen.
      await service
        .from("profiles")
        .update({
          [stage === "tag7"
            ? "churn_email_1_sent_at"
            : "churn_email_2_sent_at"]: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (!result.skipped) sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${profile.id}: ${msg}`);
      console.error(`[cron/check-inactive-users] ${stage} send failed:`, err);
    }
  }

  return { sent, errors };
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const service = createServiceClient();

  const tag7 = await processStage(service, "tag7");
  const tag14 = await processStage(service, "tag14");

  return NextResponse.json({
    ok: true,
    sent: { tag7: tag7.sent, tag14: tag14.sent },
    errorCount: tag7.errors.length + tag14.errors.length,
    errors: [...tag7.errors, ...tag14.errors].slice(0, 10),
  });
}
