import type { SupabaseClient } from "@supabase/supabase-js";
import { isFreeLiveSessionCategory } from "@/components/platform/live-session-free";

/**
 * Welche Inhalte auch ohne Zahlung offen sind — die Gegenstücke zu den
 * Hilfsfunktionen aus Migration 076 (`public.modul_ist_frei`,
 * `public.video_ist_frei`, `public.live_session_ist_frei`).
 *
 * Die Routen, die Abspiel- und Download-Adressen ausgeben, prüfen hiermit
 * selbst, statt sich allein auf die Zeilen-Sicherheit zu verlassen: Sie lesen
 * über den Service-Client, damit die Antwort nicht davon abhängt, ob die
 * Migration schon eingespielt ist, und damit ein fehlender Zugang als
 * „forbidden“ ankommt statt als „not_found“.
 *
 * Wer zahlt (oder Admin ist), entscheidet `hatInhaltsZugang` in
 * `lib/membership.ts`. Diese Datei beantwortet nur die zweite Frage: Ist der
 * Inhalt selbst frei?
 */

/** Liegt das Modul in einem Kurs mit `is_free = true`? */
export async function modulIstFrei(db: SupabaseClient, moduleId: string | null | undefined): Promise<boolean> {
  if (!moduleId) return false;
  const { data: mod } = await db.from("modules").select("course_id").eq("id", moduleId).maybeSingle();
  const courseId = (mod as { course_id?: string | null } | null)?.course_id ?? null;
  if (!courseId) return false;
  const { data: course } = await db.from("courses").select("is_free").eq("id", courseId).maybeSingle();
  return (course as { is_free?: boolean | null } | null)?.is_free === true;
}

/**
 * Ist das Video frei? Nur veröffentlichte Videos in einem Free-Kurs — das Modul
 * hängt direkt am Video oder an dessen Subkategorie. Videos im Ablagestapel
 * (weder Modul noch Subkategorie) sind nie frei.
 */
export async function videoIstFrei(
  db: SupabaseClient,
  video: { is_published?: boolean | null; module_id?: string | null; subcategory_id?: string | null },
): Promise<boolean> {
  if (!video.is_published) return false;
  let moduleId = video.module_id ?? null;
  if (!moduleId && video.subcategory_id) {
    const { data: sub } = await db.from("subcategories").select("module_id").eq("id", video.subcategory_id).maybeSingle();
    moduleId = (sub as { module_id?: string | null } | null)?.module_id ?? null;
  }
  return modulIstFrei(db, moduleId);
}

/** Gehört die Live Session zur freien Kategorie (siehe `live-session-free.ts`)? */
export async function liveSessionIstFrei(db: SupabaseClient, sessionId: string | null | undefined): Promise<boolean> {
  if (!sessionId) return false;
  const { data } = await db
    .from("live_sessions")
    .select("live_session_categories ( title )")
    .eq("id", sessionId)
    .maybeSingle();
  const roh = (data as { live_session_categories?: { title?: string | null } | { title?: string | null }[] | null } | null)
    ?.live_session_categories;
  const kategorie = Array.isArray(roh) ? roh[0] : roh;
  return kategorie?.title ? isFreeLiveSessionCategory(kategorie.title) : false;
}
