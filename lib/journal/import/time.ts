/**
 * Zeitzonen-Umrechnung ohne Datums-Bibliothek.
 *
 * Broker-Exporte enthalten reine Wanduhrzeit ohne Offset ("07/01/2026 16:03:03").
 * Welcher Zeitzone diese Angabe folgt, hängt an den Einstellungen des Nutzers —
 * er wählt sie deshalb beim Import aus. Aus Wanduhrzeit + IANA-Zone leiten wir
 * den absoluten Zeitpunkt (UTC) ab.
 */

export interface WallClock {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Zeitzonen, die im Upload-Dialog zur Auswahl stehen. */
export const IMPORT_TIMEZONES = [
  { value: "Europe/Berlin", label: "Europe/Berlin (MEZ/MESZ)" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New_York (Börsenzeit)" },
  { value: "America/Chicago", label: "America/Chicago (CME)" },
] as const;

export const DEFAULT_IMPORT_TIMEZONE = "Europe/Berlin";

export function isSupportedTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Offset der Zone zum gegebenen absoluten Zeitpunkt, in Millisekunden. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asIfUtc - instant.getTime();
}

/**
 * Wanduhrzeit in einer Zone → absoluter Zeitpunkt.
 *
 * Zwei Durchläufe, weil der Offset selbst vom Zeitpunkt abhängt: der erste
 * Schätzwert liegt an DST-Grenzen bis zu einer Stunde daneben, der zweite
 * korrigiert ihn.
 */
export function wallClockToUtc(wall: WallClock, timeZone: string): Date {
  const naive = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  let ts = naive - zoneOffsetMs(new Date(naive), timeZone);
  ts = naive - zoneOffsetMs(new Date(ts), timeZone);
  return new Date(ts);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** YYYY-MM-DD der Wanduhrzeit — der Handelstag, wie ihn der Trader sieht. */
export function wallClockToIsoDate(wall: WallClock): string {
  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`;
}

/**
 * Parst das Tradovate/TradingView-Format `MM/DD/YYYY HH:MM:SS`.
 * Gibt null zurück, wenn das Feld leer ist oder nicht passt.
 */
export function parseFillTime(raw: string | undefined): WallClock | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) return null;

  const [, month, day, year, hour, minute, second] = m;
  const wall: WallClock = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  };

  if (wall.month < 1 || wall.month > 12 || wall.day < 1 || wall.day > 31 || wall.hour > 23) return null;
  return wall;
}
