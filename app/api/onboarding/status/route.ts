import { NextResponse } from "next/server";
import { BASIS_FELDER, MEHRFACH_TRENNER, antwortWerte, felderFuer } from "@/config/onboarding";
import { ladeOnboardingProfil } from "@/lib/onboarding/profil";
import { fragenOffen, icpArt, istNeukaeufer, onboardingErledigt, vereinbarungOffen } from "@/lib/onboarding/weiche";
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

  const { profil, spalteDa, icpSpalteDa, trainingAngenommen } = await ladeOnboardingProfil(supabase, user.id);
  const opt = { icpSpalteDa, trainingAngenommen };
  const offen = fragenOffen(profil, spalteDa, opt);
  const art = icpArt(profil, trainingAngenommen);
  // Ohne Migration 113 bleiben es die fünf Fragen aus 107.
  const felder = art && icpSpalteDa ? felderFuer(art) : BASIS_FELDER;

  let antworten: Record<string, string | null> = {};
  let sonstiges: string | null = null;
  if (spalteDa && offen) {
    try {
      const { data } = await createServiceClient()
        .from("onboarding_antworten")
        // `*`: liest `main_problem_alle` mit, wenn Migration 115 da ist, ohne sonst zu scheitern.
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      const zeile = (data ?? {}) as Record<string, unknown>;
      // Mehrfachfragen kommen kommagetrennt zum Client (`MEHRFACH_TRENNER`).
      antworten = Object.fromEntries(
        felder.map((f) => {
          const w = antwortWerte(f, zeile);
          return [f, w.length ? w.join(MEHRFACH_TRENNER) : null];
        }),
      );
      sonstiges = (zeile.discovery_source_other as string | null) ?? null;
    } catch {
      antworten = {};
    }
  }

  return NextResponse.json({
    angemeldet: true,
    erledigt: onboardingErledigt(profil, spalteDa, opt),
    fragenOffen: offen,
    art,
    felder,
    vereinbarungOffen: vereinbarungOffen(profil),
    neu: istNeukaeufer(profil?.created_at),
    gestartet: Boolean(profil?.onboarding_gestartet_am),
    antworten,
    sonstiges,
  });
}
