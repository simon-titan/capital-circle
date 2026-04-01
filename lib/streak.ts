import { berlinCalendarDayKey } from "@/lib/learning-daily";

function berlinCalendarDaysBetweenUtc(a: Date, b: Date): number {
  const ka = berlinCalendarDayKey(a);
  const kb = berlinCalendarDayKey(b);
  const [y1, m1, d1] = ka.split("-").map(Number);
  const [y2, m2, d2] = kb.split("-").map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86400000);
}

/**
 * Maximale plausible Streak in Tagen: Kalendertage seit Kontoerstellung (inkl. erstem Tag).
 * Zeitzone: Europe/Berlin (wie Lernzeit & Streak-Aktivität).
 */
export function maxPlausibleStreakDays(createdAtIso: string | null | undefined, now = new Date()): number {
  if (!createdAtIso) return 10_000;
  const created = new Date(createdAtIso);
  const diffDays = berlinCalendarDaysBetweenUtc(created, now);
  if (diffDays < 0) return 1;
  return diffDays + 1;
}

/** Korrigiert gespeicherte Streak-Werte, die durch alte Bugs oder manuelle Daten höher sind als möglich. */
export function sanitizeStreakValue(
  streak: number,
  createdAtIso: string | null | undefined,
  now = new Date(),
): number {
  const max = maxPlausibleStreakDays(createdAtIso, now);
  const s = Number.isFinite(streak) ? Math.max(0, Math.floor(streak)) : 0;
  return Math.min(s, max);
}

/**
 * Streak-Fortschritt relativ zum letzten Streak-Tag (Europe/Berlin).
 * Entspricht der Logik von Lernzeit-Tageskeys (`berlinCalendarDayKey`).
 */
export function calculateStreak(lastActivity: Date | null, currentStreak: number, now = new Date()) {
  if (!lastActivity) return 1;
  const diff = berlinCalendarDaysBetweenUtc(lastActivity, now);
  if (diff === 0) return currentStreak;
  if (diff === 1) return currentStreak + 1;
  return 1;
}
