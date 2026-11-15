import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { TeamMitglied } from "./zuweisung";

/**
 * Wer darf ins CRM (`/crm`)? Admins und aktive Mitglieder von `crm_team`
 * (Migration 112). Closer brauchen **keine** Adminrechte — sie sehen nur das
 * CRM. Gelesen und geschrieben wird danach mit dem Service-Client; die Tabellen
 * sind für Konten gesperrt.
 *
 * Team verwalten (Mitglieder, Blöcke) dürfen nur Admins. Kontakte bearbeiten
 * und umverteilen darf jeder im Team (Entscheidung Simon, 07.11.2026).
 */

export type CrmNutzer = {
  user: User;
  istAdmin: boolean;
  /** Eigener Team-Eintrag (fehlt bei Admins, die kein Closer sind). */
  team: TeamMitglied | null;
};

export async function ladeCrmNutzer(): Promise<CrmNutzer | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const service = createServiceClient();
  const [{ data: profil }, { data: team }] = await Promise.all([
    service.from("profiles").select("is_admin").eq("id", user.id).maybeSingle(),
    service.from("crm_team").select("*").eq("user_id", user.id).eq("aktiv", true).maybeSingle(),
  ]);
  const istAdmin = Boolean((profil as { is_admin?: boolean } | null)?.is_admin);
  if (!istAdmin && !team) return null;
  return { user, istAdmin, team: (team as TeamMitglied | null) ?? null };
}

/** Für API-Routen: `{ nutzer, service }` oder eine fertige Fehlerantwort. */
export async function requireCrm(opts: { nurAdmin?: boolean } = {}): Promise<
  { nutzer: CrmNutzer; service: SupabaseClient; error: null } | { nutzer: null; service: null; error: NextResponse }
> {
  const nutzer = await ladeCrmNutzer();
  if (!nutzer) return { nutzer: null, service: null, error: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }) };
  if (opts.nurAdmin && !nutzer.istAdmin) {
    return { nutzer: null, service: null, error: NextResponse.json({ ok: false, error: "nur_admin" }, { status: 403 }) };
  }
  return { nutzer, service: createServiceClient(), error: null };
}

export async function ladeTeam(service: SupabaseClient, auchInaktive = false): Promise<TeamMitglied[]> {
  let q = service.from("crm_team").select("*").order("name");
  if (!auchInaktive) q = q.eq("aktiv", true);
  const { data, error } = await q;
  if (error) {
    if (!/does not exist|schema cache/i.test(error.message)) console.error("[crm] Team nicht lesbar:", error.message);
    return [];
  }
  return (data ?? []) as TeamMitglied[];
}
