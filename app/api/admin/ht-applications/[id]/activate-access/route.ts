import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * POST /api/admin/ht-applications/[id]/activate-access
 *
 * Stuft den verknüpften User auf `membership_tier='ht_1on1'` + `is_paid=true`
 * auf und schreibt einen `user_audit_log`-Eintrag. Idempotent — kann beliebig
 * oft aufgerufen werden (z. B. wenn das automatische Upgrade beim Setzen von
 * `outcome='closed_won'` fehlgeschlagen ist).
 *
 * Voraussetzungen:
 *   - Bewerbung muss `user_id` haben (sonst 409 — User existiert noch nicht)
 *   - Outcome wird NICHT verändert
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
    return NextResponse.json(
      { ok: false, error: "Missing application id." },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  const { data: app } = await service
    .from("high_ticket_applications")
    .select("id,user_id,email,name")
    .eq("id", id)
    .maybeSingle();

  if (!app) {
    return NextResponse.json(
      { ok: false, error: "Bewerbung nicht gefunden." },
      { status: 404 },
    );
  }
  if (!app.user_id) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Diese Bewerbung ist mit keinem registrierten User verknüpft. Bitte den Account zuerst anlegen.",
      },
      { status: 409 },
    );
  }

  const targetUserId = app.user_id as string;

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
    return NextResponse.json(
      { ok: false, error: profileErr.message },
      { status: 500 },
    );
  }

  const { error: auditErr } = await service.from("user_audit_log").insert({
    target_user_id: targetUserId,
    admin_user_id: user.id,
    action: "manual_tier_upgrade",
    field: "membership_tier",
    old_value: previousTier,
    new_value: "ht_1on1",
    metadata: {
      source: "ht_application_activate_access",
      application_id: app.id as string,
    },
  });
  if (auditErr) {
    console.error("[ht-applications/activate-access] audit log failed:", auditErr);
  }

  return NextResponse.json({ ok: true });
}
