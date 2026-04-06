/** Kalendertag YYYY-MM-DD (Europe/Berlin) für Lernzeit-Buckets. */
export function berlinCalendarDayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function parseLearningMinutesByDay(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n) && n >= 0) out[k] = Math.floor(n);
  }
  return out;
}

export function addMinutesToDayMap(
  existing: Record<string, number>,
  dayKey: string,
  addMinutes: number,
  keepLastDays = 21,
): Record<string, number> {
  if (addMinutes <= 0) return pruneDayMap(existing, keepLastDays);
  const next = { ...existing, [dayKey]: (existing[dayKey] ?? 0) + addMinutes };
  return pruneDayMap(next, keepLastDays);
}

export function parseLearningSecondsByDay(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n) && n >= 0) out[k] = Math.floor(n);
  }
  return out;
}

export function addSecondsToDayMap(
  existing: Record<string, number>,
  dayKey: string,
  addSeconds: number,
  keepLastDays = 21,
): Record<string, number> {
  if (addSeconds <= 0) return pruneDayMap(existing, keepLastDays);
  const next = { ...existing, [dayKey]: (existing[dayKey] ?? 0) + addSeconds };
  return pruneDayMap(next, keepLastDays);
}

function pruneDayMap(map: Record<string, number>, keepLastDays: number): Record<string, number> {
  const keys = Object.keys(map).sort();
  if (keys.length <= keepLastDays) return map;
  const from = keys.length - keepLastDays;
  const pruned: Record<string, number> = {};
  for (let i = from; i < keys.length; i++) {
    const k = keys[i]!;
    pruned[k] = map[k] ?? 0;
  }
  return pruned;
}

/** Streak-relevante Tage (Fortschritt gespeichert), Keys YYYY-MM-DD Europe/Berlin. */
export function parseStreakActivityByDay(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === true) out[k] = true;
  }
  return out;
}

export function mergeStreakActivityDay(
  existing: Record<string, boolean>,
  dayKey: string,
  keepLastDays = 21,
): Record<string, boolean> {
  const next = { ...existing, [dayKey]: true };
  const keys = Object.keys(next).sort();
  if (keys.length <= keepLastDays) return next;
  const from = keys.length - keepLastDays;
  const pruned: Record<string, boolean> = {};
  for (let i = from; i < keys.length; i++) {
    pruned[keys[i]!] = true;
  }
  return pruned;
}

export type LearningWeekDay = {
  dayKey: string;
  weekdayShort: string;
  /** Erfasste Lernzeit an diesem Kalendertag (Sekunden) */
  seconds: number;
  /** z. B. „31. März“ für Tooltip */
  labelDe: string;
};

/** Letzte 7 Tage (rolling), Beschriftung in Europe/Berlin. `byDay` = Sekunden pro Kalendertag. */
/** Gesamt-Lernzeit in Sekunden (neue Spalte oder Legacy-Minuten). */
/** Kurzbeschriftung für Tooltips (z. B. „45 Min. Lernzeit“, „30 Sek.“). */
export function formatLearningDurationDe(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s < 60) return `${s} Sek. Lernzeit`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} Min. Lernzeit`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h} h ${mm} Min. Lernzeit` : `${h} h Lernzeit`;
}

export function resolveTotalLearningSeconds(profile: {
  total_learning_seconds?: number | null;
  total_learning_minutes?: number | null;
}): number {
  const fromMinutes = Math.max(0, Math.floor((profile.total_learning_minutes ?? 0) * 60));
  const raw = profile.total_learning_seconds;
  if (raw == null || typeof raw !== "number" || !Number.isFinite(raw)) return fromMinutes;
  const s = Math.floor(raw);
  // Spalte existiert, ist aber noch 0 — solange nur Legacy-Minuten geschrieben waren (ohne Migration / alter Client)
  if (s === 0 && fromMinutes > 0) return fromMinutes;
  return Math.max(0, s);
}

/** Tageskarte in Sekunden: `learning_seconds_by_day` oder Legacy `learning_minutes_by_day` × 60. */
export function resolveLearningSecondsByDay(profile: {
  learning_seconds_by_day?: unknown;
  learning_minutes_by_day?: unknown;
}): Record<string, number> {
  const sec = parseLearningSecondsByDay(profile.learning_seconds_by_day);
  if (Object.keys(sec).length > 0) return sec;
  const min = parseLearningMinutesByDay(profile.learning_minutes_by_day);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(min)) out[k] = Math.floor(v * 60);
  return out;
}

export function buildLearningWeekLast7(byDaySeconds: Record<string, number>): LearningWeekDay[] {
  const out: LearningWeekDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dayKey = berlinCalendarDayKey(d);
    const weekdayShort = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: "Europe/Berlin" }).format(d);
    const labelDe = new Intl.DateTimeFormat("de-DE", {
      day: "numeric",
      month: "long",
      timeZone: "Europe/Berlin",
    }).format(d);
    out.push({
      dayKey,
      weekdayShort: weekdayShort.replace(/\.$/, ""),
      seconds: Math.max(0, Math.floor(byDaySeconds[dayKey] ?? 0)),
      labelDe,
    });
  }
  return out;
}
