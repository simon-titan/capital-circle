import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aboLaeuftSeit, ladeAboKontext } from "@/lib/stripe/abo-kontext";
import { priceIdForPlan } from "@/lib/stripe/plan-map";
import { getStripe } from "@/lib/stripe/server";
import { pruefeUpgrade, upgradeCouponId } from "@/lib/stripe/upgrade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/subscription/upgrade
 *
 * Wechsel vom laufenden Monats- (oder Quartals-)Abo auf den Jahresplan.
 *
 * **Kein zweiter Checkout.** Eine neue Kasse legte ein zweites Abo an, der
 * Kunde zahlte doppelt, und der Webhook bekäme zwei aktive Subscriptions für
 * dasselbe Profil zu sehen. Stattdessen wird das bestehende Abo auf den
 * Jahrespreis umgestellt; `proration_behavior: "always_invoice"` rechnet den
 * bereits bezahlten Rest der laufenden Periode sofort gegen und stellt die
 * Differenz in Rechnung.
 *
 * Die Freischaltung passiert **nicht** hier, sondern über
 * `customer.subscription.updated`. Ein Profil-Update an dieser Stelle wäre ein
 * zweiter Schreibpfad auf dieselbe Zeile und würde mit dem Webhook um die
 * Reihenfolge rennen.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const kontext = await ladeAboKontext(user.id);
  if (!kontext?.abo) {
    return NextResponse.json({ ok: false, error: "kein_abo" }, { status: 400 });
  }

  const pruefung = pruefeUpgrade({
    tier: kontext.tier,
    status: kontext.abo.status,
    cancelAtPeriodEnd: kontext.abo.cancelAtPeriodEnd,
    laufendSeit: aboLaeuftSeit(kontext.abo),
  });
  if (!pruefung.moeglich) {
    return NextResponse.json({ ok: false, error: pruefung.grund }, { status: 403 });
  }

  let jahresPreis: string;
  try {
    jahresPreis = priceIdForPlan("yearly");
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "config_missing",
        detail: err instanceof Error ? err.message : "STRIPE_PRICE_YEARLY fehlt",
      },
      { status: 500 },
    );
  }

  try {
    const stripe = getStripe();
    const abo = await stripe.subscriptions.retrieve(kontext.abo.stripeSubscriptionId);

    if (abo.items.data[0]?.price?.id === jahresPreis) {
      return NextResponse.json({ ok: false, error: "bereits_jahresplan" }, { status: 400 });
    }

    const coupon = upgradeCouponId();

    const aktualisiert = await stripe.subscriptions.update(kontext.abo.stripeSubscriptionId, {
      items: [{ id: abo.items.data[0].id, price: jahresPreis }],
      proration_behavior: "always_invoice",
      // Ohne Coupon bleibt das Feld weg — `discounts: []` würde einen bereits
      // laufenden Rabatt löschen, den jemand von Hand vergeben hat.
      ...(coupon ? { discounts: [{ coupon }] } : {}),
      metadata: { user_id: user.id, plan: "yearly", upgrade_von: kontext.tier },
    });

    return NextResponse.json({
      ok: true,
      status: aktualisiert.status,
      /** Vom Webhook gepflegt — die UI lädt danach ohnehin neu. */
      subscriptionId: aktualisiert.id,
    });
  } catch (err) {
    console.error("[stripe/subscription/upgrade] fehlgeschlagen:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "stripe_fehler",
        detail: err instanceof Error ? err.message : "Unbekannter Fehler",
      },
      { status: 502 },
    );
  }
}
