/**
 * Maximale plausible Streak in Tagen: Kalendertage seit Kontoerstellung (inkl. erstem Tag).
 * Ein Streak kann nie höher sein als die Zeitspanne, in der das Konto existiert.
 */
export function maxPlausibleStreakDays(createdAtIso: string | null | undefined, now = new Date()): number {
  if (!createdAtIso) return 10_000;
  const created = new Date(createdAtIso);
  const start = new Date(created.getFullYear(), created.getMonth(), created.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
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

export function calculateStreak(lastActivity: Date | null, currentStreak: number, now = new Date()) {
  if (!lastActivity) return 1;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());
  const diff = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return currentStreak;
  if (diff === 1) return currentStreak + 1;
  return 1;
}
