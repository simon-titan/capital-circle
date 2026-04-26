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
import {
  buildCourseOrderIndexMap,
  isCourseUnlockedFromMaps,
  isModuleUnlockedFromMaps,
} from "@/lib/progress";
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
  /** Fortschritt des zuletzt angesehenen Videos in % (0–100), auch wenn duration_seconds fehlt. */
  videoProgressPercent: number;
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
  courseIcon: string | null;
  courseAccentColor: string | null;
  /** Zugehoeriger Kurs ist als is_free markiert. */
  courseIsFree: boolean;
  /** Zugriff auf die Modul-Inhalte (is_free ODER is_paid). Fuer Free-Nutzer ist dies false bei Paid-Kursen. */
  hasAccess: boolean;
  thumbnailSignedUrl: string | null;
  /** Sequenzielle Kurskette: vorheriger Kurs vollständig abgeschlossen */
  courseUnlocked: boolean;
  unlocked: boolean;
  /** Admin-Sperre: Modul sichtbar, aber nicht öffnbar */
  isLocked: boolean;
  completed: boolean;
  progressPercent: number;
  videoCount: number;
  totalDurationSeconds: number;
};

/** Free-Kurs (is_free) fuer alle; Paid-Kurs nur mit profiles.is_paid. */
export function userCanAccessAcademyModule(memberIsPaid: boolean, courseIsFree: boolean | null | undefined): boolean {
  return courseIsFree === true || memberIsPaid;
}

