import { NextResponse, type NextRequest } from "next/server";
import {
  MAIL_SEQUENZ,
  PROGRAMME_PFAD,
  TRAINING_MODUL_ID,
  TRAINING_VIDEO_ANZAHL,
  TRAINING_VIDEOS_PFAD,
  mailStufen,
} from "@/config/training";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { abmeldeUrl } from "@/lib/email/abmeldung";
import { sendTrainingErinnerung, type TrainingMailArt } from "@/lib/email/templates/training";
import { getModulePublishedPlaylist, isPlaylistVideoDone } from "@/lib/module-video";
import { parseVideoProgressByVideo } from "@/lib/server-data";
import { getAppUrl } from "@/lib/site-url";
import { createServiceClient } from "@/lib/supabase/service";
import { ladeAuthInfos } from "@/lib/training/board";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron: Mailstrecke des Free Trainings (ersetzt `free-course-sequence`).
 * Stufen und Zeitpunkte in `config/training.ts` (`mailStufen`).
 *
 * Empfänger: über `/training` registriert (letzte 30 Tage), Adresse bestätigt,
 * nicht zahlend, nicht abgemeldet. Je Lauf höchstens **eine** Mail pro Person —
 * die erste fällige, noch nicht verschickte Stufe. Genau einmal je Stufe über
 * `email_sequence_log` (sequence `training`).
 *
 * Erinnerungen ans nächste Video gehen nur raus, wenn es hochgeladen ist —
 * solange die Videos fehlen, bleibt der Lauf still.
 *
 * Auth: Bearer $CRON_SECRET (fail-closed, `isAuthorizedCron`).
 */
const MAX_JE_LAUF = 200;
const TAG_MS = 86_400_000;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const playlist = await getModulePublishedPlaylist(service, TRAINING_MODUL_ID).catch(() => []);
  if (playlist.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, uebersprungen: "Noch keine Trainingsvideos hochgeladen." });
  }

  const { data: profile, error } = await service
    .from("profiles")
    .select("id, full_name, training_registriert_am, is_paid, unsubscribed_at")
    .not("training_registriert_am", "is", null)
    .eq("is_paid", false)
    .is("unsubscribed_at", null)
    .gte("training_registriert_am", new Date(Date.now() - 30 * TAG_MS).toISOString())
    .limit(2000);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!profile?.length) return NextResponse.json({ ok: true, sent: 0 });

  const ids = profile.map((p) => p.id as string);
  const [auth, { data: fortschritt }, { data: log }] = await Promise.all([
    ladeAuthInfos(service, new Set(ids)),
    service
      .from("user_progress")
      .select("user_id, video_progress_by_video")
      .eq("module_id", TRAINING_MODUL_ID)
      .in("user_id", ids),
    service.from("email_sequence_log").select("user_id, step").eq("sequence", MAIL_SEQUENZ).in("user_id", ids),
  ]);

  const gesendet = new Map<string, Set<number>>();
  for (const l of log ?? []) {
    const id = l.user_id as string;
    if (!gesendet.has(id)) gesendet.set(id, new Set());
    gesendet.get(id)!.add(l.step as number);
  }
  const mapJe = new Map(
    (fortschritt ?? []).map((f) => [f.user_id as string, parseVideoProgressByVideo(f.video_progress_by_video)]),
  );

  const appUrl = getAppUrl();
  let sent = 0;
  let fehler = 0;

  for (const p of profile) {
    if (sent >= MAX_JE_LAUF) break;
    const id = p.id as string;
    const info = auth.get(id);
    if (!info?.email || !info.bestaetigt) continue;

    const map = mapJe.get(id) ?? {};
    let gesehen = 0;
    while (gesehen < playlist.length && isPlaylistVideoDone(playlist[gesehen], map)) gesehen++;
    const abgeschlossen = playlist.length >= TRAINING_VIDEO_ANZAHL && gesehen >= playlist.length;
    const naechstes = gesehen + 1;
    const naechstesDa = naechstes <= playlist.length;
    const tage = (Date.now() - new Date(p.training_registriert_am as string).getTime()) / TAG_MS;
    const schon = gesendet.get(id) ?? new Set<number>();

    // Erste fällige, noch nicht verschickte Stufe.
    const kandidaten: { art: TrainingMailArt; schritt: number; faellig: boolean }[] = abgeschlossen
      ? [
          {
            art: "naechsterSchritt",
            schritt: mailStufen.naechsterSchritt.schritt,
            faellig: tage >= mailStufen.naechsterSchritt.abTag,
          },
        ]
      : [
          { art: "start", schritt: mailStufen.start.schritt, faellig: gesehen === 0 && tage >= mailStufen.start.abTag },
          { art: "weiter", schritt: mailStufen.weiter.schritt, faellig: naechstesDa && tage >= mailStufen.weiter.abTag },
          { art: "letzte", schritt: mailStufen.letzte.schritt, faellig: naechstesDa && tage >= mailStufen.letzte.abTag },
        ];
    const stufe = kandidaten.find((k) => k.faellig && !schon.has(k.schritt));
    if (!stufe) continue;

    try {
      const r = await sendTrainingErinnerung({
        an: info.email,
        userId: id,
        art: stufe.art,
        schritt: stufe.schritt,
        props: {
          vorname: ((p.full_name as string | null) ?? "").trim().split(/\s+/)[0] || "du",
          naechstesVideo: Math.min(naechstes, TRAINING_VIDEO_ANZAHL),
          trainingUrl: `${appUrl}${TRAINING_VIDEOS_PFAD}`,
          programmeUrl: `${appUrl}${PROGRAMME_PFAD}`,
          unsubscribeUrl: abmeldeUrl({ userId: id, email: info.email }),
        },
      });
      if (!r.skipped) sent++;
    } catch (err) {
      fehler++;
      console.error(`[cron/training-sequence] Mail an ${id} fehlgeschlagen:`, err);
    }
  }

  return NextResponse.json({ ok: true, sent, fehler });
}
