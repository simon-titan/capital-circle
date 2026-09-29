import type { SupabaseClient } from "@supabase/supabase-js";

export function isFreeMember(profile: {
  membership_tier?: string | null;
  is_paid?: boolean | null;
} | null): boolean {
  if (!profile) return false;
  return profile.membership_tier === "free" || !profile.is_paid;
}

export function isApprovedFreeMember(profile: {
  membership_tier?: string | null;
  is_paid?: boolean | null;
  application_status?: string | null;
} | null): boolean {
  if (!profile) return false;
  return (
    (profile.membership_tier === "free" || !profile.is_paid) &&
    profile.application_status === "approved"
  );
}

/**
 * Zugang zu bezahlten Inhalten (Institut, Anhänge, Analysen, Quizze,
 * Live-Session-Videos): `profiles.is_paid` oder Admin.
 *
 * Das ist die Regel, nach der das Institut seit jeher entscheidet
 * (`userCanAccessAcademyModule`, `/api/attachment-url`, Sidebar-Schlösser).
 * Dieselbe Regel steckt als `public.hat_zugang()` in der Datenbank
 * (Migration 076) — wer sie hier ändert, ändert sie dort mit.
 *
 * Bewusst nicht `evaluateAccess()` aus `lib/access-control/has-access.ts`: Die
 * Whop-Altkonten stehen auf `membership_tier = 'free'` mit `is_paid = true`
 * und haben über `is_paid` vollen Institutszugang. Auch das Trading Journal
 * gibt seit 29.09.2026 nach dieser Regel frei — mit `evaluateAccess()` flog bis
 * dahin jedes Whop-Konto beim Öffnen des Journals zurück aufs Dashboard.
 */
export function hatInhaltsZugang(profile: {
  is_paid?: boolean | null;
  is_admin?: boolean | null;
} | null | undefined): boolean {
  return Boolean(profile?.is_paid) || Boolean(profile?.is_admin);
}

/**
 * `hatInhaltsZugang()` für Route-Handler, die das Profil noch nicht geladen
 * haben. Liest mit dem Client des Aufrufers — das eigene Profil ist per RLS
 * lesbar. Fehlt es, gibt es keinen Zugang.
 */
export async function ladeInhaltsZugang(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("is_paid,is_admin").eq("id", userId).maybeSingle();
  return hatInhaltsZugang(data as { is_paid: boolean | null; is_admin: boolean | null } | null);
}

/**
 * Live Sessions: sieht dieses Konto nur die freie Kategorie?
 *
 * Bis 19.09.2026 galt allein `isApprovedFreeMember` — Konten ohne Zahlung und
 * ohne Bewerbungsstatus (etwa nach einer beendeten Gast-Kasse) sahen damit alle
 * Kategorien. Seit Migration 076 liefert die Datenbank ihnen die Videos der
 * bezahlten Kategorien nicht mehr aus; ohne die zweite Bedingung stünden sie
 * vor leeren Aufzeichnungen statt vor dem Schloss. Die erste Bedingung bleibt,
 * damit sich für freigeschaltete Free-Mitglieder nichts ändert.
 */
export function liveSessionsNurFrei(profile: {
  membership_tier?: string | null;
  is_paid?: boolean | null;
  is_admin?: boolean | null;
  application_status?: string | null;
} | null): boolean {
  if (!profile) return true;
  return isApprovedFreeMember(profile) || !hatInhaltsZugang(profile);
}
