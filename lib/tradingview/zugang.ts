import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * TradingView-Zugang zum Invite-only-Indikator (Migration 105).
 *
 * Gemeinsame Typen und Regeln für Mitgliederseite, Mitglieder-API, Admin-Queue
 * und Nachtlauf. Freigeschaltet und entzogen wird von Hand auf TradingView —
 * die Tabelle hält nur fest, was zu tun ist und was getan wurde.
 */

export type TvStatus = "angefragt" | "aktiv" | "entzug_offen" | "entzogen";

export type TvZugang = {
  user_id: string;
  tv_benutzername: string;
  status: TvStatus;
  angefragt_am: string;
  freigegeben_am: string | null;
  entzug_angefordert_am: string | null;
  entzogen_am: string | null;
  bearbeitet_von: string | null;
  updated_at: string;
};

export const TV_SPALTEN =
  "user_id,tv_benutzername,status,angefragt_am,freigegeben_am,entzug_angefordert_am,entzogen_am,bearbeitet_von,updated_at";

export const TV_STATUS_LABEL: Record<TvStatus, string> = {
  angefragt: "Angefragt",
  aktiv: "Zugang aktiv",
  entzug_offen: "Entziehen",
  entzogen: "Entzogen",
};

/**
 * TradingView-Benutzernamen: Buchstaben, Ziffern, Unterstrich, Punkt und
 * Bindestrich. Bewusst großzügig — ein zu strenges Muster würde echte Namen
 * abweisen, und ob der Name stimmt, sieht das Team ohnehin beim Freischalten.
 */
const NAME_MUSTER = /^[A-Za-z0-9_.-]{2,40}$/;

export function pruefeTvBenutzername(roh: unknown): { ok: true; name: string } | { ok: false; fehler: string } {
  if (typeof roh !== "string") return { ok: false, fehler: "Bitte deinen TradingView-Benutzernamen eingeben." };
  // Ein vorangestelltes @ aus dem Profil-Link darf mit, gespeichert wird ohne.
  const name = roh.trim().replace(/^@/, "");
  if (!name) return { ok: false, fehler: "Bitte deinen TradingView-Benutzernamen eingeben." };
  if (!NAME_MUSTER.test(name)) {
    return {
      ok: false,
      fehler: "Der Name darf nur Buchstaben, Ziffern, Punkt, Unterstrich und Bindestrich enthalten (2 bis 40 Zeichen).",
    };
  }
  return { ok: true, name };
}

/**
 * PostgREST meldet eine fehlende Tabelle als „does not exist“ oder als
 * Schema-Cache-Fehler. Dann ist Migration 105 noch nicht eingespielt — alle
 * Aufrufer antworten darauf ruhig statt mit einer 500-Kaskade.
 */
export function tabelleFehlt(fehler: { message?: string; code?: string } | null | undefined): boolean {
  if (!fehler) return false;
  return fehler.code === "42P01" || fehler.code === "PGRST205" || /does not exist|schema cache/i.test(fehler.message ?? "");
}

export const MIGRATION_HINWEIS =
  "Die Tabelle „tradingview_zugaenge“ fehlt. Migration 105_tradingview_zugang.sql im Supabase-SQL-Editor einspielen.";

/** Ins Admin-Protokoll. Wirft nie. */
export async function protokolliereTv(
  service: SupabaseClient,
  p: { userId: string; adminId: string | null; aktion: string; alt?: string | null; neu?: string | null; metadata?: Record<string, unknown> },
): Promise<void> {
  try {
    const { error } = await service.from("user_audit_log").insert({
      target_user_id: p.userId,
      admin_user_id: p.adminId,
      action: p.aktion,
      field: "tradingview_zugang",
      old_value: p.alt ?? null,
      new_value: p.neu ?? null,
      metadata: p.metadata ?? null,
    });
    if (error) console.warn(`[tradingview] Protokoll nicht schreibbar (${p.aktion}): ${error.message}`);
  } catch (err) {
    console.warn(`[tradingview] Protokoll nicht schreibbar (${p.aktion}):`, err);
  }
}
