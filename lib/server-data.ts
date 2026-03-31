import { createClient } from "@/lib/supabase/server";
import { getPresignedGetUrl } from "@/lib/storage";
import {
  getModulePublishedPlaylist,
  getModulePublishedPlaylistsBulk,
  getPrimaryPublishedVideoStorageKey,
  isPlaylistVideoDone,
  totalPlaylistDurationSeconds,
  type PlaylistVideoRow,
} from "@/lib/module-video";
import { buildCourseOrderIndexMap, isModuleUnlockedFromMaps } from "@/lib/progress";
import type { WelcomeDashboardMetrics } from "@/lib/welcome-metrics";
export type { WelcomeDashboardMetrics } from "@/lib/welcome-metrics";

export async function getCurrentUserAndProfile() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return { user, profile };
}

export type LastWatchedModuleData = {
  videoProgressSeconds: number;
  lastVideoDurationSeconds: number;
  completed: boolean;
  progressPercent: number;
  watchedSecondsTotal: number;
  durationSecondsTotal: number;
  lastVideoTitle: string | null;
  /** S3-Key des zuletzt angesehenen Videos (für Dashboard-Vorschau via /api/video-url) */
  lastVideoStorageKey: string | null;
  thumbnailSignedUrl: string | null;
  module: {
    id: string;
    title: string;
    slug: string | null;
    videoDurationSeconds: number | null;
    courseSlug: string | null;
    courseTitle: string | null;
  };
};

export type RecommendedModuleData = {
  module: {
    id: string;
    title: string;
    slug: string | null;
    courseSlug: string | null;
    courseTitle: string | null;
  };
  thumbnailSignedUrl: string | null;
  /** Erstes veröffentlichtes Video im Modul — für Dashboard-Vorschau */
  previewVideoStorageKey: string | null;
  videoCount: number;
  durationSecondsTotal: number;
  progressPercent: number;
};

export type AcademyModuleRow = {
  id: string;
  title: string;
  description: string | null;
  slug: string | null;
  courseTitle: string | null;
  courseSlug: string | null;
  courseId: string;
  thumbnailSignedUrl: string | null;
  unlocked: boolean;
  completed: boolean;
  progressPercent: number;
  videoCount: number;
  totalDurationSeconds: number;
};

/** Free-Kurs (is_free) fuer alle; Paid-Kurs nur mit profiles.is_paid. */
export function userCanAccessAcademyModule(memberIsPaid: boolean, courseIsFree: boolean | null | undefined): boolean {
  return courseIsFree === true || memberIsPaid;
}

export function parseVideoProgressByVideo(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n) && n >= 0) out[k] = n;
  }
  return out;
}

function watchedTotalsFromMap(playlist: PlaylistVideoRow[], map: Record<string, number>) {
  let watched = 0;
  let total = 0;
  for (const v of playlist) {
    const d = v.duration_seconds ?? 0;
    total += d;
    const w = Math.min(map[v.id] ?? 0, d > 0 ? d : Infinity);
    watched += Number.isFinite(w) ? w : 0;
  }
  const pct = total > 0 ? Math.min(100, Math.round((watched / total) * 100)) : 0;
  return { watched, total, pct };
}

async function signThumbnail(key: string | null | undefined): Promise<string | null> {
  if (!key?.trim()) return null;
  try {
    return await getPresignedGetUrl(key.trim());
  } catch {
    return null;
  }
}

type ModuleRow = {
  id: string;
  title: string;
  courses: { slug: string | null; title: string; is_free?: boolean | null } | null;
  videos?: { duration_seconds: number | null }[] | null;
};

const progressModuleSelect = `
  video_progress_seconds,
  completed,
  modules (
    id,
    title,
    courses ( slug, title ),
    videos ( duration_seconds )
  )
`;

const progressModuleSelectWithUpdated = `
  video_progress_seconds,
  completed,
  updated_at,
  modules (
    id,
    title,
    courses ( slug, title ),
    videos ( duration_seconds )
  )
`;

type ProgressJoinRow = {
  video_progress_seconds: number | null;
  completed: boolean | null;
  modules: unknown;
};

type ProgressRowExtended = ProgressJoinRow & {
  last_video_id?: string | null;
  video_progress_by_video?: unknown;
};

const progressModuleSelectExtended = `
  video_progress_seconds,
  completed,
  updated_at,
  last_video_id,
  video_progress_by_video,
  modules (
    id,
    title,
    slug,
    thumbnail_storage_key,
    courses ( slug, title, is_free ),
    videos ( duration_seconds )
  )
`;

