import { createClient } from "@/lib/supabase/server";

/** Vorgänger-Modul-ID: größter order_index kleiner als current (Lücken in der Reihe erlaubt). */
function previousModuleIdFromOrderedIndices(
  courseMap: Map<number, string>,
  orderIndex: number,
): string | undefined {
  const sorted = [...courseMap.keys()].sort((a, b) => a - b);
  const pos = sorted.indexOf(orderIndex);
  if (pos <= 0) return undefined;
  const prevOrder = sorted[pos - 1]!;
  return courseMap.get(prevOrder);
}

export async function isModuleUnlocked(userId: string, moduleId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: currentModule } = await supabase
    .from("modules")
    .select("id,course_id,order_index")
    .eq("id", moduleId)
    .single();
  if (!currentModule) return false;

  const { data: siblings } = await supabase
    .from("modules")
    .select("id,order_index")
    .eq("course_id", currentModule.course_id);

  const courseMap = new Map<number, string>();
  for (const row of siblings ?? []) {
    const oi = row.order_index;
    if (typeof oi === "number") courseMap.set(oi, row.id as string);
  }

  const sortedOrders = [...courseMap.keys()].sort((a, b) => a - b);
  const minOrder = sortedOrders.length ? sortedOrders[0]! : currentModule.order_index;
  // Erstes Modul im Kurs (kleinster order_index) — deckt auch Legacy order_index 0 ab
  if (currentModule.order_index === minOrder) return true;

  const prevId = previousModuleIdFromOrderedIndices(courseMap, currentModule.order_index);
  if (!prevId) return false;

  const { data: previousProgress } = await supabase
    .from("user_progress")
    .select("completed")
    .eq("user_id", userId)
    .eq("module_id", prevId)
    .maybeSingle();

  return Boolean(previousProgress?.completed);
}

/** course_id → (order_index → module_id) — für Batch-Freischaltung ohne N+1. */
export function buildCourseOrderIndexMap(
  modules: Array<{ id: string; course_id: string; order_index: number }>,
): Map<string, Map<number, string>> {
  const m = new Map<string, Map<number, string>>();
  for (const row of modules) {
    if (!m.has(row.course_id)) m.set(row.course_id, new Map());
    m.get(row.course_id)!.set(row.order_index, row.id);
  }
  return m;
}

/** Gleiche Regeln wie isModuleUnlocked, rein aus Maps (ohne DB-Roundtrip). */
export function isModuleUnlockedFromMaps(
  module: { course_id: string; order_index: number },
  orderIndexToModuleId: Map<string, Map<number, string>>,
  completedByModuleId: Map<string, boolean>,
): boolean {
  const courseMap = orderIndexToModuleId.get(module.course_id);
  if (!courseMap || courseMap.size === 0) return true;

  const sortedOrders = [...courseMap.keys()].sort((a, b) => a - b);
  const minOrder = sortedOrders[0]!;
  if (module.order_index === minOrder) return true;

  const prevId = previousModuleIdFromOrderedIndices(courseMap, module.order_index);
  if (!prevId) return false;
  return Boolean(completedByModuleId.get(prevId));
}

/** Alle relevanten (z. B. veröffentlichten) Module eines Kurses müssen `completed` sein. */
export function isCourseCompletedFromMaps(
  courseId: string,
  orderIndexToModuleId: Map<string, Map<number, string>>,
  completedByModuleId: Map<string, boolean>,
  /** Wenn gesetzt, zählen nur diese Modul-IDs (z. B. nur veröffentlichte). Leere Menge = Kurs ohne Inhalt = gilt als abgeschlossen. */
  moduleIdsThatCount?: Set<string>,
): boolean {
  const courseMap = orderIndexToModuleId.get(courseId);
  if (!courseMap || courseMap.size === 0) return true;
  if (moduleIdsThatCount !== undefined) {
    if (moduleIdsThatCount.size === 0) return true;
    for (const moduleId of moduleIdsThatCount) {
      if (!completedByModuleId.get(moduleId)) return false;
    }
    return true;
  }
  for (const moduleId of courseMap.values()) {
    if (!completedByModuleId.get(moduleId)) return false;
  }
  return true;
}

