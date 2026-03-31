import { createClient } from "@/lib/supabase/server";

export async function isModuleUnlocked(userId: string, moduleId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: currentModule } = await supabase
    .from("modules")
    .select("id,course_id,order_index")
    .eq("id", moduleId)
    .single();
  if (!currentModule) return false;
  if (currentModule.order_index === 1) return true;

  const { data: previousModule } = await supabase
    .from("modules")
    .select("id")
    .eq("course_id", currentModule.course_id)
    .eq("order_index", currentModule.order_index - 1)
    .single();

  if (!previousModule) return false;

  const { data: previousProgress } = await supabase
    .from("user_progress")
    .select("completed")
    .eq("user_id", userId)
    .eq("module_id", previousModule.id)
    .single();

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
  if (module.order_index === 1) return true;
  const prevId = orderIndexToModuleId.get(module.course_id)?.get(module.order_index - 1);
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
