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
  minutes: number;
  /** z. B. „31. März“ für Tooltip */
  labelDe: string;
};

/** Letzte 7 Tage (rolling), Beschriftung in Europe/Berlin. */
export function buildLearningWeekLast7(byDay: Record<string, number>): LearningWeekDay[] {
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
      minutes: Math.round(byDay[dayKey] ?? 0),
      labelDe,
    });
  }
  return out;
}
