import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Der Zahlungsaufschub, und die Stellen, an denen er wirkt.
 *
 * Übernommen aus MoonTrading. Die Datei ist klein und liegt weit unten, weil
 * sie aus zwei Richtungen gelesen wird, die sich sonst nichts zu sagen haben:
 * aus `lib/discord/mitgliedschaft.ts` (Stripe-Webhook) und aus
 * `lib/admin/zahlungsfaelle.ts` (hinter der Adminprüfung).
 *
 * ── Die Regel in einem Satz ─────────────────────────────────────────────────
 *
 * **Ein laufender Aufschub verhindert einen Entzug. Mehr nicht.** Er löst
 * nichts aus und schaltet nichts frei; wer keinen Zugang hat, bekommt durch
 * einen Aufschub keinen. (Den Zugang selbst verlängert der Admin beim
 * Gewähren über `access_until`, weil in Capital Circle das Datum die Schranke
 * ist — siehe `gewaehreAufschub`.)
 *
 * Das ist die vorsichtige Richtung: Ein Fehler in dieser Datei lässt jemanden
 * ein paar Tage länger drin, statt jemanden hinauszuwerfen, der bezahlt hat.
 */

export type ZahlungsfallStatus = "offen" | "aufschub" | "bezahlt" | "beendet";

export interface LaufenderAufschub {
  fallId: string;
  bis: string;
  grund: string | null;
}

/**
 * Läuft für diese Person gerade ein Aufschub?
 *
 * Gefragt wird nach dem Zeitpunkt, nicht nur nach dem Status: Zwischen dem
 * Ablauf und dem Nachtlauf, der ihn beendet, liegen bis zu 24 Stunden.
 *
 * **Wirft nie.** Bei einem Fehler lautet die Antwort „kein Aufschub" — im
 * Zweifel gilt, was der Vertrag sagt. Fehlt die Tabelle, weil Migration 080
 * noch nicht eingespielt ist, steht hier PGRST205, und die richtige Antwort
 * darauf ist ebenfalls „kein Aufschub", nicht ein Ausfall des Webhooks.
 */
export async function laufenderAufschub(
  supabase: SupabaseClient,
  userId: string,
): Promise<LaufenderAufschub | null> {
  try {
    const { data, error } = await supabase
      .from("zahlungsfall")
      .select("id,aufschub_bis,aufschub_grund")
      .eq("user_id", userId)
      .eq("status", "aufschub")
      .gt("aufschub_bis", new Date().toISOString())
      .order("aufschub_bis", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn(`[aufschub] nicht prüfbar (user=${userId}): ${error.code ?? ""} ${error.message}`);
      return null;
    }
    if (!data) return null;

    const zeile = data as { id: string; aufschub_bis: string | null; aufschub_grund: string | null };
    if (!zeile.aufschub_bis) return null;

    return { fallId: zeile.id, bis: zeile.aufschub_bis, grund: zeile.aufschub_grund };
  } catch (err) {
    console.warn(`[aufschub] nicht prüfbar (user=${userId}):`, err);
    return null;
  }
}

/** Nur zur Anzeige: „noch 18 Tage". Negativ heisst überfällig. */
export function tageBis(iso: string, jetzt: number): number {
  return Math.ceil((new Date(iso).getTime() - jetzt) / 86400000);
}
