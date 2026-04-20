import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  plan?: string;
}

const PLANS = {
  monthly: {
    mode: "subscription" as const,
    priceEnv: "STRIPE_PRICE_MONTHLY",
  },
  lifetime: {
    mode: "payment" as const,
    priceEnv: "STRIPE_PRICE_LIFETIME",
  },
};

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.capitalcircletrading.com"
  ).replace(/\/$/, "");
}

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
  if (plan !== "monthly" && plan !== "lifetime") {
    return NextResponse.json(
      { ok: false, error: "invalid_plan", allowed: ["monthly", "lifetime"] },
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

  const planConfig = PLANS[plan];
  const priceId = process.env[planConfig.priceEnv]?.trim();
  if (!priceId) {
    return NextResponse.json(
      {
        ok: false,
        error: "config_missing",
        detail: `${planConfig.priceEnv} ist nicht gesetzt`,
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

  const session = await stripe.checkout.sessions.create({
    // `embedded_page` ist seit Stripe-API `2026-03-25.dahlia` der neue Name
    // für das vorherige `embedded` (Stripe-Checkout als iframe in der eigenen
    // Seite, gesteuert via `client_secret` + `<EmbeddedCheckout/>`).
    ui_mode: "embedded_page",
    mode: planConfig.mode,
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    return_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    automatic_tax: { enabled: true },
    allow_promotion_codes: true,
    metadata: { user_id: user.id, plan },
    ...(planConfig.mode === "subscription"
      ? {
          subscription_data: {
            metadata: { user_id: user.id, plan },
          },
        }
      : {}),
  });

  return NextResponse.json({
    ok: true,
    clientSecret: session.client_secret,
    sessionId: session.id,
  });
}