/** Trading Journal & Positionsrechner: nur fuer Paid-Mitglieder. */
export function userCanAccessTradingJournal(isPaid: boolean): boolean {
  return isPaid;
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
  let pct = total > 0 ? Math.min(100, Math.round((watched / total) * 100)) : 0;
  // Keine Dauer in der DB (z. B. nach Sync): sonst immer 0 % trotz angesehener Videos
  if (total === 0 && playlist.length > 0) {
    const done = playlist.filter((v) => isPlaylistVideoDone(v, map)).length;
    pct = Math.round((done / playlist.length) * 100);
  }
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
  const lastPlaylistRow = lastVid ? playlist.find((v) => v.id === lastVid) : playlist[0] ?? null;
  const lastVideoDurationSeconds = lastPlaylistRow?.duration_seconds ?? 0;
  const lastVideoStorageKey = lastPlaylistRow?.storage_key ?? null;

  // Video-Fortschritt in % für das zuletzt angesehene Video
  let videoProgressPercent = 0;
  if (lastPlaylistRow) {
    const dur = lastPlaylistRow.duration_seconds ?? 0;
    if (dur > 0) {
      videoProgressPercent = Math.min(100, Math.round((currentSec / dur) * 100));
    } else if (currentSec > 0) {
      // Keine Dauer in DB: als "fertig" markieren wenn isPlaylistVideoDone greift (>= 30s)
      videoProgressPercent = currentSec >= 30 ? 100 : Math.round((currentSec / 30) * 100);
    }
  }

  return {
    videoProgressSeconds: currentSec,
    lastVideoDurationSeconds,
    videoProgressPercent,
    completed: Boolean(row.completed),
    progressPercent: pct,
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

/** Letztes sichtbares Modul mit Videofortschritt (Free/Paid-Filter).
 *  Priorität: nicht-abgeschlossene Module zuerst (nach updated_at), dann abgeschlossene als Fallback.
 */
export async function getLastWatchedModule(userId: string): Promise<LastWatchedModuleData | null> {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("is_paid").eq("id", userId).maybeSingle();
  const memberIsPaid = Boolean(profile?.is_paid);

  const fetchRows = async (completedFilter: boolean) => {
    const { data, error } = await supabase
      .from("user_progress")
      .select(progressModuleSelectExtended)
      .eq("user_id", userId)
      .eq("completed", completedFilter)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(25);

    if (error?.code === "PGRST204") {
      // updated_at oder erweiterte Spalten fehlen noch → Fallback ohne Filter
      const { data: base } = await supabase
        .from("user_progress")
        .select(progressModuleSelect)
        .eq("user_id", userId)
        .gt("video_progress_seconds", 0)
        .order("video_progress_seconds", { ascending: false })
        .limit(25);
      return (base ?? []) as ProgressRowExtended[];
    }
    return (data ?? []) as ProgressRowExtended[];
  };

  const pickFrom = async (rows: ProgressRowExtended[]) => {
    for (const r of rows) {
      const mod = normalizeJoinedModule(r);
      const course = mod?.courses;
      if (!mod || !userCanAccessAcademyModule(memberIsPaid, course?.is_free)) continue;
      return lastWatchedDataFromProgressRow(supabase, r);
    }
    return null;
  };

  // 1. Zuerst: nicht abgeschlossene Module mit Fortschritt
  const inProgress = await fetchRows(false);
  const inProgressWithActivity = inProgress.filter(
    (r) => (r.video_progress_seconds ?? 0) > 0 || r.last_video_id != null,
  );
  const fromInProgress = await pickFrom(inProgressWithActivity);
  if (fromInProgress) return fromInProgress;

  // 2. Fallback: abgeschlossene Module (z. B. wenn alles fertig ist)
  const completed = await fetchRows(true);
  return pickFrom(completed);
}

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/** Erstes freigeschaltetes, nicht abgeschlossenes Modul aus bereits geladenem Academy-Overview (kein zweites getAcademyModulesOverview). */
export async function getRecommendedAcademyModuleFromOverview(
  supabase: ServerSupabase,
  rows: AcademyModuleRow[],
): Promise<RecommendedModuleData | null> {
  const pick = rows.find(
    (r) => r.hasAccess && r.courseUnlocked && r.unlocked && !r.completed && !r.isLocked,
  );
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

/** Erstes freigeschaltetes, nicht abgeschlossenes Modul (Reihenfolge: Kurs, dann order_index). */
export async function getRecommendedAcademyModule(userId: string): Promise<RecommendedModuleData | null> {
  const supabase = await createClient();
  const rows = await getAcademyModulesOverview(userId);
  return getRecommendedAcademyModuleFromOverview(supabase, rows);
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
      `id,title,description,slug,order_index,course_id,thumbnail_storage_key,is_published,is_locked,
      courses ( id, title, slug, created_at, is_free, icon, accent_color, sort_order, is_sequential_exempt )`,
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
    is_locked?: boolean | null;
    courses:
      | {
          id: string;
          title: string;
          slug: string | null;
          created_at: string;
          is_free: boolean | null;
          icon: string | null;
          accent_color: string | null;
          sort_order?: number | null;
          is_sequential_exempt?: boolean | null;
        }
      | null
      | {
          id: string;
          title: string;
          slug: string | null;
          created_at: string;
          is_free: boolean | null;
          icon: string | null;
          accent_color: string | null;
          sort_order?: number | null;
          is_sequential_exempt?: boolean | null;
        }[];
  };
  const raw = (modules ?? []) as unknown as ModRow[];
  const list = raw
    .map((m) => {
      const c = m.courses;
      const course = Array.isArray(c) ? c[0] ?? null : c;
      return { ...m, courses: course };
    })
    // Interne "Nicht zugeordnet"-Kurse nie zeigen (ohne course_id fehlt courses ganz).
    .filter((m) => m.courses && m.courses.slug !== "__unassigned__");

  list.sort((a, b) => {
    const sa = a.courses?.sort_order ?? 0;
    const sb = b.courses?.sort_order ?? 0;
    if (sa !== sb) return sa - sb;
    const ca = new Date(a.courses?.created_at ?? 0).getTime();
    const cb = new Date(b.courses?.created_at ?? 0).getTime();
    if (ca !== cb) return ca - cb;
    if (a.course_id !== b.course_id) return a.course_id.localeCompare(b.course_id);
    return (a.order_index ?? 0) - (b.order_index ?? 0);
  });

  // Versuche mit erweiterten Spalten; falle auf Basis zurück wenn Schema-Cache veraltet (PGRST204)
  let progressRows: { module_id: unknown; completed: boolean | null; video_progress_by_video?: unknown; last_video_id?: unknown }[] = [];
  const { data: extProgresses, error: extProgErr } = await supabase
    .from("user_progress")
    .select("module_id,completed,video_progress_by_video,last_video_id")
    .eq("user_id", userId);
  if (extProgErr?.code === "PGRST204") {
    const { data: baseProgresses } = await supabase
      .from("user_progress")
      .select("module_id,completed")
      .eq("user_id", userId);
    progressRows = (baseProgresses ?? []) as typeof progressRows;
  } else {
    progressRows = (extProgresses ?? []) as typeof progressRows;
  }

  const progByMod = new Map(
    progressRows.map((p) => [
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

  const { data: chainCoursesRows } = await supabase
    .from("courses")
    .select("id,sort_order,is_sequential_exempt,created_at,slug")
    .neq("slug", "__unassigned__");

  const sortedCourses = (chainCoursesRows ?? [])
    .map((c) => ({
      id: c.id as string,
      sort_order: typeof c.sort_order === "number" ? c.sort_order : 0,
      is_sequential_exempt: Boolean(c.is_sequential_exempt),
      created_at: c.created_at as string | undefined,
    }))
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
    });

  const allChainCourseIds = sortedCourses.map((c) => c.id);
  const completionModuleIdsByCourseId = new Map<string, Set<string>>();
  if (allChainCourseIds.length > 0) {
    const { data: publishedModsForCompletion } = await supabase
      .from("modules")
      .select("id,course_id")
      .eq("is_published", true)
      .in("course_id", allChainCourseIds);
    for (const row of publishedModsForCompletion ?? []) {
      const cid = row.course_id as string;
      const mid = row.id as string;
      if (!completionModuleIdsByCourseId.has(cid)) completionModuleIdsByCourseId.set(cid, new Set());
      completionModuleIdsByCourseId.get(cid)!.add(mid);
    }
    for (const cid of allChainCourseIds) {
      if (!completionModuleIdsByCourseId.has(cid)) completionModuleIdsByCourseId.set(cid, new Set());
    }
  }

  const moduleIds = list.map((m) => m.id);
  const playlistByModule = await getModulePublishedPlaylistsBulk(supabase, moduleIds);

  const thumbnailUrls = signThumbnails
    ? await Promise.all(list.map((m) => signThumbnail(m.thumbnail_storage_key)))
    : list.map(() => null);

  const out: AcademyModuleRow[] = [];
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    const courseMeta = m.courses;
    const courseUnlocked = isCourseUnlockedFromMaps(
      {
        id: m.course_id,
        sort_order: courseMeta?.sort_order ?? 0,
        is_sequential_exempt: Boolean(courseMeta?.is_sequential_exempt),
        created_at: courseMeta?.created_at,
      },
      sortedCourses,
      orderIndexToModuleId,
      completedByModuleId,
      completionModuleIdsByCourseId,
    );
    const moduleUnlocked = isModuleUnlockedFromMaps(
      { course_id: m.course_id, order_index: m.order_index },
      orderIndexToModuleId,
      completedByModuleId,
    );
    const unlocked = courseUnlocked && moduleUnlocked;
    const prog = progByMod.get(m.id);
    const completed = Boolean(prog?.completed);
    const playlist = playlistByModule.get(m.id) ?? [];
    const map = parseVideoProgressByVideo(prog?.video_progress_by_video);
    const { pct } = watchedTotalsFromMap(playlist, map);
    const totalDur = totalPlaylistDurationSeconds(playlist);

    const courseIsFree = m.courses?.is_free === true;
    const hasAccess = userCanAccessAcademyModule(memberIsPaid, m.courses?.is_free);

    out.push({
      id: m.id,
      title: m.title,
      description: m.description,
      slug: m.slug,
      courseTitle: m.courses?.title ?? null,
      courseSlug: m.courses?.slug ?? null,
      courseId: m.course_id,
      courseIcon: m.courses?.icon ?? null,
      courseAccentColor: m.courses?.accent_color ?? null,
      courseIsFree,
      hasAccess,
      thumbnailSignedUrl: thumbnailUrls[i] ?? null,
      courseUnlocked,
      unlocked,
      isLocked: Boolean(m.is_locked),
      completed,
      progressPercent: completed ? 100 : pct,
      videoCount: playlist.length,
      totalDurationSeconds: totalDur,
    });
  }

  return out;
}

/** Gesamtfortschritt und Modul-/Video-Kennzahlen für die Welcome-Card — nutzt bestehendes Academy-Overview (ein Bulk-Playlist-Call). */
export async function getWelcomeDashboardMetricsFromOverview(
  userId: string,
  rows: AcademyModuleRow[],
  supabase: ServerSupabase,
): Promise<WelcomeDashboardMetrics> {
  // Fortschritts-Metriken nur ueber Module berechnen, auf die der Nutzer auch Zugriff hat
  // (sonst erscheint ein Free-User mit 0 % auf allen Paid-Modulen).
  const accessibleRows = rows.filter((r) => r.hasAccess);
  const moduleIds = accessibleRows.map((r) => r.id);
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
  let metricsProgressRows: { module_id: unknown; completed: boolean | null; video_progress_by_video?: unknown }[] = [];
  const { data: extMetricsProgresses, error: extMetricsErr } = await supabase
    .from("user_progress")
    .select("module_id,completed,video_progress_by_video")
    .eq("user_id", userId);
  if (extMetricsErr?.code === "PGRST204") {
    const { data: baseMetricsProgresses } = await supabase
      .from("user_progress")
      .select("module_id,completed")
      .eq("user_id", userId);
    metricsProgressRows = (baseMetricsProgresses ?? []) as typeof metricsProgressRows;
  } else {
    metricsProgressRows = (extMetricsProgresses ?? []) as typeof metricsProgressRows;
  }
  const progByMod = new Map(
    metricsProgressRows.map((p) => [
      p.module_id as string,
      p as { completed: boolean | null; video_progress_by_video: unknown },
    ]),
  );

  let sumDur = 0;
  let sumWatched = 0;
  let totalVideos = 0;
  let completedVideos = 0;
  let completedModules = 0;

  for (const r of accessibleRows) {
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

  const modPct = accessibleRows.length > 0 ? Math.round((completedModules / accessibleRows.length) * 100) : 0;
  const vidPct = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
  const overallProgressPercent = accessibleRows.length > 0 || totalVideos > 0 ? Math.round((modPct + vidPct) / 2) : 0;

  return {
    overallProgressPercent,
    completedModules,
    totalModules: accessibleRows.length,
    completedVideos,
    totalVideos,
  };
}

/** Gesamtfortschritt und Modul-/Video-Kennzahlen für die Welcome-Card (Institut). */
export async function getWelcomeDashboardMetrics(userId: string): Promise<WelcomeDashboardMetrics> {
  const rows = await getAcademyModulesOverview(userId, { signThumbnails: false });
  const supabase = await createClient();
  return getWelcomeDashboardMetricsFromOverview(userId, rows, supabase);
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

export async function getPastHomework(): Promise<HomeworkRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("homework")
    .select("*")
    .eq("is_active", false)
    .order("due_date", { ascending: false, nullsFirst: true });

  return (data ?? []) as HomeworkRow[];
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

export type ArsenalCardRow = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  external_url: string | null;
  /** S3 key under covers/ — signed URLs via /api/cover-url */
  logo_storage_key: string | null;
  feature_bullets: unknown;
  position: number;
  sort_order?: number;
  /** Admin: highlight on member Arsenal pages */
  is_featured?: boolean;
  /** Logo strip background: transparent | white | dark */
  logo_bg?: string;
  created_at: string;
};

export async function getArsenalCards(category: "tools" | "fremdkapital"): Promise<ArsenalCardRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("arsenal_cards")
    .select("*")
    .eq("category", category)
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("position", { ascending: true });
  return (data as ArsenalCardRow[] | null) ?? [];
}

export type ArsenalAttachmentListItem = {
  id: string;
  filename: string;
  video_id: string;
  video_title: string;
  module_id: string;
  module_title: string;
  course_id: string;
  course_title: string;
  course_slug: string | null;
  arsenal_category_id: string | null;
  category_name: string | null;
  /** Attachment ist fuer Free-Nutzer freigeschaltet (is_free = true). */
  isFree: boolean;
  /** Aktueller Nutzer darf das Attachment downloaden. */
  hasAccess: boolean;
};

/** Filter- und Anzeige-IDs für PDFs/Templates aus `standalone_attachments` (ohne Video). */
const ARSENAL_STANDALONE_MODULE_ID = "__arsenal_standalone_module__";
const ARSENAL_STANDALONE_VIDEO_ID = "__arsenal_standalone_video__";

export async function getArsenalAttachmentsByKind(kind: "template" | "pdf"): Promise<ArsenalAttachmentListItem[]> {
  const supabase = await createClient();

  // Paid-Status des aktuellen Nutzers ermitteln (Admin zaehlt hier wie Paid).
  const { data: authData } = await supabase.auth.getUser();
  let userIsPaid = false;
  if (authData.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_paid,is_admin")
      .eq("id", authData.user.id)
      .maybeSingle();
    userIsPaid = Boolean(profile?.is_paid) || Boolean(profile?.is_admin);
  }

  const { data: standaloneRows } = await supabase
    .from("standalone_attachments")
    .select("id, filename, category_id, position, is_free")
    .eq("kind", kind)
    .order("position", { ascending: true });

  const standaloneCatIds = [...new Set((standaloneRows ?? []).map((r) => r.category_id).filter(Boolean) as string[])];
  let standaloneCatNameById = new Map<string, string>();
  if (standaloneCatIds.length > 0) {
    const { data: cats } = await supabase.from("arsenal_attachment_categories").select("id, name").in("id", standaloneCatIds);
    standaloneCatNameById = new Map((cats ?? []).map((c) => [c.id as string, c.name as string]));
  }

  const fromStandalone: ArsenalAttachmentListItem[] = (standaloneRows ?? []).map((r) => {
    const aid = r.category_id ?? null;
    const isFree = Boolean((r as { is_free?: boolean | null }).is_free);
    return {
      id: r.id,
      filename: r.filename,
      video_id: ARSENAL_STANDALONE_VIDEO_ID,
      video_title: "Ohne Videozuordnung",
      module_id: ARSENAL_STANDALONE_MODULE_ID,
      module_title: "Eigenständig",
      course_id: ARSENAL_STANDALONE_MODULE_ID,
      course_title: "Arsenal",
      course_slug: null,
      arsenal_category_id: aid,
      category_name: aid ? standaloneCatNameById.get(aid) ?? null : null,
      isFree,
      hasAccess: userIsPaid || isFree,
    };
  });

  const { data: rows, error } = await supabase
    .from("video_attachments")
    .select("id, filename, video_id, arsenal_category_id, is_free")
    .eq("arsenal_kind", kind);
  if (error || !rows?.length) return fromStandalone;

  const catIds = [...new Set(rows.map((r) => (r as { arsenal_category_id?: string | null }).arsenal_category_id).filter(Boolean) as string[])];
  let catNameById = new Map<string, string>();
  if (catIds.length > 0) {
    const { data: cats } = await supabase.from("arsenal_attachment_categories").select("id, name").in("id", catIds);
    catNameById = new Map((cats ?? []).map((c) => [c.id as string, c.name as string]));
  }

  const videoIds = [...new Set(rows.map((r) => r.video_id))];
  const { data: videos } = await supabase
    .from("videos")
    .select("id, title, is_published, module_id")
    .in("id", videoIds);

  const published = (videos ?? []).filter((v) => v.is_published && v.module_id);
  const videoById = new Map(published.map((v) => [v.id, v]));
  const moduleIds = [...new Set(published.map((v) => v.module_id).filter(Boolean) as string[])];

  const { data: modules } = await supabase
    .from("modules")
    .select("id, title, course_id, is_published")
    .in("id", moduleIds);

  const modPublished = (modules ?? []).filter((m) => m.is_published && m.course_id);
  const modMap = new Map(modPublished.map((m) => [m.id, m]));
  const courseIds = [...new Set(modPublished.map((m) => m.course_id).filter(Boolean) as string[])];

  const { data: courses } = await supabase.from("courses").select("id, title, slug, is_free").in("id", courseIds);
  const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));

  const fromVideos: ArsenalAttachmentListItem[] = [];
  for (const r of rows) {
    const v = videoById.get(r.video_id);
    if (!v) continue;
    const mod = v.module_id ? modMap.get(v.module_id) : undefined;
    if (!mod) continue;
    const course = courseMap.get(mod.course_id);
    if (!course) continue;
    const aid = (r as { arsenal_category_id?: string | null }).arsenal_category_id ?? null;
    const attachmentIsFree = Boolean((r as { is_free?: boolean | null }).is_free);
    // Ein Video-Attachment ist fuer Free-Nutzer nur zugaenglich, wenn es explizit is_free ist
    // UND das Parent-Modul zu einem is_free-Kurs gehoert (sonst waere der Kontext Paid).
    const courseIsFree = Boolean((course as { is_free?: boolean | null }).is_free);
    const freeAccessible = attachmentIsFree && courseIsFree;
    fromVideos.push({
      id: r.id,
      filename: r.filename,
      video_id: r.video_id,
      video_title: v.title,
      module_id: mod.id,
      module_title: mod.title,
      course_id: course.id,
      course_title: course.title,
      course_slug: course.slug,
      arsenal_category_id: aid,
      category_name: aid ? catNameById.get(aid) ?? null : null,
      isFree: freeAccessible,
      hasAccess: userIsPaid || freeAccessible,
    });
  }
  return [...fromStandalone, ...fromVideos];
}