export type CourseSequentialMeta = {
  id: string;
  sort_order: number;
  is_sequential_exempt: boolean;
  created_at?: string;
};

/** Kurs frei, wenn Vorgänger-Kurs (nach sort_order, ohne exempt) vollständig abgeschlossen ist. */
export function isCourseUnlockedFromMaps(
  course: CourseSequentialMeta,
  sortedCourses: CourseSequentialMeta[],
  orderIndexToModuleId: Map<string, Map<number, string>>,
  completedByModuleId: Map<string, boolean>,
  /** Pro Kurs: welche Modul-IDs für „Kurs abgeschlossen“ zählen (z. B. nur is_published). */
  completionModuleIdsByCourseId: Map<string, Set<string>>,
): boolean {
  if (course.is_sequential_exempt) return true;
  const chain = sortedCourses.filter((c) => !c.is_sequential_exempt);
  const idx = chain.findIndex((c) => c.id === course.id);
  if (idx <= 0) return true;
  const prevCourse = chain[idx - 1]!;
  const completionSet = completionModuleIdsByCourseId.get(prevCourse.id);
  return isCourseCompletedFromMaps(
    prevCourse.id,
    orderIndexToModuleId,
    completedByModuleId,
    completionSet,
  );
}

/** Server: gleiche Regeln wie isCourseUnlockedFromMaps (alle Kurse außer __unassigned__). */
export async function isCourseUnlocked(userId: string, courseId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: courseRow } = await supabase
    .from("courses")
    .select("id,sort_order,is_sequential_exempt,slug")
    .eq("id", courseId)
    .maybeSingle();
  if (!courseRow) return false;
  if (courseRow.slug === "__unassigned__") return true;
  if (Boolean(courseRow.is_sequential_exempt)) return true;

  const { data: allCourses } = await supabase
    .from("courses")
    .select("id,sort_order,is_sequential_exempt,created_at,slug")
    .neq("slug", "__unassigned__");

  const sortedCourses: CourseSequentialMeta[] = (allCourses ?? [])
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

  const chain = sortedCourses.filter((c) => !c.is_sequential_exempt);
  const idx = chain.findIndex((c) => c.id === courseId);
  if (idx <= 0) return true;
  const prevCourseId = chain[idx - 1]!.id;

  const { data: publishedMods } = await supabase
    .from("modules")
    .select("id")
    .eq("course_id", prevCourseId)
    .eq("is_published", true);
  const modIds = (publishedMods ?? []).map((m) => m.id as string);
  if (modIds.length === 0) return true;

  const { data: prog } = await supabase
    .from("user_progress")
    .select("module_id,completed")
    .eq("user_id", userId)
    .in("module_id", modIds);

  const done = new Map((prog ?? []).map((p) => [p.module_id as string, Boolean(p.completed)]));
  for (const mid of modIds) {
    if (!done.get(mid)) return false;
  }
  return true;
}

export async function getLastIncompleteModule(userId: string) {
  const supabase = await createClient();
  const { data: progresses } = await supabase
    .from("user_progress")
    .select("module_id,completed,video_progress_seconds")
    .eq("user_id", userId)
    .order("completed", { ascending: true });
  if (!progresses?.length) return null;

  const firstIncomplete = progresses.find((item) => !item.completed);
  if (!firstIncomplete) return null;

  const { data: module } = await supabase
    .from("modules")
    .select("id,title,course_id")
    .eq("id", firstIncomplete.module_id)
    .single();
  return module
    ? {
        module,
        progressSeconds: firstIncomplete.video_progress_seconds ?? 0,
      }
    : null;
}
