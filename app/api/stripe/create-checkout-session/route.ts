import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAppUrl } from "@/lib/site-url";
import { getStripe } from "@/lib/stripe/server";
import { isMembershipPlan, MEMBERSHIP_PLANS, priceIdForPlan } from "@/lib/stripe/plan-map";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  plan?: string;
  promo?: string;
}

/**
 * Eingebetteter Checkout fuer **eingeloggte** Nutzer (Upgrade aus `/billing`).
 *
 * Der Weg von der Landing laeuft dagegen ueber `/go/<plan>` als Gast-Checkout —
 * dort gibt es noch kein Konto, an das sich ein `customer` haengen liesse.
 * Beide Wege teilen sich `lib/stripe/plan-map.ts`, damit Preis und Plan nicht
 * auseinanderlaufen.
 *
 * Der frueher hier gefuehrte `lifetime`-Plan (`mode: "payment"`) ist aus dem
 * Verkauf genommen. Bestandskunden behalten ihren Zugang (siehe
 * `lib/access-control/has-access.ts` und `checkout-completed.ts`), aber kaufbar
 * ist er nicht mehr.
 */

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const plan = body.plan;
  if (!plan || !isMembershipPlan(plan)) {
    return NextResponse.json(
      { ok: false, error: "invalid_plan", allowed: MEMBERSHIP_PLANS },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  let priceId: string;
  try {
    priceId = priceIdForPlan(plan);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "config_missing",
        detail: err instanceof Error ? err.message : "Preis-Konfiguration fehlt",
      },
      { status: 500 },
    );
  }

  // Service-Client für das Profil-Update (`stripe_customer_id`) — RLS würde
  // den User-Client nur eigene Reads erlauben, aber wir wollen sicher gehen,
  // dass der Insert/Update gegen die Spalte unique-konform durchgeht.
  const service = createServiceClient();

  const { data: profileRaw, error: profileError } = await service
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return NextResponse.json(
      { ok: false, error: "profile_lookup_failed", detail: profileError.message },
      { status: 500 },
    );
  }

  const profile = profileRaw as { stripe_customer_id: string | null } | null;
  let customerId = profile?.stripe_customer_id ?? null;

  const stripe = getStripe();

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;

    const { error: updateError } = await service
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);

    if (updateError) {
      // Customer wurde bereits in Stripe angelegt — wir loggen, geben aber
      // weiter zurück, weil Webhook später noch Sync möglich macht.
      console.error(
        `[create-checkout] stripe_customer_id Persist fehlgeschlagen für ${user.id}:`,
        updateError,
      );
    }
  }

  const appUrl = getAppUrl();

  // Optionaler vorausgefüllter Rabattcode (z. B. `?promo=XYZ` aus einer
  // Marketing-E-Mail). `discounts` und `allow_promotion_codes` schließen sich
  // in der Checkout-Session-API gegenseitig aus — bei einem gültigen Code
  // wird der Code direkt angewendet, sonst bleibt das normale Eingabefeld.
  let promotionCodeId: string | null = null;
  const promoCode = body.promo?.trim();
  if (promoCode) {
    const found = await stripe.promotionCodes.list({ code: promoCode, active: true, limit: 1 });
    promotionCodeId = found.data[0]?.id ?? null;
  }

  const session = await stripe.checkout.sessions.create({
    // `embedded_page` ist seit Stripe-API `2026-03-25.dahlia` der neue Name
    // für das vorherige `embedded` (Stripe-Checkout als iframe in der eigenen
    // Seite, gesteuert via `client_secret` + `<EmbeddedCheckout/>`).
    ui_mode: "embedded_page",
    // Alle drei Laufzeiten sind Abos — "vierteljaehrlich" und "jaehrlich" sind
    // Abrechnungsintervalle, keine Einmalzahlungen.
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    return_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    automatic_tax: { enabled: true },
    ...(promotionCodeId
      ? { discounts: [{ promotion_code: promotionCodeId }] }
      : { allow_promotion_codes: true }),
    metadata: { user_id: user.id, plan },
    subscription_data: { metadata: { user_id: user.id, plan } },
  });

  return NextResponse.json({
    ok: true,
    clientSecret: session.client_secret,
    sessionId: session.id,
  });
}