export type LiveSessionCategoryRow = {
  id: string;
  title: string;
  position: number;
};

export type LiveSessionListItem = {
  id: string;
  title: string;
  description: string | null;
  recorded_at: string | null;
  thumbnailSignedUrl: string | null;
  category: { id: string; title: string };
  event: { id: string; title: string; start_time: string } | null;
};

export type LiveSessionVideoRow = {
  id: string;
  title: string;
  description: string | null;
  storage_key: string;
  thumbnail_key: string | null;
  thumbnailSignedUrl: string | null;
  duration_seconds: number | null;
  position: number;
  subcategoryId: string | null;
  subcategoryTitle: string | null;
};

export type LiveSessionDetailData = {
  id: string;
  title: string;
  description: string | null;
  recorded_at: string | null;
  thumbnailSignedUrl: string | null;
  category: { id: string; title: string };
  event: { id: string; title: string; start_time: string } | null;
  playlist: LiveSessionVideoRow[];
};

export async function getLiveSessionCategories(): Promise<LiveSessionCategoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("live_session_categories")
    .select("id, title, position")
    .order("position", { ascending: true });
  return (data as LiveSessionCategoryRow[] | null) ?? [];
}

/** @param categoryId null = alle Kategorien */
export async function getLiveSessions(categoryId: string | null): Promise<LiveSessionListItem[]> {
  const supabase = await createClient();
  let q = supabase
    .from("live_sessions")
    .select(
      `
      id,
      title,
      description,
      recorded_at,
      thumbnail_storage_key,
      live_session_categories ( id, title ),
      events ( id, title, start_time )
    `,
    )
    .order("recorded_at", { ascending: false, nullsFirst: false });
  if (categoryId) {
    q = q.eq("category_id", categoryId);
  }
  const { data } = await q;
  const rows =
    (data ?? []) as Array<{
      id: string;
      title: string;
      description: string | null;
      recorded_at: string | null;
      thumbnail_storage_key: string | null;
      live_session_categories:
        | { id: string; title: string }
        | { id: string; title: string }[]
        | null;
      events: { id: string; title: string; start_time: string } | { id: string; title: string; start_time: string }[] | null;
    }>;

  const out: LiveSessionListItem[] = [];
  for (const r of rows) {
    const catRaw = r.live_session_categories;
    const cat = Array.isArray(catRaw) ? catRaw[0] : catRaw;
    if (!cat) continue;
    const thumb = r.thumbnail_storage_key?.trim()
      ? await signThumbnail(r.thumbnail_storage_key)
      : null;
    const evRaw = r.events;
    const ev = Array.isArray(evRaw) ? evRaw[0] : evRaw;
    out.push({
      id: r.id,
      title: r.title,
      description: r.description,
      recorded_at: r.recorded_at,
      thumbnailSignedUrl: thumb,
      category: { id: cat.id, title: cat.title },
      event: ev
        ? { id: ev.id, title: ev.title, start_time: ev.start_time }
        : null,
    });
  }
  return out;
}

