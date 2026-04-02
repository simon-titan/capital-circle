import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  addMinutesToDayMap,
  berlinCalendarDayKey,
  mergeStreakActivityDay,
  parseLearningMinutesByDay,
  parseStreakActivityByDay,
} from "@/lib/learning-daily";
import { getModulePlaylistDurationsOnly } from "@/lib/module-video";
import { calculateStreak, maxPlausibleStreakDays, sanitizeStreakValue } from "@/lib/streak";

type ProgressBody = {
  moduleId: string;
  progressSeconds: number;
  videoId?: string | null;
  videoCompleted?: boolean;
  completed?: boolean;
  quizPassed?: boolean;
  quizLastScore?: number | null;
  videoProgressMap?: Record<string, number>;
};

function asProgressMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n) && n >= 0) out[k] = n;
  }
  return out;
}

function watchedSecondsCapped(playlist: { id: string; duration_seconds: number | null }[], map: Record<string, number>): number {
  let watched = 0;
  for (const v of playlist) {
    const d = v.duration_seconds ?? 0;
    const w = map[v.id] ?? 0;
    watched += Math.min(w, d > 0 ? d : w);
  }
  return watched;
}

/** Spalten-Namen die in der DB möglicherweise noch nicht existieren (ältere Deployments). */
const EXTENDED_COLS = "video_progress_by_video,last_video_id,video_completed,completed,quiz_passed,quiz_last_score,completed_at";
const BASE_COLS = "video_completed,completed,quiz_passed,completed_at";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ProgressBody;

  const userId = authData.user.id;
  const nowIso = new Date().toISOString();
  const moduleId = body.moduleId;

  if (!moduleId) {
    return NextResponse.json({ ok: false, error: "missing_module_id" }, { status: 400 });
  }

  // Versuche erst mit allen erweiterten Spalten zu lesen; falle auf Basis-Spalten zurück
  // wenn Spalten im Schema Cache fehlen (PGRST204 = column not found).
  let existing: Record<string, unknown> | null = null;
  let hasExtendedCols = true;

  const { data: extData, error: extErr } = await supabase
    .from("user_progress")
    .select(EXTENDED_COLS)
    .eq("user_id", userId)
    .eq("module_id", moduleId)
    .maybeSingle();

  if (extErr) {
    if (extErr.code === "PGRST204") {
      // Erweiterte Spalten fehlen noch in der DB — Basis-Fallback
      hasExtendedCols = false;
      console.warn("[progress] extended columns not yet in schema, falling back to base columns");
      const { data: baseData, error: baseErr } = await supabase
        .from("user_progress")
        .select(BASE_COLS)
        .eq("user_id", userId)
        .eq("module_id", moduleId)
        .maybeSingle();
      if (baseErr) {
        console.error("[progress] select base error:", baseErr.code, baseErr.message);
      } else {
        existing = baseData as Record<string, unknown> | null;
      }
    } else {
      console.error("[progress] select error:", extErr.code, extErr.message);
    }
  } else {
    existing = extData as Record<string, unknown> | null;
  }

  const oldMap = asProgressMap(existing?.video_progress_by_video);
  const mergedMap = { ...oldMap };
  if (body.videoProgressMap) {
    for (const [vid, sec] of Object.entries(body.videoProgressMap)) {
      const s = Math.max(0, Math.floor(sec));
      mergedMap[vid] = Math.max(mergedMap[vid] ?? 0, s);
    }
  }
  // NICHT mergedMap[body.videoId] aus progressSeconds setzen: videoId ist oft last_video_id
  // (z. B. nächstes Video nach Abschluss) und progressSeconds gehört dann zum vorherigen Clip —
  // das vergiftete video_progress_by_video und kaskadierte „100%“ für alle Videos.

  let lastVideoId: string | null = (existing?.last_video_id as string | null) ?? null;
  if (body.videoId !== undefined) {
    lastVideoId = body.videoId;
  }

  const video_completed =
    typeof body.videoCompleted === "boolean" ? body.videoCompleted : Boolean(existing?.video_completed);

  // completed darf niemals von true auf false zurückgesetzt werden
  const existingCompleted = Boolean(existing?.completed);
  const completed = existingCompleted || (typeof body.completed === "boolean" ? body.completed : false);

  const quiz_passed = typeof body.quizPassed === "boolean" ? body.quizPassed : Boolean(existing?.quiz_passed);

  let quiz_last_score: number | null =
    typeof existing?.quiz_last_score === "number" ? (existing.quiz_last_score as number) : null;
  if (typeof body.quizLastScore === "number" && Number.isFinite(body.quizLastScore)) {
    quiz_last_score = Math.max(0, Math.min(100, Math.floor(body.quizLastScore)));
  }

  const completed_at = completed
    ? ((existing?.completed_at as string | null | undefined) ?? nowIso)
    : ((existing?.completed_at as string | null | undefined) ?? null);

  // Basis-Payload (immer vorhanden)
  const basePayload: Record<string, unknown> = {
    user_id: userId,
    module_id: moduleId,
    video_progress_seconds: Math.max(0, Math.floor(body.progressSeconds ?? 0)),
    video_completed,
    completed,
    quiz_passed,
    completed_at,
  };

  // Erweiterte Spalten nur hinzufügen wenn sie in der DB existieren
  if (hasExtendedCols) {
    basePayload.quiz_last_score = quiz_last_score;
    basePayload.last_video_id = lastVideoId;
    basePayload.video_progress_by_video = mergedMap;
  }

  const { error: upsertError } = await supabase
    .from("user_progress")
    .upsert(basePayload, { onConflict: "user_id,module_id" });

  if (upsertError) {
    console.error("[progress] upsert error:", upsertError.code, upsertError.message, { userId, moduleId });
    return NextResponse.json({ ok: false, error: upsertError.message }, { status: 500 });
  }

  // Streak & Lernminuten aktualisieren
  const [playlist, profileRes] = await Promise.all([
    getModulePlaylistDurationsOnly(supabase, moduleId),
    supabase
      .from("profiles")
      .select(
        "created_at,streak_current,streak_longest,streak_last_activity,total_learning_minutes,learning_minutes_by_day,streak_activity_by_day",
      )
      .eq("id", userId)
      .single(),
  ]);
  const { data: profile } = profileRes;

  // Delta nur berechnen wenn:
  // 1. Erweiterte Spalten verfügbar sind (sonst kein video_progress_by_video lesbar/schreibbar)
  // 2. Ein bestehender Eintrag existiert UND video_progress_by_video darin gesetzt war
  //    (null = noch nie gesetzt → oldMap wäre {} → beforeWatched = 0 → Doppelzählung)
  // Bei komplett neuem Eintrag (existing === null) ist beforeWatched = 0 korrekt.
  const hasOldProgressMap = hasExtendedCols && (existing === null || existing?.video_progress_by_video != null);
  const beforeWatched = hasOldProgressMap ? watchedSecondsCapped(playlist, oldMap) : 0;
  const afterWatched = hasOldProgressMap ? watchedSecondsCapped(playlist, mergedMap) : 0;
  const deltaSeconds = hasOldProgressMap ? Math.max(0, afterWatched - beforeWatched) : 0;
  const deltaMinutes = Math.floor(deltaSeconds / 60);

  const createdAt = profile?.created_at as string | null | undefined;
  const maxPlausible = maxPlausibleStreakDays(createdAt);
  const safeCurrent = sanitizeStreakValue(profile?.streak_current ?? 0, createdAt);
  const safeLongestStored = sanitizeStreakValue(profile?.streak_longest ?? 0, createdAt);

  const rawNext = calculateStreak(
    profile?.streak_last_activity ? new Date(profile.streak_last_activity as string) : null,
    safeCurrent,
  );
  const streak = Math.min(rawNext, maxPlausible);
  const streak_longest = Math.min(Math.max(streak, safeLongestStored, safeCurrent), maxPlausible);

  const prevByDay = parseLearningMinutesByDay(profile?.learning_minutes_by_day);
  const dayKey = berlinCalendarDayKey(new Date());
  const learning_minutes_by_day =
    deltaMinutes > 0 ? addMinutesToDayMap(prevByDay, dayKey, deltaMinutes) : prevByDay;
  const streak_activity_by_day = mergeStreakActivityDay(
    parseStreakActivityByDay(profile?.streak_activity_by_day),
    dayKey,
  );
  const total_learning_minutes = Math.max(0, (profile?.total_learning_minutes ?? 0) + deltaMinutes);

  await supabase
    .from("profiles")
    .update({
      streak_current: streak,
      streak_longest,
      streak_last_activity: nowIso,
      total_learning_minutes,
      learning_minutes_by_day,
      streak_activity_by_day,
    })
    .eq("id", userId);

  return NextResponse.json({ ok: true });
}
