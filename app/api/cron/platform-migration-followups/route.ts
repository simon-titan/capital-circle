import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getResend } from "@/lib/email/resend";
import { sendPlatformMigrationMail2, sendPlatformMigrationMail3 } from "@/lib/email/templates";
import { PLATFORM_MIGRATION } from "@/config/platform-migration-campaign";
import { isAuthorizedCron } from "@/lib/cron/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron: Plattform-Migrations-Folgemails (Mail 2 + Mail 3) — Umkehrung von
 * `app/api/cron/whop-migration-followups/route.ts`, strukturell identisch.
 *
 * Schedule: täglich (siehe vercel.json). Mail 1 selbst läuft NICHT hier —
 * die Zielgruppe ist ein fixer Snapshot, einmalig getriggert über
 * `POST /api/admin/campaigns/platform-migration`. Dieser Cron verarbeitet
 * ausschließlich, was daraus im `email_sequence_log` bereits steht und
 * bleibt danach ein günstiger No-Op, sobald die Kampagne durchgelaufen ist
 * — insbesondere solange Mail 1 noch nicht ausgelöst wurde (Go-Live-Blocker).
 *
 * Segmentierung:
 *   Mail 2 (Tag 3)  → step-0 gesendet, nicht geöffnet, noch kein step 1.
 *   Mail 3 (Tag 6)  → step-0 ODER step-1 geöffnet, aber NICHT geklickt,
 *                     noch kein step 2. Reine Nicht-Öffner bekommen NICHTS.
 *
 * Auth: Bearer $CRON_SECRET (identisch zu den anderen Cron-Routen).
 */

interface LogRow {
  recipient_email: string;
  user_id: string | null;
  step: number;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
}

async function fetchAllLogRows(): Promise<LogRow[]> {
  const service = createServiceClient();
  const rows: LogRow[] = [];
  let from = 0;
  const PAGE = 1000;

  for (;;) {
    const { data, error } = await service
      .from("email_sequence_log")
      .select("recipient_email, user_id, step, sent_at, opened_at, clicked_at")
      .eq("sequence", PLATFORM_MIGRATION.sequence)
      .range(from, from + PAGE - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...(data as LogRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return rows;
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000);
}

async function firstNameFor(email: string, userId: string | null, profileNames: Map<string, string | null>): Promise<string> {
  const fullName = userId ? profileNames.get(userId) : null;
  if (fullName?.trim()) return fullName.trim().split(/\s+/)[0];

  try {
    const resend = getResend();
    const { data } = await resend.contacts.get({ email });
    if (data?.first_name?.trim()) return data.first_name.trim();
  } catch {
    // Fällt auf Email-Local-Part zurück
  }

  const local = email.split("@")[0] ?? "";
  return local.charAt(0).toUpperCase() + local.slice(1) || "Trader";
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let rows: LogRow[];
  try {
    rows = await fetchAllLogRows();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  const byEmail = new Map<string, { step0?: LogRow; step1?: LogRow; step2?: LogRow }>();
  for (const row of rows) {
    const entry = byEmail.get(row.recipient_email) ?? {};
    if (row.step === 0) entry.step0 = row;
    if (row.step === 1) entry.step1 = row;
    if (row.step === 2) entry.step2 = row;
    byEmail.set(row.recipient_email, entry);
  }

  // Profil-Namen für alle beteiligten user_id in einem Rutsch laden.
  const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter((id): id is string => Boolean(id))));
  const profileNames = new Map<string, string | null>();
  if (userIds.length > 0) {
    const service = createServiceClient();
    const { data: profiles } = await service.from("profiles").select("id, full_name").in("id", userIds);
    for (const p of profiles ?? []) profileNames.set(p.id, p.full_name);
  }

  let mail2Sent = 0;
  let mail3Sent = 0;
  const errors: string[] = [];

  for (const [email, entry] of byEmail) {
    if (!entry.step0) continue;

    // Mail 2 — nur Nicht-Öffner von Mail 1, ab Tag `mail2DueDays`.
    if (!entry.step1 && !entry.step2 && !entry.step0.opened_at) {
      if (daysSince(entry.step0.sent_at) >= PLATFORM_MIGRATION.mail2DueDays) {
        try {
          const firstName = await firstNameFor(email, entry.step0.user_id, profileNames);
          await sendPlatformMigrationMail2({ firstName, email, userId: entry.step0.user_id });
          mail2Sent += 1;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`mail2 → ${email}: ${msg}`);
        }
      }
      continue;
    }

    // Mail 3 — Öffner (Mail 1 ODER Mail 2) ohne Klick, ab Tag `mail3DueDays`.
    if (!entry.step2 && daysSince(entry.step0.sent_at) >= PLATFORM_MIGRATION.mail3DueDays) {
      const opened = Boolean(entry.step0.opened_at) || Boolean(entry.step1?.opened_at);
      const clicked = Boolean(entry.step0.clicked_at) || Boolean(entry.step1?.clicked_at);
      if (opened && !clicked) {
        try {
          const firstName = await firstNameFor(email, entry.step0.user_id, profileNames);
          await sendPlatformMigrationMail3({ firstName, email, userId: entry.step0.user_id });
          mail3Sent += 1;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`mail3 → ${email}: ${msg}`);
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent: { mail2: mail2Sent, mail3: mail3Sent },
    errorCount: errors.length,
    errors: errors.slice(0, 10),
  });
}
