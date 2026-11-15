import type { SupabaseClient } from "@supabase/supabase-js";
import { GEHEIMHALTUNG_FASSUNG } from "@/config/geheimhaltung";

/**
 * Muss dieses Konto der Geheimhaltungsvereinbarung (aktuelle Fassung) noch
 * zustimmen? Nur zahlende Mitglieder (`is_paid`), nie Admins und nie
 * Free-Mitglieder (Entscheidung Simon, 15.11.2026).
 *
 * Fehlt Migration 116 oder klemmt die Abfrage, gilt „nein": Eine fehlende
 * Tabelle darf nicht alle zahlenden Mitglieder aussperren.
 */
export async function brauchtGeheimhaltung(service: SupabaseClient, userId: string): Promise<boolean> {
  const { data: p } = await service.from("profiles").select("is_paid,is_admin").eq("id", userId).maybeSingle();
  const profil = p as { is_paid: boolean | null; is_admin: boolean | null } | null;
  if (!profil?.is_paid || profil.is_admin) return false;

  const { data, error } = await service
    .from("geheimhaltung_zustimmung")
    .select("id")
    .eq("user_id", userId)
    .eq("fassung", GEHEIMHALTUNG_FASSUNG)
    .maybeSingle();
  if (error) {
    if (!/does not exist|schema cache/i.test(error.message)) console.error("[geheimhaltung]", error.message);
    return false;
  }
  return !data;
}
