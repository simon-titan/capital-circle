/**
 * Zeitrechnung für das E-Mail-Playbook. Gespeichert wird in UTC, gerechnet und
 * angezeigt in Europe/Berlin (Playbook Kapitel 08: „gleiche lokale Uhrzeit nach
 * 30 bzw. sieben Kalendertagen", inklusive Sommer-/Winterzeit).
 *
 * Bewusst ohne Abhängigkeiten, damit die Tests (`npm run test:mails`) die
 * Datei direkt laden können.
 */

const TZ = "Europe/Berlin";

export const STUNDE_MS = 3_600_000;
export const TAG_MS = 24 * STUNDE_MS;

const teileFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Berliner Wanduhr eines Zeitpunkts. */
function wanduhr(d: Date) {
  const t: Record<string, number> = {};
  for (const p of teileFormat.formatToParts(d)) if (p.type !== "literal") t[p.type] = Number(p.value);
  return { y: t.year, m: t.month, d: t.day, h: t.hour, mi: t.minute, s: t.second };
}

/** Abstand Berlin − UTC in Millisekunden zu diesem Zeitpunkt (+1 h / +2 h). */
function versatz(d: Date): number {
  const w = wanduhr(d);
  return Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s) - Math.floor(d.getTime() / 1000) * 1000;
}

/**
 * `n` Kalendertage später, zur selben Berliner Uhrzeit — über eine
 * Zeitumstellung hinweg also 24 h ± 1 h für einen der Tage.
 */
export function plusKalendertageBerlin(d: Date, n: number): Date {
  const w = wanduhr(d);
  const ms = d.getTime() % 1000;
  const wandZiel = Date.UTC(w.y, w.m - 1, w.d + n, w.h, w.mi, w.s) + ms;
  // Zweimal annähern: Der Versatz am Ziel kann vom Versatz am Start abweichen.
  let utc = wandZiel - versatz(new Date(wandZiel));
  utc = wandZiel - versatz(new Date(utc));
  return new Date(utc);
}

const datumLang = new Intl.DateTimeFormat("de-DE", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });
const wochentagDatum = new Intl.DateTimeFormat("de-DE", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const uhrzeit = new Intl.DateTimeFormat("de-DE", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

/** „9. Dezember 2026" */
export function datumBerlin(d: Date): string {
  return datumLang.format(d);
}

/** „Mittwoch, 9. Dezember 2026" */
export function wochentagDatumBerlin(d: Date): string {
  return wochentagDatum.format(d);
}

/** „14:30 Uhr" */
export function uhrzeitBerlin(d: Date): string {
  return `${uhrzeit.format(d)} Uhr`;
}

/**
 * Termin in der gebuchten Zeitzone, eindeutig beschriftet (Playbook Kapitel 08).
 * Berlin heißt „deutsche Zeit", jede andere Zone steht mit Namen dabei.
 */
export function terminZeit(start: Date, ende: Date | null, zone: string | null) {
  const tz = zone && isValidZone(zone) ? zone : TZ;
  const tag = new Intl.DateTimeFormat("de-DE", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(start);
  const datumKurz = new Intl.DateTimeFormat("de-DE", { timeZone: tz, day: "numeric", month: "long", year: "numeric" }).format(start);
  const uhr = new Intl.DateTimeFormat("de-DE", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  const zoneText = tz === TZ ? "deutsche Zeit" : tz.replace(/_/g, " ");
  const beginn = `${uhr.format(start)} Uhr`;
  return {
    /** „Freitag, 20. November 2026" */
    tag,
    /** „20. November 2026" */
    datum: datumKurz,
    /** „16:00 Uhr (deutsche Zeit)" */
    uhrzeit: `${beginn} (${zoneText})`,
    /** „16:00–16:45 Uhr (deutsche Zeit)" */
    spanne: ende ? `${uhr.format(start)}–${uhr.format(ende)} Uhr (${zoneText})` : `${beginn} (${zoneText})`,
  };
}

function isValidZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("de-DE", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}
