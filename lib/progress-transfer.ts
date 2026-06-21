import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Mindest-Sekunden bei fehlender Dauer (gleiche Regel wie lib/module-video.ts). */
const MIN_WATCHED_SECONDS_WHEN_NO_DURATION = 30;
/** 90% der Dauer gilt als „angesehen“. */
const MIN_WATCHED_RATIO = 0.9;

/** Erweiterte Spalten, die in älteren Deployments evtl. noch fehlen (PGRST204). */
const EXTENDED_COLS =
  "user_id,video_progress_by_video,last_video_id,completed,video_completed,completed_at,quiz_passed,video_progress_seconds";

function asProgressMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n) && n >= 0) out[k] = n;
  }
  return out;
}

function isVideoDone(seconds: number, duration: number | null): boolean {
  const d = duration ?? 0;
  if (d <= 0) return seconds >= MIN_WATCHED_SECONDS_WHEN_NO_DURATION;
  return seconds >= d * MIN_WATCHED_RATIO;
}

type SourceProgressRow = {
  user_id: string;
  video_progress_by_video?: unknown;
  last_video_id?: string | null;
  video_progress_seconds?: number | null;
};

type TargetProgressRow = {
  user_id: string;
  video_progress_by_video?: unknown;
  last_video_id?: string | null;
  completed?: boolean | null;
  video_completed?: boolean | null;
  completed_at?: string | null;
  quiz_passed?: boolean | null;
  video_progress_seconds?: number | null;
};

/**
 * Überträgt den per-Video-Fortschritt der angegebenen Videos vom Quell-Modul in das Ziel-Modul.
 *
 * Hintergrund: `user_progress` ist pro `(user_id, module_id)` gespeichert; die angesehenen Sekunden
 * liegen in `video_progress_by_video` (JSONB, Key = stabile Video-ID). Werden Videos in ein anderes Modul
 * verschoben, bleibt der Wert gültig, ist aber im Ziel-Modul unsichtbar, bis er dorthin kopiert wird.
 *
 * - Quell-Zeilen werden NICHT verändert (verwaiste Keys ignoriert `watchedSecondsCapped`).
 * - Ziel-Zeilen werden per Upsert + `Math.max` befüllt → idempotent.
 * - `completed`/`video_completed` werden nur auf true gesetzt, wenn alle bewegten Videos die 90%-Schwelle
 *   erfüllen; bestehendes `completed=true` wird nie zurückgenommen.
 */
export async function transferVideoProgress(
  supabase: ServerClient,
  {
    sourceModuleId,
    targetModuleId,
    videoIds,
  }: { sourceModuleId: string; targetModuleId: string; videoIds: string[] },
): Promise<void> {
  if (!videoIds.length || sourceModuleId === targetModuleId) return;

  const videoIdSet = new Set(videoIds);

  // Dauern der bewegten Videos (für die „angesehen“-Schwelle).
  const { data: durationRows } = await supabase
    .from("videos")
    .select("id,duration_seconds")
    .in("id", videoIds);
  const durationById = new Map<string, number | null>();
  for (const r of (durationRows ?? []) as Array<{ id: string; duration_seconds: number | null }>) {
    durationById.set(r.id, r.duration_seconds);
  }

  // Quell-Fortschritt aller User für das Quell-Modul.
  const { data: srcRows, error: srcErr } = await supabase
    .from("user_progress")
    .select(EXTENDED_COLS)
    .eq("module_id", sourceModuleId);

  if (srcErr) {
    // Erweiterte Spalten fehlen noch im Schema → kein per-Video-Fortschritt vorhanden, nichts zu übertragen.
    if (srcErr.code === "PGRST204") {
      console.warn("[progress-transfer] extended columns missing, skipping transfer");
      return;
    }
    console.error("[progress-transfer] source select error:", srcErr.code, srcErr.message);
    return;
  }

  const sources = (srcRows ?? []) as SourceProgressRow[];
  if (sources.length === 0) return;

  const userIds = sources.map((s) => s.user_id);

  // Bestehende Ziel-Zeilen (für Math.max-Merge und „completed nie zurücknehmen“).
  const { data: tgtRows } = await supabase
    .from("user_progress")
    .select(EXTENDED_COLS)
    .eq("module_id", targetModuleId)
    .in("user_id", userIds);
  const targetByUser = new Map<string, TargetProgressRow>();
  for (const r of (tgtRows ?? []) as TargetProgressRow[]) {
    targetByUser.set(r.user_id, r);
  }

  const nowIso = new Date().toISOString();
  const payloads: Record<string, unknown>[] = [];

  for (const src of sources) {
    const srcMap = asProgressMap(src.video_progress_by_video);
    const existingTarget = targetByUser.get(src.user_id);
    const mergedMap = { ...asProgressMap(existingTarget?.video_progress_by_video) };

    let touched = false;
    for (const vid of videoIds) {
      const s = srcMap[vid];
      if (typeof s === "number" && s > 0) {
        mergedMap[vid] = Math.max(mergedMap[vid] ?? 0, s);
        touched = true;
      }
    }
    // Kein Fortschritt für die bewegten Videos und keine Ziel-Zeile vorhanden → keine leere Zeile anlegen.
    if (!touched && !existingTarget) continue;

    const allDone = videoIds.every((vid) => isVideoDone(mergedMap[vid] ?? 0, durationById.get(vid) ?? null));

    const existingCompleted = Boolean(existingTarget?.completed);
    const completed = existingCompleted || allDone;
    const completed_at = completed
      ? (existingTarget?.completed_at ?? nowIso)
      : (existingTarget?.completed_at ?? null);

    const srcLast = src.last_video_id ?? null;
    const last_video_id =
      srcLast && videoIdSet.has(srcLast) ? srcLast : (existingTarget?.last_video_id ?? null);

    payloads.push({
      user_id: src.user_id,
      module_id: targetModuleId,
      video_progress_by_video: mergedMap,
      last_video_id,
      completed,
      video_completed: completed || Boolean(existingTarget?.video_completed),
      completed_at,
      quiz_passed: Boolean(existingTarget?.quiz_passed),
      video_progress_seconds: existingTarget?.video_progress_seconds ?? 0,
    });
  }

  if (payloads.length === 0) return;

  const { error: upErr } = await supabase
    .from("user_progress")
    .upsert(payloads, { onConflict: "user_id,module_id" });
  if (upErr) {
    console.error("[progress-transfer] upsert error:", upErr.code, upErr.message);
  }
}