export async function getLiveSessionDetail(sessionId: string): Promise<LiveSessionDetailData | null> {
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("live_sessions")
    .select(
      `
      id,
      title,
      description,
      recorded_at,
      thumbnail_storage_key,
      live_session_categories ( id, title ),
      events ( id, title, start_time )
    `,
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return null;

  const { data: subRows } = await supabase
    .from("live_session_subcategories")
    .select("id, title, position")
    .eq("session_id", sessionId)
    .order("position", { ascending: true });

  const { data: vidRows } = await supabase
    .from("live_session_videos")
    .select("id, title, description, storage_key, thumbnail_key, duration_seconds, position, subcategory_id")
    .eq("session_id", sessionId)
    .order("position", { ascending: true });

  type Vid = {
    id: string;
    title: string;
    description: string | null;
    storage_key: string;
    thumbnail_key: string | null;
    duration_seconds: number | null;
    position: number;
    subcategory_id: string | null;
  };

  const videos = (vidRows ?? []) as Vid[];
  const subsOrdered = (subRows ?? []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const playlist: LiveSessionVideoRow[] = [];

  const pushVid = async (v: Vid, subId: string | null, subTitle: string | null) => {
    const thumb = await signThumbnail(v.thumbnail_key);
    playlist.push({
      id: v.id,
      title: v.title,
      description: v.description,
      storage_key: v.storage_key,
      thumbnail_key: v.thumbnail_key,
      thumbnailSignedUrl: thumb,
      duration_seconds: v.duration_seconds,
      position: v.position,
      subcategoryId: subId,
      subcategoryTitle: subTitle,
    });
  };

  const direct = videos.filter((v) => !v.subcategory_id).sort((a, b) => a.position - b.position);
  for (const v of direct) {
    await pushVid(v, null, null);
  }

  for (const sub of subsOrdered) {
    const inSub = videos
      .filter((v) => v.subcategory_id === sub.id)
      .sort((a, b) => a.position - b.position);
    for (const v of inSub) {
      await pushVid(v, sub.id, sub.title as string);
    }
  }

  const s = session as {
    id: string;
    title: string;
    description: string | null;
    recorded_at: string | null;
    thumbnail_storage_key: string | null;
    live_session_categories:
      | { id: string; title: string }
      | { id: string; title: string }[]
      | null;
    events: { id: string; title: string; start_time: string } | { id: string; title: string; start_time: string }[] | null;
  };

  const catRaw = s.live_session_categories;
  const cat = Array.isArray(catRaw) ? catRaw[0] : catRaw;
  const evRaw = s.events;
  const ev = Array.isArray(evRaw) ? evRaw[0] : evRaw;
  const sessionThumb = await signThumbnail(s.thumbnail_storage_key);

  return {
    id: s.id,
    title: s.title,
    description: s.description,
    recorded_at: s.recorded_at,
    thumbnailSignedUrl: sessionThumb,
    category: cat ? { id: cat.id, title: cat.title } : { id: "", title: "" },
    event: ev ? { id: ev.id, title: ev.title, start_time: ev.start_time } : null,
    playlist,
  };
}

export type AnalysisPostRow = {
  id: string;
  title: string;
  /** TipTap JSON (String) oder Legacy-Klartext */
  content: string;
  excerpt: string | null;
  /** Legacy: großes Bild am Beitrag; bei neuen Artikeln oft Cover nutzen */
  image_storage_key: string | null;
  cover_image_storage_key: string | null;
  post_type: string;
  /** Inhaltliches Datum der Analyse (z. B. "Weekly vom 31. März") */
  analysis_date: string | null;
  published_at: string;
  created_at: string;
};

export async function getAnalysisPosts(filter: "weekly" | "daily" | "all"): Promise<AnalysisPostRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("analysis_posts")
    .select("*")
    .order("analysis_date", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false });
  if (filter !== "all") {
    q = q.eq("post_type", filter);
  }
  const { data } = await q;
  return (data as AnalysisPostRow[] | null) ?? [];
}

