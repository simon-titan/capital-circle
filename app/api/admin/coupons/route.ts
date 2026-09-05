import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

interface CouponRow {
  id: string;
  code: string;
  stripe_promotion_code_id: string | null;
  stripe_coupon_id: string | null;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  valid_from: string;
  valid_until: string | null;
  max_redemptions: number | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

/**
 * GET /api/admin/coupons
 * Listet alle Coupons; times_redeemed kommt live von Stripe
 * (promotionCodes.retrieve), damit die Zaehlung immer mit Stripe als
 * Source of Truth konsistent bleibt (keine lokale Redemption-Tabelle noetig).
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (dbErr) {
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }

  const rows = (data ?? []) as CouponRow[];
  const stripe = getStripe();

  const items = await Promise.all(
    rows.map(async (row) => {
      if (!row.stripe_promotion_code_id) {
        return { ...row, times_redeemed: null, stripe_active: null };
      }
      try {
        const promo = await stripe.promotionCodes.retrieve(row.stripe_promotion_code_id);
        return { ...row, times_redeemed: promo.times_redeemed, stripe_active: promo.active };
      } catch (err) {
        console.error(`[admin/coupons] Stripe-Retrieve fehlgeschlagen (${row.id}):`, err);
        return { ...row, times_redeemed: null, stripe_active: null };
      }
    }),
  );

  return NextResponse.json({ ok: true, items });
}

interface CreateBody {
  code?: string;
  description?: string | null;
  discount_type?: "percent" | "fixed";
  discount_value?: number;
  valid_from?: string;
  valid_until?: string | null;
  max_redemptions?: number | null;
  active?: boolean;
}

/**
 * POST /api/admin/coupons
 * Legt einen echten Stripe-Coupon + Promotion-Code an und speichert die
 * IDs lokal. Stripe erzwingt Redemption-Limits/Gueltigkeit selbst.
 */
export async function POST(request: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as CreateBody | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const code = body.code?.trim().toUpperCase();
  const discountType = body.discount_type;
  const discountValue = body.discount_value;

  if (!code) {
    return NextResponse.json({ ok: false, error: "code_required" }, { status: 400 });
  }
  if (discountType !== "percent" && discountType !== "fixed") {
    return NextResponse.json({ ok: false, error: "invalid_discount_type" }, { status: 400 });
  }
  if (typeof discountValue !== "number" || discountValue <= 0) {
    return NextResponse.json({ ok: false, error: "invalid_discount_value" }, { status: 400 });
  }
  if (discountType === "percent" && discountValue > 100) {
    return NextResponse.json({ ok: false, error: "percent_over_100" }, { status: 400 });
  }

  const maxRedemptions =
    typeof body.max_redemptions === "number" && body.max_redemptions > 0
      ? Math.floor(body.max_redemptions)
      : null;
  const validUntil = body.valid_until ? new Date(body.valid_until).toISOString() : null;
  const validFrom = body.valid_from ? new Date(body.valid_from).toISOString() : new Date().toISOString();
  const active = body.active ?? true;

  const stripe = getStripe();

  let stripeCoupon: Stripe.Coupon;
  try {
    const couponParams: Stripe.CouponCreateParams =
      discountType === "percent"
        ? { duration: "once", percent_off: discountValue, name: body.description?.trim() || code }
        : {
            duration: "once",
            amount_off: Math.round(discountValue * 100),
            currency: "eur",
            name: body.description?.trim() || code,
          };
    stripeCoupon = await stripe.coupons.create(couponParams);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `stripe_coupon_create_failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  let promotionCode: Stripe.PromotionCode;
  try {
    // Seit der gepinnten API-Version verlangt `promotion_codes.create` ein
    // `promotion`-Objekt statt des frueheren flachen `coupon`-Strings.
    const promoParams: Stripe.PromotionCodeCreateParams = {
      promotion: { type: "coupon", coupon: stripeCoupon.id },
      code,
      active,
    };
    if (maxRedemptions) promoParams.max_redemptions = maxRedemptions;
    if (validUntil) promoParams.expires_at = Math.floor(new Date(validUntil).getTime() / 1000);
    promotionCode = await stripe.promotionCodes.create(promoParams);
  } catch (err) {
    // Coupon existiert bereits in Stripe, aber ohne Promotion-Code — aufraeumen,
    // damit kein verwaister Coupon zurueckbleibt.
    await stripe.coupons.del(stripeCoupon.id).catch(() => {});
    return NextResponse.json(
      { ok: false, error: `stripe_promotion_code_create_failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("coupons")
    .insert({
      code,
      stripe_promotion_code_id: promotionCode.id,
      stripe_coupon_id: stripeCoupon.id,
      description: body.description?.trim() || null,
      discount_type: discountType,
      discount_value: discountValue,
      valid_from: validFrom,
      valid_until: validUntil,
      max_redemptions: maxRedemptions,
      active,
      created_by: user?.id ?? null,
    })
    .select()
    .single();

  if (dbErr) {
    // DB-Insert fehlgeschlagen — Stripe-Objekte deaktivieren, damit kein
    // aktiver Code ohne lokale Referenz uebrig bleibt.
    await stripe.promotionCodes.update(promotionCode.id, { active: false }).catch(() => {});
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}
