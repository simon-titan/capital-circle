import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TIERS = ["free", "monthly", "lifetime", "ht_1on1"] as const;
type Tier = (typeof ALLOWED_TIERS)[number];

interface PatchBody {
  membership_tier?: Tier;
  /** ISO-Datum oder null/undefined → access_until wird gelöscht. */
  access_until?: string | null;
}

/**
 * PATCH /api/admin/users/[id]/tier
 *
 * Manueller Tier-Override durch einen Admin.
 *
 * Konsistenzregel (aus implementation-notes.md §3.2):
 *   - membership_tier=X  → is_paid = (X !== 'free')
 *   - access_until wird übernommen, wenn im Body angegeben
 *
 * Audit-Trail: jeder Override schreibt eine Row in `user_audit_log` mit dem
 * alten und neuen Tier-Wert + access_until in `metadata`.
 */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { error: adminErr, user: admin } = await requireAdmin();
  if (adminErr) return adminErr;
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id: targetUserId } = await ctx.params;
  if (!targetUserId) {
    return NextResponse.json(
      { ok: false, error: "Missing user id." },
      { status: 400 },
    );
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const newTier = body.membership_tier;
  if (!newTier || !ALLOWED_TIERS.includes(newTier)) {
    return NextResponse.json(
      {
        ok: false,
        error: `membership_tier muss einer von: ${ALLOWED_TIERS.join(", ")}`,
      },
      { status: 400 },
    );
  }

  let newAccessUntil: string | null = null;
  if (body.access_until && body.access_until.trim()) {
    const parsed = new Date(body.access_until);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { ok: false, error: "access_until ist kein gültiges Datum." },
        { status: 400 },
      );
    }
    newAccessUntil = parsed.toISOString();
  }

  const supabase = createServiceClient();

  // Alten Stand für Audit-Log lesen
  const { data: oldRow, error: readErr } = await supabase
    .from("profiles")
    .select("membership_tier,access_until,is_paid")
    .eq("id", targetUserId)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json(
      { ok: false, error: readErr.message },
      { status: 500 },
    );
  }
  if (!oldRow) {
    return NextResponse.json(
      { ok: false, error: "user_not_found" },
      { status: 404 },
    );
  }

  const oldTier =
    (oldRow as { membership_tier: string | null }).membership_tier ?? "free";
  const oldAccessUntil =
    (oldRow as { access_until: string | null }).access_until ?? null;
  const newIsPaid = newTier !== "free";

  // Update profiles atomar
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({
      membership_tier: newTier,
      is_paid: newIsPaid,
      access_until: newAccessUntil,
    })
    .eq("id", targetUserId);

  if (updateErr) {
    return NextResponse.json(
      { ok: false, error: updateErr.message },
      { status: 500 },
    );
  }

  // Audit-Log schreiben (best-effort)
  const { error: auditErr } = await supabase.from("user_audit_log").insert({
    target_user_id: targetUserId,
    admin_user_id: admin.id,
    action: "manual_tier_override",
    field: "membership_tier",
    old_value: oldTier,
    new_value: newTier,
    metadata: {
      old_access_until: oldAccessUntil,
      new_access_until: newAccessUntil,
      old_is_paid: (oldRow as { is_paid: boolean }).is_paid ?? false,
      new_is_paid: newIsPaid,
    },
  });

  if (auditErr) {
    console.error(
      "[admin/users/tier] audit-log insert failed:",
      auditErr.message,
    );
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: targetUserId,
      membership_tier: newTier,
      is_paid: newIsPaid,
      access_until: newAccessUntil,
    },
  });
}
