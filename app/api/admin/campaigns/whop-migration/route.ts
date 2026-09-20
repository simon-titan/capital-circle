import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getResend } from "@/lib/email/resend";
import { sendWhopMigrationMail1 } from "@/lib/email/templates";
import { WHOP_MIGRATION } from "@/config/whop-migration-campaign";
import { pickFirstNameFor, isAuthorizedCron } from "@/lib/cron/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Manueller Einmal-Trigger für Mail 1 der Whop-Migrations-Kampagne (siehe
 * `docs/` — Segmentierung: Mail 2/3 laufen danach automatisch über den Cron
 * `app/api/cron/whop-migration-followups/route.ts`, ausschließlich anhand
 * von `email_sequence_log`. Diese Route selbst läuft NICHT als Cron — die
 * Zielgruppe ist ein fixer Snapshot zum Zeitpunkt des ersten Aufrufs.
 *
 * Empfänger kommen aus dem Resend-Segment `RESEND_WHOP_SEGMENT_ID`
 * (siehe `scripts/sync-whop-campaign-segment.mjs`), NICHT direkt aus
 * `profiles` — damit auch Kontakte erfasst werden, die nur in Resend
 * existieren (z. B. Leads ohne Plattform-Account).
 *
 * GET  → Zähl-Vorschau (kein Versand).
 * POST → sendet Mail 1 an alle noch offenen Kontakte, max. `limit` pro
 *        Aufruf (Default 250). Idempotent über `email_sequence_log` —
 *        mehrfaches Aufrufen ist sicher und bei großen Segmenten nötig,
 *        um innerhalb von `maxDuration` zu bleiben (`remaining` im Response
 *        zeigt, ob ein weiterer Aufruf nötig ist).
 *
 * Auth: eingeloggter Admin (Dashboard-Nutzung) ODER Bearer $CRON_SECRET
 *       (Skript-/Einmal-Trigger ohne Browser-Session, gleicher Trust-Level
 *       wie die Cron-Routen).
 */

async function authorize(request: NextRequest): Promise<NextResponse | null> {
  if (isAuthorizedCron(request) && request.headers.get("authorization")) {
    return null;
  }
  const { error } = await requireAdmin();
  return error;
}

interface SegmentContact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  unsubscribed: boolean;
}

async function listAllSegmentContacts(segmentId: string): Promise<SegmentContact[]> {
  const resend = getResend();
  const all: SegmentContact[] = [];
  let after: string | undefined;

  for (let page = 0; page < 200; page++) {
    const { data, error } = await resend.contacts.list(
      after ? { segmentId, limit: 100, after } : { segmentId, limit: 100 },
    );
    if (error) throw new Error(error.message);
    if (!data) break;

    all.push(...(data.data as SegmentContact[]));
    if (!data.has_more || data.data.length === 0) break;
    after = data.data[data.data.length - 1]?.id;
    if (!after) break;
  }

  return all;
}

async function resolveTargets() {
  const segmentId = process.env.RESEND_WHOP_SEGMENT_ID?.trim();
  if (!segmentId) {
    throw new Error(
      "RESEND_WHOP_SEGMENT_ID fehlt. Erst `npm run sync:whop-segment` laufen lassen.",
    );
  }

  const contacts = await listAllSegmentContacts(segmentId);
  const eligible = contacts.filter((c) => !c.unsubscribed);
  const unsubscribedCount = contacts.length - eligible.length;

  const service = createServiceClient();
  const emails = eligible.map((c) => c.email);

  const alreadySent = new Set<string>();
  for (let i = 0; i < emails.length; i += 500) {
    const chunk = emails.slice(i, i + 500);
    if (chunk.length === 0) continue;
    const { data: logs } = await service
      .from("email_sequence_log")
      .select("recipient_email")
      .eq("sequence", WHOP_MIGRATION.sequence)
      .eq("step", 0)
      .in("recipient_email", chunk);
    for (const l of logs ?? []) alreadySent.add(l.recipient_email);
  }

  // Best-effort userId-Backfill für Kontakte, die auch eine Plattform-Zeile haben.
  // `profiles` hat keine `email`-Spalte (die liegt in `auth.users`), deshalb
  // über die Admin-API paginiert auflösen statt per `profiles`-Query.
  const userIdByEmail = new Map<string, string>();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    for (const u of data.users) {
      if (u.email) userIdByEmail.set(u.email, u.id);
    }
    if (data.users.length < 1000) break;
  }

  const pending = eligible.filter((c) => !alreadySent.has(c.email));

  return { totalContacts: contacts.length, unsubscribedCount, alreadySent, pending, userIdByEmail };
}

export async function GET(request: NextRequest) {
  const unauthorized = await authorize(request);
  if (unauthorized) return unauthorized;

  try {
    const { totalContacts, unsubscribedCount, alreadySent, pending } = await resolveTargets();
    return NextResponse.json({
      ok: true,
      totalContacts,
      unsubscribed: unsubscribedCount,
      alreadySent: alreadySent.size,
      pending: pending.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await authorize(request);
  if (unauthorized) return unauthorized;

  let limit = 250;
  try {
    const body = (await request.json()) as { limit?: number };
    if (typeof body.limit === "number" && body.limit > 0) limit = Math.min(body.limit, 1000);
  } catch {
    // kein Body → Default-Limit
  }

  try {
    const { pending, userIdByEmail } = await resolveTargets();
    const batch = pending.slice(0, limit);

    let sent = 0;
    const errors: string[] = [];

    for (const contact of batch) {
      try {
        await sendWhopMigrationMail1({
          firstName: pickFirstNameFor(contact.first_name, contact.email),
          email: contact.email,
          userId: userIdByEmail.get(contact.email) ?? null,
        });
        sent += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${contact.email}: ${msg}`);
        console.error("[admin/campaigns/whop-migration] send failed:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      remaining: pending.length - batch.length,
      errorCount: errors.length,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
