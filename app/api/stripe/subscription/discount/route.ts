import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ladeAboKontext } from "@/lib/stripe/abo-kontext";
import { getStripe } from "@/lib/stripe/server";
import { haltenCouponId } from "@/lib/stripe/upgrade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/subscription/discount
 *
 * Das zweite Halte-Angebot im Kündigungs-Flow: ein Rabatt auf die nächsten
 * Abrechnungen statt einer Pause. Welcher Rabatt das ist, entscheidet der
 * Coupon in `STRIPE_RETENTION_COUPON_ID` — Höhe und Dauer stehen in Stripe,
 * damit sich die Aktion ohne Deployment ändern lässt.
 *
 * Ist keine Coupon-ID hinterlegt, gibt es das Angebot nicht. Die Oberfläche
 * fragt denselben Zustand ab und blendet den Knopf dann aus; diese Antwort
 * ist der Riegel dahinter.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const coupon = haltenCouponId();
  if (!coupon) {
    return NextResponse.json({ ok: false, error: "kein_coupon" }, { status: 400 });
  }

  const kontext = await ladeAboKontext(user.id);
  if (!kontext?.abo) {
    return NextResponse.json({ ok: false, error: "kein_abo" }, { status: 400 });
  }

  try {
    const abo = await getStripe().subscriptions.retrieve(kontext.abo.stripeSubscriptionId);

    // Ein zweites Mal denselben Rabatt zu vergeben, wäre ein Selbstbedienungs-
    // Hebel: Kündigung andeuten, Rabatt einsammeln, wiederholen.
    if ((abo.discounts?.length ?? 0) > 0) {
      return NextResponse.json({ ok: false, error: "bereits_rabattiert" }, { status: 400 });
    }

    await getStripe().subscriptions.update(kontext.abo.stripeSubscriptionId, {
      discounts: [{ coupon }],
    });
  } catch (err) {
    console.error("[stripe/subscription/discount] fehlgeschlagen:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "stripe_fehler",
        detail: err instanceof Error ? err.message : "Unbekannter Fehler",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