function normalizeJoinedModule(
  row: ProgressRowExtended,
): (ModuleRow & { slug?: string | null; thumbnail_storage_key?: string | null }) | null {
  const rawMod = row.modules as
    | (ModuleRow & { slug?: string | null; thumbnail_storage_key?: string | null })
    | Array<ModuleRow & { slug?: string | null; thumbnail_storage_key?: string | null }>;
  const mod = Array.isArray(rawMod) ? rawMod[0] : rawMod;
  return mod ?? null;
}

async function lastWatchedDataFromProgressRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: ProgressRowExtended,
): Promise<LastWatchedModuleData | null> {
  const mod = normalizeJoinedModule(row);
  if (!mod) return null;
  const course = mod.courses;
  const map = parseVideoProgressByVideo(row.video_progress_by_video);
  const playlist = await getModulePublishedPlaylist(supabase, mod.id);
  const { watched, total, pct } = watchedTotalsFromMap(playlist, map);
  const legacySum = mod.videos?.reduce((s, v) => s + (v.duration_seconds ?? 0), 0) ?? 0;
  const durationSecondsTotal = total > 0 ? total : legacySum;
  const lastVid = row.last_video_id;
  let lastVideoTitle: string | null = null;
  if (lastVid) {
    const { data: lv } = await supabase.from("videos").select("title").eq("id", lastVid).maybeSingle();
    lastVideoTitle = lv?.title ?? null;
  }
  const thumbKey = mod.thumbnail_storage_key ?? null;
  const thumbnailSignedUrl = await signThumbnail(thumbKey);
  const currentSec = lastVid ? map[lastVid] ?? row.video_progress_seconds ?? 0 : row.video_progress_seconds ?? 0;
  const lastPlaylistRow = lastVid ? playlist.find((v) => v.id === lastVid) : null;
  const lastVideoDurationSeconds = lastPlaylistRow?.duration_seconds ?? 0;
  const lastVideoStorageKey = lastPlaylistRow?.storage_key ?? null;

  return {
    videoProgressSeconds: currentSec,
    lastVideoDurationSeconds,
    completed: Boolean(row.completed),
    progressPercent: durationSecondsTotal > 0 ? pct : 0,
    watchedSecondsTotal: watched,
    durationSecondsTotal,
    lastVideoTitle,
    lastVideoStorageKey,
    thumbnailSignedUrl,
    module: {
      id: mod.id,
      title: mod.title,
      slug: mod.slug ?? null,
      videoDurationSeconds: durationSecondsTotal > 0 ? durationSecondsTotal : legacySum || null,
      courseSlug: course?.slug ?? null,
      courseTitle: course?.title ?? null,
    },
  };
}

/** Letztes sichtbares Modul mit Videofortschritt (Free/Paid-Filter). */
export async function getLastWatchedModule(userId: string): Promise<LastWatchedModuleData | null> {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("is_paid").eq("id", userId).maybeSingle();
  const memberIsPaid = Boolean(profile?.is_paid);

  const pickFirstVisible = async (orderBy: "updated_at" | "video_progress_seconds") => {
    const base = supabase
      .from("user_progress")
      .select(progressModuleSelectExtended)
      .eq("user_id", userId)
      .or("video_progress_seconds.gt.0,last_video_id.not.is.null")
      .limit(25);
    const { data } =
      orderBy === "updated_at"
        ? await base.order("updated_at", { ascending: false, nullsFirst: false })
        : await base.order("video_progress_seconds", { ascending: false });
    for (const r of (data ?? []) as ProgressRowExtended[]) {
      const mod = normalizeJoinedModule(r);
      const course = mod?.courses;
      if (!mod || !userCanAccessAcademyModule(memberIsPaid, course?.is_free)) continue;
      return lastWatchedDataFromProgressRow(supabase, r);
    }
    return null;
  };

  return (await pickFirstVisible("updated_at")) ?? (await pickFirstVisible("video_progress_seconds"));
}

/** Erstes freigeschaltetes, nicht abgeschlossenes Modul (Reihenfolge: Kurs, dann order_index). */
export async function getRecommendedAcademyModule(userId: string): Promise<RecommendedModuleData | null> {
  const supabase = await createClient();
  const rows = await getAcademyModulesOverview(userId);
  const pick = rows.find((r) => r.unlocked && !r.completed);
  if (!pick) return null;
  const previewVideoStorageKey = await getPrimaryPublishedVideoStorageKey(supabase, pick.id);
  return {
    module: {
      id: pick.id,
      title: pick.title,
      slug: pick.slug,
      courseSlug: pick.courseSlug,
      courseTitle: pick.courseTitle,
    },
    thumbnailSignedUrl: pick.thumbnailSignedUrl,
    previewVideoStorageKey,
    videoCount: pick.videoCount,
    durationSecondsTotal: pick.totalDurationSeconds,
    progressPercent: pick.progressPercent,
  };
}

