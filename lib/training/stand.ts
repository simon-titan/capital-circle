import type { SupabaseClient } from "@supabase/supabase-js";
import { TRAINING_MODUL_ID, TRAINING_VIDEO_ANZAHL } from "@/config/training";
import { getModulePublishedPlaylist, isPlaylistVideoDone, type PlaylistVideoRow } from "@/lib/module-video";
import { parseVideoProgressByVideo } from "@/lib/server-data";

/**
 * Wo steht ein Konto im kostenlosen Training?
 *
 * Die Videos liegen als Playlist im festen Modul (Migration 109), der
 * Fortschritt in `user_progress.video_progress_by_video` — dieselbe Quelle und
 * dieselbe 90-%-Regel wie im Kursplayer, damit Haken hier und dort gleich sind.
 */
export type TrainingsStand = {
  /** Hochgeladene, veröffentlichte Videos (0–n). */
  videos: PlaylistVideoRow[];
  /** Fertig angesehen, in Reihenfolge. */
  fertig: boolean[];
  /** Anzahl fertig gesehener Videos. */
  gesehen: number;
  /** Erwartete Gesamtzahl (mindestens TRAINING_VIDEO_ANZAHL). */
  gesamt: number;
  /** Alle erwarteten Videos hochgeladen **und** gesehen. */
  abgeschlossen: boolean;
  /** 1-basierte Nummer des nächsten offenen Videos (gesamt + 1 = fertig). */
  naechstes: number;
  progressMap: Record<string, number>;
  lastVideoId: string | null;
};

export async function ladeTrainingsStand(supabase: SupabaseClient, userId: string): Promise<TrainingsStand> {
  const [videos, { data: progress }] = await Promise.all([
    getModulePublishedPlaylist(supabase, TRAINING_MODUL_ID).catch(() => [] as PlaylistVideoRow[]),
    supabase
      .from("user_progress")
      .select("video_progress_by_video,last_video_id")
      .eq("user_id", userId)
      .eq("module_id", TRAINING_MODUL_ID)
      .maybeSingle(),
  ]);

  const progressMap = parseVideoProgressByVideo(progress?.video_progress_by_video);
  const fertig = videos.map((v) => isPlaylistVideoDone(v, progressMap));
  // Nur die zusammenhängende Strecke von vorn zählt — so wie der Player freischaltet.
  let gesehen = 0;
  while (gesehen < fertig.length && fertig[gesehen]) gesehen++;
  const gesamt = Math.max(TRAINING_VIDEO_ANZAHL, videos.length);

  return {
    videos,
    fertig,
    gesehen,
    gesamt,
    abgeschlossen: videos.length >= TRAINING_VIDEO_ANZAHL && gesehen >= videos.length,
    naechstes: gesehen + 1,
    progressMap,
    lastVideoId: (progress?.last_video_id as string | null) ?? null,
  };
}
