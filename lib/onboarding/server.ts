import type { SupabaseClient } from "@supabase/supabase-js";
import type { OnboardingEreignis } from "@/config/onboarding";

/**
 * Schreibhilfen fürs Onboarding (nur Server, nur mit dem Service-Client).
 *
 * Alles hier ist **Beiwerk**: Ein Messpunkt oder Zeitstempel, der nicht
 * geschrieben werden kann (Migration 107 fehlt, Datenbank kurz weg), darf die
 * aufrufende Route nie scheitern lassen — Discord-Callback, Fortschritt und
 * Passwort laufen weiter wie bisher. Deshalb werfen die Funktionen nie.
 */

type Service = SupabaseClient;

export type SchrittFeld =
  | "discord_verbunden_am"
  | "community_link_geoeffnet_am"
  | "community_vorgestellt_am"
  | "kurs_gestartet_am";

export type ProfilFeld =
  | "onboarding_gestartet_am"
  | "onboarding_fragen_am"
  | "onboarding_abgeschlossen_am"
  | "passwort_gesetzt_am";

/** Messpunkt schreiben; zählt pro Nutzer einmal. */
export async function protokolliere(
  service: Service,
  userId: string,
  art: OnboardingEreignis,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    const { error } = await service
      .from("onboarding_ereignisse")
      .upsert({ user_id: userId, art, meta: meta ?? null }, { onConflict: "user_id,art", ignoreDuplicates: true });
    if (error) console.warn(`[onboarding] Ereignis ${art} nicht gespeichert:`, error.message);
  } catch (err) {
    console.warn(`[onboarding] Ereignis ${art} nicht gespeichert:`, err);
  }
}

/** Legt die Antwortzeile an, falls es sie noch nicht gibt. */
export async function sichereZeile(service: Service, userId: string, bestand?: boolean): Promise<boolean> {
  try {
    const { error } = await service
      .from("onboarding_antworten")
      .upsert(
        { user_id: userId, ...(bestand === undefined ? {} : { bestand }) },
        { onConflict: "user_id", ignoreDuplicates: true },
      );
    if (error) {
      console.warn("[onboarding] Antwortzeile nicht angelegt:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[onboarding] Antwortzeile nicht angelegt:", err);
    return false;
  }
}

/**
 * Checklisten-Schritt stempeln — nur beim ersten Mal (`is null`).
 * Gibt zurück, ob jetzt gestempelt wurde (für den Messpunkt).
 */
export async function stempleSchritt(service: Service, userId: string, feld: SchrittFeld): Promise<boolean> {
  if (!(await sichereZeile(service, userId))) return false;
  try {
    const jetzt = new Date().toISOString();
    const { data, error } = await service
      .from("onboarding_antworten")
      .update({ [feld]: jetzt, updated_at: jetzt })
      .eq("user_id", userId)
      .is(feld, null)
      .select("user_id");
    if (error) {
      console.warn(`[onboarding] ${feld} nicht gestempelt:`, error.message);
      return false;
    }
    return Boolean(data?.length);
  } catch (err) {
    console.warn(`[onboarding] ${feld} nicht gestempelt:`, err);
    return false;
  }
}

/** Profil-Flag setzen — nur beim ersten Mal. */
export async function stempleProfil(service: Service, userId: string, feld: ProfilFeld): Promise<boolean> {
  try {
    const { data, error } = await service
      .from("profiles")
      .update({ [feld]: new Date().toISOString() })
      .eq("id", userId)
      .is(feld, null)
      .select("id");
    if (error) {
      console.warn(`[onboarding] ${feld} nicht gesetzt:`, error.message);
      return false;
    }
    return Boolean(data?.length);
  } catch (err) {
    console.warn(`[onboarding] ${feld} nicht gesetzt:`, err);
    return false;
  }
}

/**
 * Technische Herkunft zum Zeitpunkt der Fragen: UTM, `src` und Verweis aus
 * dem Kaufweg. Nur über die bestehende Verknüpfung `checkout_sessions.user_id`
 * (gesetzt, wenn beim Kasse-Start jemand eingeloggt war) — neue Verknüpfungen
 * zwischen der anonymen Messung und einer Person entstehen hier nicht.
 */
export async function ladeAttribution(service: Service, userId: string): Promise<Record<string, unknown> | null> {
  try {
    const { data: kasse } = await service
      .from("checkout_sessions")
      .select("src,von_pfad,funnel_sitzung,plan,created_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!kasse) return null;
    const k = kasse as Record<string, unknown>;
    let sitzung: Record<string, unknown> | null = null;
    if (typeof k.funnel_sitzung === "string" && k.funnel_sitzung) {
      const { data } = await service
        .from("funnel_sitzungen")
        .select("utm_quelle,utm_medium,utm_kampagne,src,verweis_host,erste_seite,geraet")
        .eq("sitzung", k.funnel_sitzung)
        .maybeSingle();
      sitzung = (data as Record<string, unknown> | null) ?? null;
    }
    return {
      kasse_src: k.src ?? null,
      kasse_von_pfad: k.von_pfad ?? null,
      kasse_plan: k.plan ?? null,
      kasse_am: k.created_at ?? null,
      ...(sitzung ?? {}),
    };
  } catch (err) {
    console.warn("[onboarding] Attribution nicht lesbar:", err);
    return null;
  }
}