export async function getAnalysisPostById(id: string): Promise<AnalysisPostRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("analysis_posts").select("*").eq("id", id).maybeSingle();
  return (data as AnalysisPostRow | null) ?? null;
}

// ============================================================
// Capital Circle News
// ============================================================

export type NewsPostRow = {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  cover_image_storage_key: string | null;
  published_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type NewsPostWithCounts = NewsPostRow & {
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  saved_by_me: boolean;
  commented_by_me: boolean;
};

export type NewsCommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author_name: string | null;
  author_avatar_url: string | null;
};

export async function getNewsPosts(): Promise<NewsPostRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news_posts")
    .select("*")
    .order("published_at", { ascending: false });
  return (data as NewsPostRow[] | null) ?? [];
}

export async function getNewsPostById(id: string): Promise<NewsPostRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("news_posts").select("*").eq("id", id).maybeSingle();
  return (data as NewsPostRow | null) ?? null;
}

/**
 * Haengt je Post like_count, comment_count, liked_by_me, saved_by_me, commented_by_me an.
 * Liest die drei Interaktionstabellen parallel und aggregiert clientseitig im Server.
 */
export async function getNewsPostsWithCounts(userId: string | null): Promise<NewsPostWithCounts[]> {
  const supabase = await createClient();
  const [{ data: postsData }, likesRes, commentsRes, savesRes] = await Promise.all([
    supabase.from("news_posts").select("*").order("published_at", { ascending: false }),
    supabase.from("news_likes").select("post_id, user_id"),
    supabase.from("news_comments").select("post_id, user_id"),
    userId
      ? supabase.from("news_saves").select("post_id").eq("user_id", userId)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
  ]);

  const posts = (postsData as NewsPostRow[] | null) ?? [];
  const likes = ((likesRes.data as { post_id: string; user_id: string }[] | null) ?? []);
  const comments = ((commentsRes.data as { post_id: string; user_id: string }[] | null) ?? []);
  const saves = ((savesRes.data as { post_id: string }[] | null) ?? []);

  const likeCountByPost = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const l of likes) {
    likeCountByPost.set(l.post_id, (likeCountByPost.get(l.post_id) ?? 0) + 1);
    if (userId && l.user_id === userId) likedByMe.add(l.post_id);
  }
  const commentCountByPost = new Map<string, number>();
  const commentedByMe = new Set<string>();
  for (const c of comments) {
    commentCountByPost.set(c.post_id, (commentCountByPost.get(c.post_id) ?? 0) + 1);
    if (userId && c.user_id === userId) commentedByMe.add(c.post_id);
  }
  const savedByMe = new Set(saves.map((s) => s.post_id));

  return posts.map<NewsPostWithCounts>((p) => ({
    ...p,
    like_count: likeCountByPost.get(p.id) ?? 0,
    comment_count: commentCountByPost.get(p.id) ?? 0,
    liked_by_me: likedByMe.has(p.id),
    saved_by_me: savedByMe.has(p.id),
    commented_by_me: commentedByMe.has(p.id),
  }));
}

