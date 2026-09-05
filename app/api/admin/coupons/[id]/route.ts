import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/coupons/[id]
 * Aktiviert/deaktiviert einen Coupon lokal und auf Stripe (promotion_code.active).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { active?: boolean } | null;
  if (!body || typeof body.active !== "boolean") {
    return NextResponse.json({ ok: false, error: "active_required" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: existing, error: fetchErr } = await service
    .from("coupons")
    .select("stripe_promotion_code_id")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ ok: false, error: "coupon_not_found" }, { status: 404 });
  }

  const row = existing as { stripe_promotion_code_id: string | null };
  if (row.stripe_promotion_code_id) {
    try {
      const stripe = getStripe();
      await stripe.promotionCodes.update(row.stripe_promotion_code_id, { active: body.active });
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: `stripe_update_failed: ${(err as Error).message}` },
        { status: 502 },
      );
    }
  }

  const { data, error: dbErr } = await service
    .from("coupons")
    .update({ active: body.active })
    .eq("id", id)
    .select()
    .single();

  if (dbErr) {
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}

/**
 * DELETE /api/admin/coupons/[id]
 * Stripe erlaubt kein Hard-Delete von Promotion Codes — wir deaktivieren sie
 * dort und entfernen die lokale Zeile aus der Admin-Liste.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const service = createServiceClient();
  const { data: existing } = await service
    .from("coupons")
    .select("stripe_promotion_code_id")
    .eq("id", id)
    .single();

  const row = existing as { stripe_promotion_code_id: string | null } | null;
  if (row?.stripe_promotion_code_id) {
    try {
      const stripe = getStripe();
      await stripe.promotionCodes.update(row.stripe_promotion_code_id, { active: false });
    } catch (err) {
      console.error(`[admin/coupons] Stripe-Deaktivierung fehlgeschlagen (${id}):`, err);
    }
  }

  const { error: dbErr } = await service.from("coupons").delete().eq("id", id);
  if (dbErr) {
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
