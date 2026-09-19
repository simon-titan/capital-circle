/**
 * Hausaufgaben: Welche Aufgabe ist für Mitglieder „aktuell“, welche „vergangen“?
 *
 * Eine Regel für Dashboard („Diese Woche“), /hausaufgabe und die Admin-Liste.
 * Ohne Datenbankzugriff und ohne `new Date()`: Der heutige Kalendertag
 * (Europe/Berlin, `YYYY-MM-DD`) kommt vom Server herein, damit Server- und
 * Client-Render dasselbe Ergebnis liefern.
 *
 * Regel (19.09.2026, Feedback von Emre: „ich will hausaufgaben machen können
 * ohne fälligkeitsdatum“):
 * - archiviert (`is_active = false`)   → vergangen
 * - ohne Fälligkeitsdatum              → aktuell, bis der Admin sie archiviert
 *                                        oder löscht. Ein Datum, an dem sie von
 *                                        selbst abläuft, gibt es nicht.
 * - Frist heute oder später            → aktuell
 * - Frist abgelaufen                   → noch `NACHFRIST_TAGE` Tage aktuell (als
 *                                        „überfällig“), danach vergangen.
 *
 * Vorher galt: genau EINE aktive Aufgabe, die mit dem frühesten Datum,
 * fristlose zuletzt. Eine abgelaufene Aufgabe blieb damit für immer „die
 * aktuelle“, und fristlose kamen nie an die Reihe — sie waren für Mitglieder
 * unsichtbar, obwohl der Admin sie anlegen konnte.
 */

/** So viele Tage nach Ablauf der Frist bleibt eine Aufgabe als „überfällig“ sichtbar. */
export const NACHFRIST_TAGE = 7;

export type HausaufgabeBasis = {
  id: string;
  title: string;
  due_date: string | null;
  week_number: number | null;
  is_active: boolean | null;
  /** Seit Migration 078; vorher fehlt die Spalte, die Sortierung kommt ohne sie aus. */
  created_at?: string | null;
};

export type HausaufgabeStatus = "offen" | "ueberfaellig" | "ohne_frist" | "abgelaufen" | "archiviert";

const TAG_MS = 86_400_000;
const DATUM = /^(\d{4})-(\d{2})-(\d{2})/;

function tagInMs(value: string): number | null {
  const m = DATUM.exec(value);
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(ms) ? null : ms;
}

/** Kalendertage von `todayKey` bis `dueDate` (beide `YYYY-MM-DD`), positiv = Zukunft. `null` bei unlesbarem Datum. */
export function tageBisFrist(dueDate: string, todayKey: string): number | null {
  const frist = tagInMs(dueDate);
  const heute = tagInMs(todayKey);
  if (frist == null || heute == null) return null;
  return Math.round((frist - heute) / TAG_MS);
}

/** Letzter Tag, an dem eine abgelaufene Aufgabe noch als „überfällig“ sichtbar ist (`YYYY-MM-DD`). */
export function sichtbarBis(dueDate: string): string | null {
  const frist = tagInMs(dueDate);
  if (frist == null) return null;
  return new Date(frist + NACHFRIST_TAGE * TAG_MS).toISOString().slice(0, 10);
}

export function hausaufgabeStatus(hw: Pick<HausaufgabeBasis, "due_date" | "is_active">, todayKey: string): HausaufgabeStatus {
  if (hw.is_active === false) return "archiviert";
  if (!hw.due_date) return "ohne_frist";
  const diff = tageBisFrist(hw.due_date, todayKey);
  // Unlesbares Datum: lieber sichtbar lassen als verschlucken.
  if (diff == null) return "ohne_frist";
  if (diff >= 0) return "offen";
  if (diff >= -NACHFRIST_TAGE) return "ueberfaellig";
  return "abgelaufen";
}

export function istAktuell(status: HausaufgabeStatus): boolean {
  return status === "offen" || status === "ueberfaellig" || status === "ohne_frist";
}

function nachTitel(a: HausaufgabeBasis, b: HausaufgabeBasis): number {
  return a.title.localeCompare(b.title, "de") || a.id.localeCompare(b.id);
}

/**
 * Aktuell: erst alles mit Frist, nach Datum (überfällige damit ganz oben), dann
 * die fristlosen — nach Wochennummer, dann in der Reihenfolge, in der sie
 * angelegt wurden. Eine Frist ist dringender als „wann du willst“.
 */
function vergleicheAktuell(a: HausaufgabeBasis, b: HausaufgabeBasis): number {
  const fa = a.due_date ? tagInMs(a.due_date) : null;
  const fb = b.due_date ? tagInMs(b.due_date) : null;
  if (fa != null && fb != null && fa !== fb) return fa - fb;
  if (fa != null && fb == null) return -1;
  if (fa == null && fb != null) return 1;
  const wa = a.week_number ?? Number.MAX_SAFE_INTEGER;
  const wb = b.week_number ?? Number.MAX_SAFE_INTEGER;
  if (wa !== wb) return wa - wb;
  const ca = a.created_at ?? "";
  const cb = b.created_at ?? "";
  if (ca !== cb) return ca < cb ? -1 : 1;
  return nachTitel(a, b);
}

/** Vergangen: jüngste zuerst — nach Frist, fristlose nach Anlagedatum. */
function vergleicheVergangen(a: HausaufgabeBasis, b: HausaufgabeBasis): number {
  const ra = a.due_date ?? a.created_at?.slice(0, 10) ?? "";
  const rb = b.due_date ?? b.created_at?.slice(0, 10) ?? "";
  if (ra !== rb) return ra < rb ? 1 : -1;
  return nachTitel(a, b);
}

/** Teilt alle Hausaufgaben in „aktuell“ und „vergangen“, jeweils fertig sortiert. */
export function teileHausaufgaben<T extends HausaufgabeBasis>(rows: T[], todayKey: string): { aktuell: T[]; vergangen: T[] } {
  const aktuell: T[] = [];
  const vergangen: T[] = [];
  for (const hw of rows) {
    (istAktuell(hausaufgabeStatus(hw, todayKey)) ? aktuell : vergangen).push(hw);
  }
  aktuell.sort(vergleicheAktuell);
  vergangen.sort(vergleicheVergangen);
  return { aktuell, vergangen };
}