export async function getNewsPostInteractions(postId: string, userId: string | null): Promise<{
  like_count: number;
  liked_by_me: boolean;
  saved_by_me: boolean;
  comments: NewsCommentRow[];
  my_comment: NewsCommentRow | null;
}> {
  const supabase = await createClient();
  const [likesRes, savesRes, commentsRes] = await Promise.all([
    supabase.from("news_likes").select("user_id").eq("post_id", postId),
    userId
      ? supabase.from("news_saves").select("post_id").eq("post_id", postId).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("news_comments")
      .select("id, post_id, user_id, body, created_at, updated_at, profiles:profiles!news_comments_user_id_fkey(full_name, username, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: false }),
  ]);

  const likes = ((likesRes.data as { user_id: string }[] | null) ?? []);
  const like_count = likes.length;
  const liked_by_me = userId ? likes.some((l) => l.user_id === userId) : false;
  const saved_by_me = Boolean((savesRes as { data: unknown }).data);

  type CommentRowRaw = {
    id: string;
    post_id: string;
    user_id: string;
    body: string;
    created_at: string;
    updated_at: string;
    profiles:
      | { full_name: string | null; username: string | null; avatar_url: string | null }
      | { full_name: string | null; username: string | null; avatar_url: string | null }[]
      | null;
  };

  const rawComments = (commentsRes.data as CommentRowRaw[] | null) ?? [];
  const comments: NewsCommentRow[] = rawComments.map((c) => {
    const profileRaw = c.profiles;
    const profile = Array.isArray(profileRaw) ? profileRaw[0] ?? null : profileRaw;
    const name = profile?.full_name?.trim() || profile?.username?.trim() || null;
    return {
      id: c.id,
      post_id: c.post_id,
      user_id: c.user_id,
      body: c.body,
      created_at: c.created_at,
      updated_at: c.updated_at,
      author_name: name,
      author_avatar_url: profile?.avatar_url ?? null,
    };
  });

  const my_comment = userId ? comments.find((c) => c.user_id === userId) ?? null : null;

  return { like_count, liked_by_me, saved_by_me, comments, my_comment };
}

/** Anzahl der Posts, die seit dem last_seen_at des Users veroeffentlicht wurden. */
export async function getUnreadNewsCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data: status } = await supabase
    .from("news_read_status")
    .select("last_seen_at")
    .eq("user_id", userId)
    .maybeSingle();

  const lastSeen = (status as { last_seen_at: string } | null)?.last_seen_at ?? null;

  let q = supabase.from("news_posts").select("id", { count: "exact", head: true });
  if (lastSeen) {
    q = q.gt("published_at", lastSeen);
  }
  const { count } = await q;
  return count ?? 0;
}

