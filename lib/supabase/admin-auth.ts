import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { supabase, user: null, error: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  }
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", authData.user.id).single();
  if (!profile?.is_admin) {
    return { supabase, user: authData.user, error: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }) };
  }
  return { supabase, user: authData.user, error: null };
}

export type AdminRole = "owner" | "admin" | "support" | "editor";
export const ADMIN_ROLES: readonly AdminRole[] = ["owner", "admin", "support", "editor"];
const ADMIN_ROLE_RANK: Record<AdminRole, number> = { editor: 1, support: 2, admin: 3, owner: 4 };

/**
 * Rollen-Check zusätzlich zur bestehenden is_admin-Prüfung (siehe Migration 065).
 *
 * Owner-Fallback: Die Migration vergibt an niemanden automatisch die Rolle 'owner'
 * (geraten wäre ein Sicherheitsrisiko). Solange also GLOBAL noch kein Profil
 * admin_role='owner' hat, wird jeder bestehende is_admin=true-Nutzer wie ein Owner
 * behandelt — sonst könnte sich niemand mehr Zugriff auf die Team-Verwaltung
 * verschaffen, um den ersten echten Owner zu setzen. Sobald ein echter Owner existiert,
 * greift wieder die normale Hierarchie (owner > admin > support > editor); ein
 * is_admin=true-Profil ohne admin_role fällt dann auf 'admin' zurück — denselben
 * Default, den auch das Migrations-Backfill für bestehende Admins vergibt.
 */
export async function requireAdminRole(minRole: AdminRole) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { supabase, user: null, error: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, admin_role")
    .eq("id", authData.user.id)
    .single();

  if (!profile?.is_admin) {
    return { supabase, user: authData.user, error: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }) };
  }

  const { count: ownerCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("admin_role", "owner");

  const effectiveRole: AdminRole = !ownerCount
    ? "owner"
    : ((profile.admin_role as AdminRole | null) ?? "admin");

  if (ADMIN_ROLE_RANK[effectiveRole] < ADMIN_ROLE_RANK[minRole]) {
    return { supabase, user: authData.user, error: NextResponse.json({ ok: false, error: "forbidden_role" }, { status: 403 }) };
  }

  return { supabase, user: authData.user, error: null };
}
