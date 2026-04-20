import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  sendFreeCourseDay1,
  sendFreeCourseDay2,
  sendFreeCourseDay3,
  sendFreeCourseDay5,
} from "@/lib/email/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron: Free-Course-Email-Sequenz (Tag 1, 2, 3, 5).
 *
 * Schedule: `0 5 * * *` (siehe vercel.json).
 *
 * Mechanik:
 *   - Für jeden Step (1/2/3/5) holen wir alle approved Applications, deren
 *     `welcome_sequence_started_at + step days` schon erreicht ist und für
 *     die im `email_sequence_log` noch kein Eintrag mit
 *     (recipient_email, sequence='free_course_welcome', step) existiert.
 *   - Wir filtern auf der App-Seite gegen `profiles.unsubscribed_at`.
 *   - Versand läuft über `sendEmail({ log })` — UNIQUE-Constraint im Log
 *     verhindert Doppelversand auch bei parallelen Cron-Läufen.
 *
 * Auth: Bearer $CRON_SECRET. In Vercel-Cron-Aufrufen wird der Header
 *       automatisch gesetzt, wenn die Env-Variable definiert ist.
 */
const STEPS = [1, 2, 3, 5] as const;
type Step = (typeof STEPS)[number];

const SENDERS: Record<
  Step,
  (props: { firstName: string; email: string; userId: string }) => Promise<unknown>
> = {
  1: sendFreeCourseDay1,
  2: sendFreeCourseDay2,
  3: sendFreeCourseDay3,
  5: sendFreeCourseDay5,
};

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

function firstNameFrom(fullName: string | null | undefined, email: string): string {
  const fromName = fullName?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const local = email.split("@")[0] ?? "";
  return local.charAt(0).toUpperCase() + local.slice(1) || "Hallo";
}

interface ApplicationRow {
  id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  welcome_sequence_started_at: string | null;
}

interface ProfileRow {
  id: string;
  unsubscribed_at: string | null;
  full_name: string | null;
}

interface LogRow {
  recipient_email: string;
  step: number;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  const { data: candidates, error: candErr } = await service
    .from("applications")
    .select("id,user_id,email,name,welcome_sequence_started_at")
    .eq("status", "approved")
    .not("welcome_sequence_started_at", "is", null)
    .limit(2000);

  if (candErr) {
    return NextResponse.json({ ok: false, error: candErr.message }, { status: 500 });
  }

  const apps = (candidates ?? []) as ApplicationRow[];
  if (apps.length === 0) {
    return NextResponse.json({ ok: true, sent: { step1: 0, step2: 0, step3: 0, step5: 0 } });
  }

  // Profil-Lookup für Unsubscribe-Filter & First-Name
  const userIds = Array.from(
    new Set(apps.map((a) => a.user_id).filter((id): id is string => Boolean(id))),
  );
  const profileMap = new Map<string, ProfileRow>();
  if (userIds.length > 0) {
    const { data: profiles } = await service
      .from("profiles")
      .select("id,unsubscribed_at,full_name")
      .in("id", userIds);
    for (const p of (profiles ?? []) as ProfileRow[]) {
      profileMap.set(p.id, p);
    }
  }

  // Bestehende Log-Einträge in einem Schwung holen
  const emails = Array.from(new Set(apps.map((a) => a.email).filter(Boolean)));
  const sentMap = new Set<string>();
  if (emails.length > 0) {
    const { data: logs } = await service
      .from("email_sequence_log")
      .select("recipient_email,step")
      .eq("sequence", "free_course_welcome")
      .in("recipient_email", emails);
    for (const l of (logs ?? []) as LogRow[]) {
      sentMap.add(`${l.recipient_email}::${l.step}`);
    }
  }

  const now = Date.now();
  const result = { step1: 0, step2: 0, step3: 0, step5: 0 } as Record<string, number>;
  const errors: string[] = [];

  for (const step of STEPS) {
    const sender = SENDERS[step];
    const dueMs = step * 24 * 60 * 60 * 1000;

    for (const app of apps) {
      if (!app.welcome_sequence_started_at) continue;
      const started = new Date(app.welcome_sequence_started_at).getTime();
      if (Number.isNaN(started)) continue;
      if (now - started < dueMs) continue;

      if (sentMap.has(`${app.email}::${step}`)) continue;

      const profile = app.user_id ? profileMap.get(app.user_id) : undefined;
      if (profile?.unsubscribed_at) continue;

      const firstName = firstNameFrom(profile?.full_name ?? app.name, app.email);

      try {
        await sender({
          firstName,
          email: app.email,
          userId: app.user_id ?? "",
        });
        result[`step${step}`] = (result[`step${step}`] ?? 0) + 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`step ${step} → ${app.email}: ${msg}`);
        console.error("[cron/free-course-sequence] send failed:", err);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent: result,
    errorCount: errors.length,
    errors: errors.slice(0, 10),
  });
}
