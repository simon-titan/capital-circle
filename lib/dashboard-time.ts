import { berlinCalendarDayKey } from "@/lib/learning-daily";

/**
 * Ein Zeit-Vokabular für alles, was im Dashboard an einem Termin hängt
 * („Heute · 15:00 Uhr“, „Morgen“, „Do, 18. Sep“). Immer Europe/Berlin —
 * der Server rendert in UTC.
 */

const TZ = "Europe/Berlin";
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const timeFormatter = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const weekdayFormatter = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: TZ });
const dayMonthFormatter = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "numeric", timeZone: TZ });
// Eigene Kurzformen: Intl liefert „Sept.“ — das Schema schreibt „Sep“.
const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  // Reine Datumsangaben (Fälligkeiten) als Mittag lesen, damit sie nicht über UTC auf den Vortag rutschen.
  return DATE_ONLY.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
}

function dayKeyOf(value: string | Date): string {
  if (typeof value === "string" && DATE_ONLY.test(value)) return value;
  return berlinCalendarDayKey(toDate(value));
}

function stripDot(s: string): string {
  return s.replace(/\.$/, "");
}

/** Kalendertage bis `value` (Berlin), positiv = Zukunft. */
export function daysFromToday(value: string | Date, now: Date = new Date()): number {
  const [fy, fm, fd] = berlinCalendarDayKey(now).split("-").map(Number);
  const [ty, tm, td] = dayKeyOf(value).split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** „Do, 18. Sep“ */
export function shortDateLabel(value: string | Date): string {
  const d = toDate(value);
  const parts = dayMonthFormatter.formatToParts(d);
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "1");
  return `${stripDot(weekdayFormatter.format(d))}, ${day}. ${MONTHS[month - 1] ?? ""}`;
}

/** „Heute“, „Morgen“, „Gestern“ oder „Do, 18. Sep“. */
export function relativeDayLabel(value: string | Date, now: Date = new Date()): string {
  const diff = daysFromToday(value, now);
  if (diff === 0) return "Heute";
  if (diff === 1) return "Morgen";
  if (diff === -1) return "Gestern";
  return shortDateLabel(value);
}

/** „15:00 Uhr“ */
export function clockLabel(value: string | Date): string {
  return `${timeFormatter.format(toDate(value))} Uhr`;
}