export async function getAcademyModulesOverview(
  userId: string,
  options?: { signThumbnails?: boolean },
): Promise<AcademyModuleRow[]> {
  const signThumbnails = options?.signThumbnails !== false;
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("is_paid").eq("id", userId).maybeSingle();
  const memberIsPaid = Boolean(profile?.is_paid);

  const { data: modules } = await supabase
    .from("modules")
    .select(
      `id,title,description,slug,order_index,course_id,thumbnail_storage_key,is_published,
      courses ( id, title, slug, created_at, is_free )`,
    )
    .eq("is_published", true);

  type ModRow = {
    id: string;
    title: string;
    description: string | null;
    slug: string | null;
    order_index: number;
    course_id: string;
    thumbnail_storage_key: string | null;
    courses:
      | { id: string; title: string; slug: string | null; created_at: string; is_free: boolean | null }
      | null
      | { id: string; title: string; slug: string | null; created_at: string; is_free: boolean | null }[];
  };
  const raw = (modules ?? []) as unknown as ModRow[];
  const list = raw
    .map((m) => {
      const c = m.courses;
      const course = Array.isArray(c) ? c[0] ?? null : c;
      return { ...m, courses: course };
    })
    .filter((m) => userCanAccessAcademyModule(memberIsPaid, m.courses?.is_free));

  list.sort((a, b) => {
    const ca = new Date(a.courses?.created_at ?? 0).getTime();
    const cb = new Date(b.courses?.created_at ?? 0).getTime();
    if (ca !== cb) return ca - cb;
    if (a.course_id !== b.course_id) return a.course_id.localeCompare(b.course_id);
    return (a.order_index ?? 0) - (b.order_index ?? 0);
  });

  const { data: progresses } = await supabase
    .from("user_progress")
    .select("module_id,completed,video_progress_by_video,last_video_id")
    .eq("user_id", userId);
  const progByMod = new Map(
    (progresses ?? []).map((p) => [
      p.module_id as string,
      p as { completed: boolean | null; video_progress_by_video: unknown },
    ]),
  );

  const completedByModuleId = new Map<string, boolean>();
  for (const [id, p] of progByMod) {
    completedByModuleId.set(id, Boolean(p.completed));
  }

  const courseIds = [...new Set(list.map((m) => m.course_id))];
  const { data: chainMods } = await supabase.from("modules").select("id,course_id,order_index").in("course_id", courseIds);
  const orderIndexToModuleId = buildCourseOrderIndexMap((chainMods ?? []) as { id: string; course_id: string; order_index: number }[]);

  const moduleIds = list.map((m) => m.id);
  const playlistByModule = await getModulePublishedPlaylistsBulk(supabase, moduleIds);

  const thumbnailUrls = signThumbnails
    ? await Promise.all(list.map((m) => signThumbnail(m.thumbnail_storage_key)))
    : list.map(() => null);

  const out: AcademyModuleRow[] = [];
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    const unlocked = isModuleUnlockedFromMaps(
      { course_id: m.course_id, order_index: m.order_index },
      orderIndexToModuleId,
      completedByModuleId,
    );
    const prog = progByMod.get(m.id);
    const completed = Boolean(prog?.completed);
    const playlist = playlistByModule.get(m.id) ?? [];
    const map = parseVideoProgressByVideo(prog?.video_progress_by_video);
    const { pct } = watchedTotalsFromMap(playlist, map);
    const totalDur = totalPlaylistDurationSeconds(playlist);

    out.push({
      id: m.id,
      title: m.title,
      description: m.description,
      slug: m.slug,
      courseTitle: m.courses?.title ?? null,
      courseSlug: m.courses?.slug ?? null,
      courseId: m.course_id,
      thumbnailSignedUrl: thumbnailUrls[i] ?? null,
      unlocked,
      completed,
      progressPercent: completed ? 100 : pct,
      videoCount: playlist.length,
      totalDurationSeconds: totalDur,
    });
  }

  return out;
}

