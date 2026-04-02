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
  /** Wenn gesetzt, überschreibt video_completed; sonst bleibt bestehender Wert */
  videoCompleted?: boolean;
  /** Modul vollständig abgeschlossen (z. B. nach Quiz) */
  completed?: boolean;
  quizPassed?: boolean;
  /** Letzter Test-Score (0–100), z. B. für Sidebar „Nicht bestanden“ */
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

  const { data: existing } = await supabase
    .from("user_progress")
    .select("video_progress_by_video,last_video_id,video_completed,completed,quiz_passed,quiz_last_score,completed_at")
    .eq("user_id", userId)
    .eq("module_id", moduleId)
    .maybeSingle();

  const oldMap = asProgressMap(existing?.video_progress_by_video);
  const mergedMap = { ...oldMap };
  if (body.videoProgressMap) {
    for (const [vid, sec] of Object.entries(body.videoProgressMap)) {
      const s = Math.max(0, Math.floor(sec));
      mergedMap[vid] = Math.max(mergedMap[vid] ?? 0, s);
    }
  }
  if (body.videoId) {
    const s = Math.max(0, Math.floor(body.progressSeconds ?? 0));
    mergedMap[body.videoId] = Math.max(mergedMap[body.videoId] ?? 0, s);
  }

  let lastVideoId: string | null = (existing?.last_video_id as string | null) ?? null;
  if (body.videoId !== undefined) {
    lastVideoId = body.videoId;
  }

  const video_completed =
    typeof body.videoCompleted === "boolean" ? body.videoCompleted : Boolean(existing?.video_completed);

  const completed = typeof body.completed === "boolean" ? body.completed : Boolean(existing?.completed);

  const quiz_passed = typeof body.quizPassed === "boolean" ? body.quizPassed : Boolean(existing?.quiz_passed);

  let quiz_last_score: number | null =
    typeof existing?.quiz_last_score === "number" ? existing.quiz_last_score : null;
  if (typeof body.quizLastScore === "number" && Number.isFinite(body.quizLastScore)) {
    quiz_last_score = Math.max(0, Math.min(100, Math.floor(body.quizLastScore)));
  }

  const completed_at = completed
    ? ((existing?.completed_at as string | null | undefined) ?? nowIso)
    : ((existing?.completed_at as string | null | undefined) ?? null);

  await supabase.from("user_progress").upsert(
    {
      user_id: userId,
      module_id: moduleId,
      video_progress_seconds: Math.max(0, Math.floor(body.progressSeconds ?? 0)),
      video_completed,
      completed,
      quiz_passed,
      quiz_last_score,
      completed_at,
      last_video_id: lastVideoId,
      video_progress_by_video: mergedMap,
      updated_at: nowIso,
    },
    { onConflict: "user_id,module_id" },
  );

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

  const beforeWatched = watchedSecondsCapped(playlist, oldMap);
  const afterWatched = watchedSecondsCapped(playlist, mergedMap);
  const deltaSeconds = Math.max(0, afterWatched - beforeWatched);
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
