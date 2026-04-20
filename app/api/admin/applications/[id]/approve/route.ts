import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { sendWelcomeFreeCourse } from "@/lib/email/templates";

export const runtime = "nodejs";

/**
 * POST /api/admin/applications/[id]/approve
 *
 * - Optimistic-Lock via `WHERE status='pending'` (zweiter Klick → 0 rows → 409).
 * - Sequence-Start `welcome_sequence_started_at = now()` setzen, damit der Cron
 *   die nachfolgenden Tage 1/2/3/5 berechnen kann.
 * - profiles.application_status='approved' synchronisieren.
 * - Welcome-Mail (Template `welcome-free-course`) wird über `logEmailSent`
 *   idempotent versendet — doppelter Aufruf erzeugt also keine zweite Mail.
 */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { error: adminErr, user } = await requireAdmin();
  if (adminErr) return adminErr;
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing application id." }, { status: 400 });
  }

  const service = createServiceClient();

  const nowIso = new Date().toISOString();
  const { data: updated, error: updateErr } = await service
    .from("applications")
    .update({
      status: "approved",
      reviewed_at: nowIso,
      reviewed_by: user.id,
      welcome_sequence_started_at: nowIso,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id,user_id,email,name")
    .maybeSingle();

  if (updateErr) {
    return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Bewerbung nicht gefunden oder bereits bearbeitet." },
      { status: 409 },
    );
  }

  if (updated.user_id) {
    const { error: profileErr } = await service
      .from("profiles")
      .update({ application_status: "approved" })
      .eq("id", updated.user_id);
    if (profileErr) {
      console.error("[admin/applications/approve] profile sync failed:", profileErr);
    }
  }

  // Welcome-Mail asynchron — wir warten NICHT, damit die Admin-UI sofort
  // antwortet. Fehler nur loggen.
  void (async () => {
    try {
      const firstName = firstNameFrom(updated.name as string | null, updated.email as string);
      await sendWelcomeFreeCourse({
        firstName,
        email: updated.email as string,
        userId: (updated.user_id as string) ?? "",
        applicationId: updated.id as string,
      });
    } catch (err) {
      console.error("[admin/applications/approve] welcome mail failed:", err);
    }
  })();

  return NextResponse.json({ ok: true });
}

function firstNameFrom(fullName: string | null, email: string): string {
  const fromName = fullName?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const local = email.split("@")[0] ?? "";
  return local.charAt(0).toUpperCase() + local.slice(1) || "Hallo";
}
