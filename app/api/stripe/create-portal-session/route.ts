import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.capitalcircletrading.com"
  ).replace(/\/$/, "");
}

/**
 * Erlaubte Direkteinstiege ins Stripe-Portal.
 *
 * Ohne `flow` landet der Nutzer auf der Portal-Startseite und muss sich sein
 * Anliegen dort selbst suchen. Mit `payment_method_update` springt er direkt
 * in die Kartenmaske und kommt danach wieder auf der Seite heraus, von der er
 * kam. Kündigen läuft bewusst **nicht** über das Portal, sondern über den
 * eigenen Flow in `/einstellungen/abonnement` — dort steht die Grundabfrage
 * und das Halte-Angebot, die Stripe nicht kennt.
 */
const ERLAUBTE_FLOWS = { payment_method_update: "/einstellungen/zahlungsmethode" } as const;
type Flow = keyof typeof ERLAUBTE_FLOWS;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  // Der Body ist optional — die bestehenden Aufrufer schicken gar keinen.
  let flow: Flow | null = null;
  try {
    const body = (await request.json()) as { flow?: string };
    if (body.flow && body.flow in ERLAUBTE_FLOWS) flow = body.flow as Flow;
  } catch {
    flow = null;
  }

  const { data: profileRaw, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return NextResponse.json(
      { ok: false, error: "profile_lookup_failed" },
      { status: 500 },
    );
  }

  const profile = profileRaw as { stripe_customer_id: string | null } | null;
  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { ok: false, error: "no_subscription" },
      { status: 400 },
    );
  }

  const returnUrl = `${getAppUrl()}${flow ? ERLAUBTE_FLOWS[flow] : "/einstellungen/abonnement"}`;

  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: returnUrl,
    ...(flow
      ? {
          flow_data: {
            type: flow,
            after_completion: { type: "redirect", redirect: { return_url: returnUrl } },
          },
        }
      : {}),
  });

  return NextResponse.json({ ok: true, url: session.url });
}
