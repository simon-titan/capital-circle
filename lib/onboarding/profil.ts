import type { SupabaseClient } from "@supabase/supabase-js";
import { spalteFehlt, type WeichenProfil } from "@/lib/onboarding/weiche";

const BASIS = "is_paid,is_admin,membership_tier,usage_agreement_accepted,created_at";
const MIT_ONBOARDING = `${BASIS},onboarding_gestartet_am,onboarding_fragen_am,onboarding_abgeschlossen_am,passwort_gesetzt_am`;
const MIT_ICP = `${MIT_ONBOARDING},icp_free_am,icp_kaeufer_am`;

export type OnboardingProfil = NonNullable<WeichenProfil> & {
  onboarding_gestartet_am?: string | null;
  onboarding_abgeschlossen_am?: string | null;
  passwort_gesetzt_am?: string | null;
};

/**
 * Profil für die Onboarding-Weiche. Fehlen die Spalten aus Migration 107,
 * wird ohne sie gelesen und `spalteDa = false` gemeldet — die Weiche lässt
 * dann alles wie vor dem Onboarding (siehe `fragenOffen`).
 */
export async function ladeOnboardingProfil(
  client: SupabaseClient,
  userId: string,
): Promise<{ profil: OnboardingProfil | null; spalteDa: boolean; icpSpalteDa: boolean; trainingAngenommen: boolean }> {
  const icp = await client.from("profiles").select(MIT_ICP).eq("id", userId).maybeSingle();
  if (!icp.error) {
    const profil = (icp.data as OnboardingProfil | null) ?? null;
    return { profil, spalteDa: true, icpSpalteDa: true, trainingAngenommen: await trainingAngenommen(client, userId, profil) };
  }
  const voll = await client.from("profiles").select(MIT_ONBOARDING).eq("id", userId).maybeSingle();
  if (!voll.error) return { profil: (voll.data as OnboardingProfil | null) ?? null, spalteDa: true, icpSpalteDa: false, trainingAngenommen: false };
  if (!spalteFehlt(voll.error)) console.warn("[onboarding] Profil nicht lesbar:", voll.error.message);
  const basis = await client.from("profiles").select(BASIS).eq("id", userId).maybeSingle();
  return { profil: (basis.data as OnboardingProfil | null) ?? null, spalteDa: false, icpSpalteDa: false, trainingAngenommen: false };
}

/** Free-Bewerbung angenommen (Migration 110)? Nur für Konten ohne Zahlung gefragt. */
async function trainingAngenommen(client: SupabaseClient, userId: string, profil: OnboardingProfil | null): Promise<boolean> {
  if (!profil || profil.is_paid || profil.is_admin) return false;
  const { data, error } = await client.from("training_bewerbungen").select("status").eq("user_id", userId).maybeSingle();
  return !error && (data as { status?: string } | null)?.status === "angenommen";
}
