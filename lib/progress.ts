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
