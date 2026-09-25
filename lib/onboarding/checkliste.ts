import type { SupabaseClient } from "@supabase/supabase-js";
import { vorstellungsLink } from "@/config/onboarding";
import { protokolliere, stempleProfil, stempleSchritt } from "@/lib/onboarding/server";
import { istNeukaeufer } from "@/lib/onboarding/weiche";

/**
 * Zustand der Start-Checkliste im Dashboard („Dein Start bei Capital Circle").
 *
 * Sichtbar nur für Neukäufer (Konto ab `ONBOARDING_START`), die die Fragen
 * beantwortet und das Onboarding noch nicht abgeschlossen haben. Schritte, die
 * schon erledigt sind, werden hier erkannt und gestempelt — Discord ist
 * verbunden, es gibt schon Lernfortschritt —, damit niemand etwas abhaken muss,
 * das er längst getan hat.
 *
 * Wirft nie: Fehlt Migration 107 oder hakt die Datenbank, gibt es einfach keine
 * Checkliste, und das Dashboard sieht aus wie vorher.
 */
export type ChecklistenZustand = {
  discord: boolean;
  community: boolean;
  /** Link zum Vorstellungskanal wurde schon geöffnet → „Als erledigt markieren" erlaubt. */
  communityLinkGeoeffnet: boolean;
  kurs: boolean;
  passwortOffen: boolean;
  /** Alle drei Hauptschritte erledigt — die Box zeigt „Alles eingerichtet." */
  fertig: boolean;
  vorstellungsLink: string | null;
};

type Profil = {
  is_paid?: boolean | null;
  is_admin?: boolean | null;
  created_at?: string | null;
  onboarding_fragen_am?: string | null;
  onboarding_abgeschlossen_am?: string | null;
  passwort_gesetzt_am?: string | null;
};

export async function ladeCheckliste(
  service: SupabaseClient,
  userId: string,
  profil: Record<string, unknown>,
): Promise<ChecklistenZustand | null> {
  const p = profil as Profil;
  // Spalten aus 107 fehlen im Profil (`select *` liefert sie dann nicht) → keine Checkliste.
  if (!("onboarding_fragen_am" in profil)) return null;
  if (!p.is_paid || p.is_admin) return null;
  if (!istNeukaeufer(p.created_at)) return null;
  if (!p.onboarding_fragen_am || p.onboarding_abgeschlossen_am) return null;

  try {
    const [{ data: zeile, error }, { data: discordZeile }, { data: fortschritt }] = await Promise.all([
      service
        .from("onboarding_antworten")
        .select("discord_verbunden_am,community_link_geoeffnet_am,community_vorgestellt_am,kurs_gestartet_am")
        .eq("user_id", userId)
        .maybeSingle(),
      service.from("discord_connections").select("user_id").eq("user_id", userId).maybeSingle(),
      service.from("user_progress").select("module_id").eq("user_id", userId).limit(1),
    ]);
    if (error) return null;
    const z = (zeile ?? {}) as Record<string, string | null>;

    let discord = Boolean(z.discord_verbunden_am);
    if (!discord && discordZeile) {
      discord = true;
      if (await stempleSchritt(service, userId, "discord_verbunden_am")) {
        await protokolliere(service, userId, "onboarding_discord_connected", { erkannt: "bereits_verbunden" });
      }
    }

    let kurs = Boolean(z.kurs_gestartet_am);
    if (!kurs && (fortschritt?.length ?? 0) > 0) {
      kurs = true;
      if (await stempleSchritt(service, userId, "kurs_gestartet_am")) {
        await protokolliere(service, userId, "onboarding_course_started", { erkannt: "fortschritt_vorhanden" });
      }
    }

    const community = Boolean(z.community_vorgestellt_am);
    return {
      discord,
      community,
      communityLinkGeoeffnet: Boolean(z.community_link_geoeffnet_am),
      kurs,
      passwortOffen: !p.passwort_gesetzt_am,
      fertig: discord && community && kurs,
      vorstellungsLink: vorstellungsLink(),
    };
  } catch (err) {
    console.warn("[onboarding] Checkliste nicht ladbar:", err);
    return null;
  }
}

/** Onboarding abschließen, wenn alle drei Schritte wirklich erledigt sind. */
export async function schliesseAbWennFertig(service: SupabaseClient, userId: string): Promise<boolean> {
  try {
    const { data } = await service
      .from("onboarding_antworten")
      .select("discord_verbunden_am,community_vorgestellt_am,kurs_gestartet_am")
      .eq("user_id", userId)
      .maybeSingle();
    const z = (data ?? {}) as Record<string, string | null>;
    if (!z.discord_verbunden_am || !z.community_vorgestellt_am || !z.kurs_gestartet_am) return false;
    if (await stempleProfil(service, userId, "onboarding_abgeschlossen_am")) {
      await protokolliere(service, userId, "onboarding_completed");
    }
    return true;
  } catch {
    return false;
  }
}
