import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type Outcome = "pending" | "closed_won" | "closed_lost" | "no_show";
const OUTCOMES: Outcome[] = ["pending", "closed_won", "closed_lost", "no_show"];

/**
 * PATCH /api/admin/ht-applications/[id]/outcome
 *
 * Body: { outcome?: Outcome, internal_notes?: string | null }
 *
 * - Mindestens eines der Felder muss angegeben sein.
 * - Bei `outcome='closed_won'` wird gleichzeitig der verknüpfte User auf
 *   `membership_tier='ht_1on1'` und `is_paid=true` aufgestuft (sofern user_id
 *   gesetzt ist) und ein `user_audit_log`-Eintrag geschrieben.
 */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { error: adminErr, user } = await requireAdmin();
  if (adminErr) return adminErr;
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Missing application id." },
      { status: 400 },
    );
  }

  let body: { outcome?: unknown; internal_notes?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  let nextOutcome: Outcome | null = null;

  if (typeof body.outcome === "string") {
    if (!OUTCOMES.includes(body.outcome as Outcome)) {
      return NextResponse.json({ ok: false, error: "Invalid outcome." }, { status: 400 });
    }
    nextOutcome = body.outcome as Outcome;
    update.outcome = nextOutcome;
  }

  if (body.internal_notes !== undefined) {
    if (body.internal_notes === null) {
      update.internal_notes = null;
    } else if (typeof body.internal_notes === "string") {
      update.internal_notes = body.internal_notes.slice(0, 5000);
    } else {
      return NextResponse.json(
        { ok: false, error: "internal_notes must be string or null." },
        { status: 400 },
      );
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { ok: false, error: "Nothing to update." },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  const { data: updated, error: updateErr } = await service
    .from("high_ticket_applications")
    .update(update)
    .eq("id", id)
    .select("id,user_id,email,name,outcome")
    .maybeSingle();

  if (updateErr) {
    return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Bewerbung nicht gefunden." },
      { status: 404 },
    );
  }

  // Bei closed_won: Tier-Upgrade + Audit-Log
  if (nextOutcome === "closed_won" && updated.user_id) {
    const targetUserId = updated.user_id as string;

    const { data: profileBefore } = await service
      .from("profiles")
      .select("membership_tier,is_paid")
      .eq("id", targetUserId)
      .maybeSingle();

    const previousTier = (profileBefore?.membership_tier as string | null) ?? null;

    const { error: profileErr } = await service
      .from("profiles")
      .update({
        membership_tier: "ht_1on1",
        is_paid: true,
      })
      .eq("id", targetUserId);

    if (profileErr) {
      console.error("[ht-applications/outcome] profile upgrade failed:", profileErr);
      // Nicht hart scheitern — der Outcome ist gespeichert. Der Admin kann
      // das Tier-Upgrade manuell wiederholen ("Zugang aktivieren"-Button).
    } else {
      const { error: auditErr } = await service.from("user_audit_log").insert({
        target_user_id: targetUserId,
        admin_user_id: user.id,
        action: "manual_tier_upgrade",
        field: "membership_tier",
        old_value: previousTier,
        new_value: "ht_1on1",
        metadata: {
          source: "ht_application_closed_won",
          application_id: updated.id as string,
        },
      });
      if (auditErr) {
        console.error("[ht-applications/outcome] audit log insert failed:", auditErr);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    id: updated.id as string,
    outcome: (updated.outcome as Outcome) ?? "pending",
  });
}
