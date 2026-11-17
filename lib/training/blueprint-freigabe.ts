import type { SupabaseClient } from "@supabase/supabase-js";
import { ladeTrainingsStand } from "./stand";

/**
 * Trading Blueprint erst nach dem kompletten kostenlosen Kurs (Feedback Simon
 * 14.11.2026). „Komplett" = `TrainingsStand.abgeschlossen` (alle Pflichtvideos
 * nach der 90-%-Regel, Video 2 ist optional). Zahlende und Admins sind nie
 * gesperrt.
 *
 * Geprüft in `/trading-blueprint` (Seite zeigt dann den Sperrhinweis statt
 * Download und Video) und in `/api/trading-blueprint/download`. Dashboard und
 * Bonus-Karte zeigen den Zustand nur an.
 */
export type BlueprintFreigabe = { frei: true } | { frei: false; gesehen: number; gesamt: number };

export async function ladeBlueprintFreigabe(supabase: SupabaseClient, userId: string): Promise<BlueprintFreigabe> {
  const { data: profil } = await supabase.from("profiles").select("is_paid,is_admin").eq("id", userId).maybeSingle();
  if (profil?.is_paid || profil?.is_admin) return { frei: true };
  const stand = await ladeTrainingsStand(supabase, userId);
  return stand.abgeschlossen ? { frei: true } : { frei: false, gesehen: stand.gesehen, gesamt: stand.gesamt };
}
