import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Der Schalter für die automatische Rückgewinnungs-Mail
 * (`app/api/cron/reactivation-offers`).
 *
 * Entscheidung Simon, 19.09.2026: Ehemalige werden **vorerst nicht** per Mail
 * beworben, aber alles ist vorbereitet. Der Schalter liegt in `app_settings`
 * (Migration 082 legt ihn auf „aus" an) und wird unter
 * `/api/admin/rueckgewinnung` (PUT) oder mit `npm run rueckgewinnung -- --schalter an`
 * umgelegt.
 *
 * **Fehlt die Zeile oder ist sie nicht lesbar, gilt „aus".** Eine nicht
 * verschickte Werbe-Mail kostet nichts; eine, die niemand wollte, schon.
 */
export const RUECKGEWINNUNG_SCHLUESSEL = "rueckgewinnung_mail";

export async function istRueckgewinnungMailAn(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", RUECKGEWINNUNG_SCHLUESSEL)
    .maybeSingle();
  if (error || !data) return false;
  const wert = (data as { value: { enabled?: unknown } | null }).value;
  return Boolean(wert && typeof wert === "object" && wert.enabled === true);
}

export async function setzeRueckgewinnungMail(
  supabase: SupabaseClient,
  an: boolean,
  vonUserId: string | null,
): Promise<{ ok: boolean; fehler?: string }> {
  const { error } = await supabase
    .from("app_settings")
    .upsert(
      { key: RUECKGEWINNUNG_SCHLUESSEL, value: { enabled: an }, updated_by: vonUserId },
      { onConflict: "key" },
    );
  return error ? { ok: false, fehler: error.message } : { ok: true };
}
