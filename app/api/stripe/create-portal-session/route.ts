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

export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
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

  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${getAppUrl()}/billing`,
  });

  return NextResponse.json({ ok: true, url: session.url });
}
