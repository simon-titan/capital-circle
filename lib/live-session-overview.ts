import { createClient } from "@/lib/supabase/server";
import { getLiveSessions, type LiveSessionCategoryRow, type LiveSessionListItem } from "@/lib/server-data";

/**
 * Zusatzabfragen für die Live-Session-Übersicht.
 *
 * `lib/server-data.ts` liefert Kategorien und Sessions, aber keine Zählwerte.
 * Seit dem Umbau auf das Institut-Muster (17.09.2026) sind die drei Kategorien
 * die Einstiegskarten — auf der Karte muss deshalb stehen, was dahinter liegt,
 * bevor man klickt. Bewusst eine eigene Datei: `server-data.ts` wird von allen
 * Bereichen geteilt und soll nicht für jede Ansicht weiterwachsen.
 */

export type LiveSessionCategoryOverviewRow = LiveSessionCategoryRow & {
  sessionCount: number;
  videoCount: number;
  totalDurationSeconds: number;
  /** Jüngstes Datum der Kategorie (Live-Termin oder Aufzeichnung), ISO oder null. */
  latestAt: string | null;
};

export type LiveSessionWithCounts = LiveSessionListItem & {
  videoCount: number;
  totalDurationSeconds: number;
};

/** Supabase liefert eingebettete Relationen mal als Objekt, mal als Liste. */
function first<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/** Das spätere von zwei Daten; null-sicher, damit fehlende Termine nichts überschreiben. */
function neuer(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

/**
 * Die drei Kategorien samt Kennzahlen für die Übersichtskarten.
 *
 * Drei kleine Abfragen statt einer verschachtelten: Kategorien, Sessions und
 * Videos sind zusammen ein paar hundert Zeilen, und die Zählung in JS bleibt
 * lesbar — anders als ein Aggregat über zwei Joins hinweg.
 */
export async function getLiveSessionCategoryOverview(): Promise<LiveSessionCategoryOverviewRow[]> {
  const supabase = await createClient();
  const [cats, sessions, videos] = await Promise.all([
    supabase.from("live_session_categories").select("id, title, position").order("position", { ascending: true }),
    supabase.from("live_sessions").select("id, category_id, recorded_at, events ( start_time )"),
    supabase.from("live_session_videos").select("session_id, duration_seconds"),
  ]);

  const catRows = (cats.data as LiveSessionCategoryRow[] | null) ?? [];
  const sessionRows =
    (sessions.data ?? []) as Array<{
      id: string;
      category_id: string;
      recorded_at: string | null;
      events: { start_time: string } | { start_time: string }[] | null;
    }>;
  const videoRows = (videos.data ?? []) as Array<{ session_id: string; duration_seconds: number | null }>;

  // Welche Session gehört zu welcher Kategorie — für die Videozählung darunter.
  const kategorieVonSession = new Map<string, string>();
  const zaehler = new Map<string, { sessions: number; videos: number; seconds: number; latestAt: string | null }>();
  for (const c of catRows) {
    zaehler.set(c.id, { sessions: 0, videos: 0, seconds: 0, latestAt: null });
  }

  for (const s of sessionRows) {
    const eintrag = zaehler.get(s.category_id);
    if (!eintrag) continue;
    kategorieVonSession.set(s.id, s.category_id);
    eintrag.sessions += 1;
    eintrag.latestAt = neuer(eintrag.latestAt, neuer(first(s.events)?.start_time ?? null, s.recorded_at));
  }

  for (const v of videoRows) {
    const catId = kategorieVonSession.get(v.session_id);
    if (!catId) continue;
    const eintrag = zaehler.get(catId);
    if (!eintrag) continue;
    eintrag.videos += 1;
    eintrag.seconds += v.duration_seconds ?? 0;
  }

  return catRows.map((c) => {
    const e = zaehler.get(c.id)!;
    return {
      ...c,
      sessionCount: e.sessions,
      videoCount: e.videos,
      totalDurationSeconds: e.seconds,
      latestAt: e.latestAt,
    };
  });
}

/** Eine Kategorie für die Detailseite; unbekannte oder krumme IDs geben null. */
export async function getLiveSessionCategory(id: string): Promise<LiveSessionCategoryRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("live_session_categories")
    .select("id, title, position")
    .eq("id", id)
    .maybeSingle();
  return (data as LiveSessionCategoryRow | null) ?? null;
}

/**
 * Die Sessions einer Kategorie mit Videoanzahl und Gesamtdauer — dieselben
 * Kennzahlen, die eine Modulkachel im Institut trägt.
 */
export async function getLiveSessionsWithCounts(categoryId: string): Promise<LiveSessionWithCounts[]> {
  const sessions = await getLiveSessions(categoryId);
  if (sessions.length === 0) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("live_session_videos")
    .select("session_id, duration_seconds")
    .in(
      "session_id",
      sessions.map((s) => s.id),
    );
  const videoRows = (data ?? []) as Array<{ session_id: string; duration_seconds: number | null }>;

  const proSession = new Map<string, { videos: number; seconds: number }>();
  for (const v of videoRows) {
    const e = proSession.get(v.session_id) ?? { videos: 0, seconds: 0 };
    e.videos += 1;
    e.seconds += v.duration_seconds ?? 0;
    proSession.set(v.session_id, e);
  }

  return sessions.map((s) => {
    const e = proSession.get(s.id);
    return { ...s, videoCount: e?.videos ?? 0, totalDurationSeconds: e?.seconds ?? 0 };
  });
}