/** Gesamtfortschritt und Modul-/Video-Kennzahlen für die Welcome-Card (Institut). */
export async function getWelcomeDashboardMetrics(userId: string): Promise<WelcomeDashboardMetrics> {
  const rows = await getAcademyModulesOverview(userId, { signThumbnails: false });
  const supabase = await createClient();
  const moduleIds = rows.map((r) => r.id);
  if (moduleIds.length === 0) {
    return {
      overallProgressPercent: 0,
      completedModules: 0,
      totalModules: 0,
      completedVideos: 0,
      totalVideos: 0,
    };
  }

  const playlistByModule = await getModulePublishedPlaylistsBulk(supabase, moduleIds);
  const { data: progresses } = await supabase
    .from("user_progress")
    .select("module_id,completed,video_progress_by_video")
    .eq("user_id", userId);
  const progByMod = new Map(
    (progresses ?? []).map((p) => [
      p.module_id as string,
      p as { completed: boolean | null; video_progress_by_video: unknown },
    ]),
  );

  let sumDur = 0;
  let sumWatched = 0;
  let totalVideos = 0;
  let completedVideos = 0;
  let completedModules = 0;

  for (const r of rows) {
    const playlist = playlistByModule.get(r.id) ?? [];
    const map = parseVideoProgressByVideo(progByMod.get(r.id)?.video_progress_by_video);
    const { watched, total } = watchedTotalsFromMap(playlist, map);
    sumDur += total;
    sumWatched += watched;
    totalVideos += playlist.length;
    for (const v of playlist) {
      if (isPlaylistVideoDone(v, map)) completedVideos++;
    }
    if (r.completed) completedModules++;
  }

  const overallProgressPercent = sumDur > 0 ? Math.min(100, Math.round((sumWatched / sumDur) * 100)) : 0;

  return {
    overallProgressPercent,
    completedModules,
    totalModules: rows.length,
    completedVideos,
    totalVideos,
  };
}

export type HomeworkRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  week_number: number | null;
  is_active: boolean | null;
  link: string | null;
  link_label: string | null;
};

export async function getActiveHomework(): Promise<HomeworkRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("homework")
    .select("*")
    .eq("is_active", true)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  return data as HomeworkRow | null;
}

export type HomeworkCustomTaskRow = {
  id: string;
  title: string;
  notes: string | null;
  done: boolean;
  sort_order: number;
};

/** Fortschritt & eigene Aufgaben für die Dashboard-Wochenaufgabe (Tabellen `homework_user_*`). */
export async function getHomeworkDashboardState(
  userId: string,
  homework: HomeworkRow | null,
): Promise<{ officialDone: boolean; customTasks: HomeworkCustomTaskRow[] }> {
  const supabase = await createClient();
  if (!homework) {
    const { data } = await supabase
      .from("homework_user_custom_tasks")
      .select("id, title, notes, done, sort_order")
      .eq("user_id", userId)
      .is("homework_id", null)
      .order("sort_order", { ascending: true });
    return { officialDone: false, customTasks: (data ?? []) as HomeworkCustomTaskRow[] };
  }

  const [officialRes, tasksRes] = await Promise.all([
    supabase
      .from("homework_user_official_done")
      .select("done")
      .eq("user_id", userId)
      .eq("homework_id", homework.id)
      .maybeSingle(),
    supabase
      .from("homework_user_custom_tasks")
      .select("id, title, notes, done, sort_order")
      .eq("user_id", userId)
      .eq("homework_id", homework.id)
      .order("sort_order", { ascending: true }),
  ]);

  return {
    officialDone: Boolean(officialRes.data?.done),
    customTasks: (tasksRes.data ?? []) as HomeworkCustomTaskRow[],
  };
}

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  event_type: string | null;
  color?: string | null;
  external_url?: string | null;
};

export async function getUpcomingEvents(limit: number): Promise<EventRow[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("events")
    .select("id,title,description,start_time,end_time,event_type,color,external_url")
    .gte("start_time", now)
    .order("start_time", { ascending: true })
    .limit(limit);

  return (data as EventRow[] | null) ?? [];
}

export async function getCompletedModulesCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("user_progress")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("completed", true);

  if (error) return 0;
  return count ?? 0;
}

/** Volle Tage seit Profil-Erstellung (Mitgliedschaft). */
export function getMemberDays(createdAtIso: string | null | undefined): number {
  if (!createdAtIso) return 0;
  const created = new Date(createdAtIso);
  const today = new Date();
  const start = new Date(created.getFullYear(), created.getMonth(), created.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function formatLearningTime(totalMinutes: number | null | undefined): { hours: number; minutes: number; label: string } {
  const m = Math.max(0, totalMinutes ?? 0);
  const hours = Math.floor(m / 60);
  const minutes = m % 60;
  const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return { hours, minutes, label };
}
