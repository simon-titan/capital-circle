import { isFreeMember } from "@/lib/membership";
import { ONBOARDING_START } from "@/config/onboarding";

/**
 * Die Onboarding-Weiche als reine Funktion — dieselbe Regel in `proxy.ts`
 * (leitet nach `/einsteig`) und in `GET /api/onboarding/status` (sagt dem
 * Ablauf, welcher Schritt dran ist). Weichen die beiden voneinander ab, schickt
 * der Proxy nach `/einsteig`, und `/einsteig` schickt zurück zum Dashboard:
 * eine Schleife. Deshalb gibt es die Regel nur hier.
 */
export type WeichenProfil = {
  is_paid?: boolean | null;
  is_admin?: boolean | null;
  membership_tier?: string | null;
  usage_agreement_accepted?: boolean | null;
  onboarding_fragen_am?: string | null;
  created_at?: string | null;
} | null;

/**
 * Sind die fünf Fragen noch offen? Nur für zahlende Konten (auch die aus dem
 * Whop-Umzug, die als `free` mit `is_paid` geführt werden), nie für Admins.
 *
 * `spalteDa = false` heisst: Migration 107 ist noch nicht eingespielt. Dann
 * gilt die neue Bedingung als erfüllt — niemand wird ausgesperrt.
 */
export function fragenOffen(profil: WeichenProfil, spalteDa: boolean): boolean {
  if (!spalteDa || !profil) return false;
  if (profil.is_admin) return false;
  if (!profil.is_paid) return false;
  return !profil.onboarding_fragen_am;
}

/** Nutzungsvereinbarung offen — unverändert: Free-Konten brauchen sie nicht. */
export function vereinbarungOffen(profil: WeichenProfil): boolean {
  if (!profil) return true;
  return !isFreeMember(profil) && !profil.usage_agreement_accepted;
}

export function onboardingErledigt(profil: WeichenProfil, spalteDa: boolean): boolean {
  return !vereinbarungOffen(profil) && !fragenOffen(profil, spalteDa);
}

/** Konto nach dem Onboarding-Start angelegt → voller Ablauf und Checkliste. */
export function istNeukaeufer(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  return new Date(createdAt).getTime() >= new Date(ONBOARDING_START).getTime();
}

/** PostgREST-Fehler „Spalte gibt es nicht" (Migration fehlt). */
export function spalteFehlt(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /column .* does not exist|could not find .* column/i.test(error.message ?? "")
  );
}
