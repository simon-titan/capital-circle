import type { SupabaseClient } from "@supabase/supabase-js";
import { TRAINING_MODUL_ID } from "@/config/training";
import { getModulePublishedPlaylist, isPlaylistVideoDone } from "@/lib/module-video";
import { parseVideoProgressByVideo } from "@/lib/server-data";

/**
 * Daten für das CRM-Board `/admin/training`: Registrierungen aus dem Free
 * Training mit Videostand, dazu die Analysegespräch-Anfragen (`training_leads`).
 * Nur mit Service-Client aufrufen.
 */

export type TrainingRegistrierung = {
  id: string;
  /** Kanal aus `profiles.funnel_herkunft` (YouTube, Instagram, …). */
  kanal: string;
  utmCampaign: string | null;
  name: string;
  email: string | null;
  registriertAm: string;
  bestaetigt: boolean;
  gesehen: number;
  isPaid: boolean;
  tier: string;
};

export type TrainingLeadZeile = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  stelle: string;
  kanal: string | null;
  answers: Record<string, string>;
  videos_gesehen: number;
  status: string;
  closer: string | null;
  produkt: string | null;
  revenue_cents: number | null;
  notizen: string | null;
  termin_am: string | null;
  gewonnen_am: string | null;
  created_at: string;
};

const MAX_SEITEN = 20;

/** E-Mail und Bestätigung je Konto aus der Auth-Verwaltung (seitenweise). */
export async function ladeAuthInfos(service: SupabaseClient, ids: Set<string>) {
  const map = new Map<string, { email: string | null; bestaetigt: boolean }>();
  for (let seite = 1; seite <= MAX_SEITEN && map.size < ids.size; seite++) {
    const { data, error } = await service.auth.admin.listUsers({ page: seite, perPage: 1000 });
    if (error) break;
    for (const u of data.users) {
      if (ids.has(u.id)) map.set(u.id, { email: u.email ?? null, bestaetigt: Boolean(u.email_confirmed_at) });
    }
    if (data.users.length < 1000) break;
  }
  return map;
}

export async function ladeTrainingBoard(service: SupabaseClient): Promise<{
  registrierungen: TrainingRegistrierung[];
  leads: TrainingLeadZeile[];
  videoAnzahl: number;
}> {
  const [{ data: profile, error: profilFehler }, { data: leads, error: leadFehler }, playlist] = await Promise.all([
    service
      .from("profiles")
      .select("id, full_name, training_registriert_am, is_paid, membership_tier, funnel_herkunft")
      .not("training_registriert_am", "is", null)
      .order("training_registriert_am", { ascending: false })
      .limit(2000),
    service.from("training_leads").select("*").order("created_at", { ascending: false }).limit(2000),
    getModulePublishedPlaylist(service, TRAINING_MODUL_ID).catch(() => []),
  ]);
  if (profilFehler) throw new Error(`Registrierungen nicht lesbar: ${profilFehler.message}`);
  if (leadFehler) throw new Error(`training_leads nicht lesbar: ${leadFehler.message}`);

  const ids = new Set((profile ?? []).map((p) => p.id as string));
  const [authInfos, { data: fortschritt }] = await Promise.all([
    ladeAuthInfos(service, ids),
    ids.size
      ? service
          .from("user_progress")
          .select("user_id, video_progress_by_video")
          .eq("module_id", TRAINING_MODUL_ID)
          .in("user_id", [...ids])
      : Promise.resolve({ data: [] as { user_id: string; video_progress_by_video: unknown }[] }),
  ]);

  const gesehenJe = new Map<string, number>();
  for (const row of fortschritt ?? []) {
    const map = parseVideoProgressByVideo(row.video_progress_by_video);
    let n = 0;
    while (n < playlist.length && isPlaylistVideoDone(playlist[n], map)) n++;
    gesehenJe.set(row.user_id as string, n);
  }

  return {
    registrierungen: (profile ?? []).map((p) => {
      const info = authInfos.get(p.id as string);
      const herkunft = (p.funnel_herkunft ?? null) as { kanal?: string; utm_campaign?: string | null } | null;
      return {
        id: p.id as string,
        kanal: herkunft?.kanal ?? "direkt",
        utmCampaign: herkunft?.utm_campaign ?? null,
        name: ((p.full_name as string | null) ?? "").trim() || "—",
        email: info?.email ?? null,
        registriertAm: p.training_registriert_am as string,
        bestaetigt: info?.bestaetigt ?? false,
        gesehen: gesehenJe.get(p.id as string) ?? 0,
        isPaid: Boolean(p.is_paid),
        tier: String(p.membership_tier ?? "free"),
      };
    }),
    leads: (leads ?? []) as TrainingLeadZeile[],
    videoAnzahl: playlist.length,
  };
}
