import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  sendPaymentFailed2,
  sendPaymentFailed3,
} from "@/lib/email/templates";
import { logEmailSent } from "@/lib/email/sequence-log";
import { isAuthorizedCron, pickFirstNameFor } from "@/lib/cron/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron: Dunning-Pipeline für gescheiterte Subscriptions.
 *
 * Schedule: alle 6 Stunden (`0 *\/6 * * *` in vercel.json).
 *
 * Mail 1 (sofort) wird vom Stripe-Webhook `invoice.payment_failed` versendet
 * (siehe `lib/stripe/webhooks/invoice-payment-failed.ts`). Dieser Cron
 * übernimmt die Eskalation:
 *
 *   - **+24h:** Mail 2 (`payment_failed`/step 2)
 *   - **+48h:** Mail 3 (`payment_failed`/step 3) — Zugang ist seit 48h
 *     gesperrt (Webhook setzt `access_until=now+48h`).
 *   - **+7d:**  Closer-DM-Alert (Slack oder Konsole) — der Closer muss den
 *     Kunden persönlich kontaktieren. Wir loggen via `email_sequence_log`
 *     `closer_dm_alert`/step 7, damit jeder User nur einmal alarmiert wird.
 *
 * Filter:
 *   - `subscriptions.status = 'past_due'` (über zweite Query)
 *   - `unsubscribed_at IS NULL`
 *   - Bei Nachzahlung setzt `invoice.paid` alle `payment_failed_email_*` zurück
 *     auf NULL → User fällt aus diesem Cron raus.
 */

interface DunningProfile {
  id: string;
  full_name: string | null;
  payment_failed_email_1_sent_at: string | null;
  payment_failed_email_2_sent_at: string | null;
  payment_failed_email_3_sent_at: string | null;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

async function loadPastDueUserIds(
  service: ReturnType<typeof createServiceClient>,
): Promise<Set<string>> {
  const { data, error } = await service
    .from("subscriptions")
    .select("user_id")
    .eq("status", "past_due");
  if (error) {
    throw new Error(`loadPastDueUserIds: ${error.message}`);
  }
  return new Set((data ?? []).map((r) => (r as { user_id: string }).user_id));
}

async function loadDunningCandidates(
  service: ReturnType<typeof createServiceClient>,
  pastDueIds: string[],
): Promise<DunningProfile[]> {
  if (pastDueIds.length === 0) return [];
  const { data, error } = await service
    .from("profiles")
    .select(
      "id,full_name,payment_failed_email_1_sent_at,payment_failed_email_2_sent_at,payment_failed_email_3_sent_at",
    )
    .in("id", pastDueIds)
    .not("payment_failed_email_1_sent_at", "is", null)
    .is("unsubscribed_at", null)
    .limit(500);
  if (error) {
    throw new Error(`loadDunningCandidates: ${error.message}`);
  }
  return (data ?? []) as DunningProfile[];
}

async function loadAuthEmail(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await service.auth.admin.getUserById(userId);
  if (error) return null;
  return data.user?.email ?? null;
}

async function notifyCloserDM(payload: {
  userId: string;
  email: string;
  firstName: string;
  daysOverdue: number;
}): Promise<void> {
  const slackUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  const text = `⚠️ Closer-DM nötig: ${payload.firstName} (${payload.email}) — Zahlung seit ${payload.daysOverdue}d offen (user_id=${payload.userId}).`;

  if (slackUrl) {
    try {
      await fetch(slackUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      return;
    } catch (err) {
      console.error("[cron/process-dunning] Slack-Webhook failed:", err);
      // Fall-through zu console.warn unten — Closer wird das Backup im Log
      // sehen.
    }
  }

  // Kein Slack konfiguriert (oder Slack-Call hat geworfen) → Konsole.
  // Im Admin-Panel ist die Past-Due-Subscription ohnehin sichtbar; das
  // Sequence-Log markiert, dass der Alert angestoßen wurde.
  console.warn(`[cron/process-dunning] CLOSER ALERT: ${text}`);
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const service = createServiceClient();
  const now = Date.now();

  let pastDueIds: Set<string>;
  try {
    pastDueIds = await loadPastDueUserIds(service);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }

  const candidates = await loadDunningCandidates(service, [...pastDueIds]);

  const result = { mail2: 0, mail3: 0, closerDm: 0 };
  const errors: string[] = [];

  for (const profile of candidates) {
    if (!profile.payment_failed_email_1_sent_at) continue;
    const failedAt = new Date(profile.payment_failed_email_1_sent_at).getTime();
    if (Number.isNaN(failedAt)) continue;
    const hoursSince = (now - failedAt) / ONE_HOUR_MS;

    let email: string | null = null;
    const ensureEmail = async (): Promise<string | null> => {
      if (email) return email;
      email = await loadAuthEmail(service, profile.id);
      return email;
    };

    try {
      // +24h-Mail (step 2)
      if (hoursSince >= 24 && !profile.payment_failed_email_2_sent_at) {
        const addr = await ensureEmail();
        if (addr) {
          const firstName = pickFirstNameFor(profile.full_name, addr);
          const res = await sendPaymentFailed2({
            firstName,
            email: addr,
            userId: profile.id,
          });
          await service
            .from("profiles")
            .update({ payment_failed_email_2_sent_at: new Date().toISOString() })
            .eq("id", profile.id);
          if (!res.skipped) result.mail2++;
        }
      }

      // +48h-Mail (step 3)
      if (hoursSince >= 48 && !profile.payment_failed_email_3_sent_at) {
        const addr = await ensureEmail();
        if (addr) {
          const firstName = pickFirstNameFor(profile.full_name, addr);
          const res = await sendPaymentFailed3({
            firstName,
            email: addr,
            userId: profile.id,
          });
          await service
            .from("profiles")
            .update({ payment_failed_email_3_sent_at: new Date().toISOString() })
            .eq("id", profile.id);
          if (!res.skipped) result.mail3++;
        }
      }

      // +7d Closer-DM-Alert (alle 3 Mails sind dann raus)
      if (
        hoursSince >= 24 * 7 &&
        profile.payment_failed_email_3_sent_at !== null
      ) {
        const addr = await ensureEmail();
        if (addr) {
          // Idempotenz über Sequence-Log: 1× pro User-DunningCycle alarmieren.
          const inserted = await logEmailSent({
            userId: profile.id,
            recipientEmail: addr,
            sequence: "closer_dm_alert",
            step: 7,
          });
          if (inserted) {
            await notifyCloserDM({
              userId: profile.id,
              email: addr,
              firstName: pickFirstNameFor(profile.full_name, addr),
              daysOverdue: Math.floor(hoursSince / 24),
            });
            result.closerDm++;
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${profile.id}: ${msg}`);
      console.error("[cron/process-dunning] step failed:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    sent: result,
    errorCount: errors.length,
    errors: errors.slice(0, 10),
  });
}
