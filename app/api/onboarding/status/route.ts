import { NextResponse } from "next/server";
import { FRAGEN_FELDER } from "@/config/onboarding";
import { ladeOnboardingProfil } from "@/lib/onboarding/profil";
import { fragenOffen, istNeukaeufer, onboardingErledigt, vereinbarungOffen } from "@/lib/onboarding/weiche";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Welcher Onboarding-Schritt ist dran? Gelesen von `OnboardingFlow` auf
 * `/einsteig`. Dieselbe Regel wie in `proxy.ts` (`lib/onboarding/weiche.ts`),
 * damit Proxy und Seite sich nie gegenseitig hin- und herschicken.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ angemeldet: false });

  const { profil, spalteDa } = await ladeOnboardingProfil(supabase, user.id);

  let antworten: Record<string, string | null> = {};
  let sonstiges: string | null = null;
  if (spalteDa && fragenOffen(profil, spalteDa)) {
    try {
      const { data } = await createServiceClient()
        .from("onboarding_antworten")
        .select(`${FRAGEN_FELDER.join(",")},discovery_source_other`)
        .eq("user_id", user.id)
        .maybeSingle();
      const zeile = (data ?? {}) as Record<string, string | null>;
      antworten = Object.fromEntries(FRAGEN_FELDER.map((f) => [f, zeile[f] ?? null]));
      sonstiges = zeile.discovery_source_other ?? null;
    } catch {
      antworten = {};
    }
  }

  return NextResponse.json({
    angemeldet: true,
    erledigt: onboardingErledigt(profil, spalteDa),
    fragenOffen: fragenOffen(profil, spalteDa),
    vereinbarungOffen: vereinbarungOffen(profil),
    neu: istNeukaeufer(profil?.created_at),
    gestartet: Boolean(profil?.onboarding_gestartet_am),
    antworten,
    sonstiges,
  });
}
