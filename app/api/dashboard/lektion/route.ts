import { NextResponse } from "next/server";
import { videoIstFrei } from "@/lib/access-control/inhalt-zugang";
import { getLektionsKarte } from "@/lib/dashboard-lektion";
import { hatInhaltsZugang } from "@/lib/membership";
import { getAcademyModulesOverview, parseVideoProgressByVideo } from "@/lib/server-data";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// `buildThumbnailUrl` signiert das Cloudflare-Standbild per RS256 — das braucht
// Node-crypto, wie in `/api/video-url`.
export const runtime = "nodejs";

const VIDEO_SPALTEN = "id, is_published, module_id, subcategory_id";

type VideoZeile = {
  id: string;
  is_published: boolean | null;
  module_id: string | null;
  subcategory_id: string | null;
};

/**
 * Eine einzelne Lektion als fertige Karte „Als nächstes“ — die Pfeile im
 * Dashboard blättern damit, ohne das Dashboard zu verlassen (Nutzerwunsch
 * 20.09.2026).
 *
 * Die Karte lädt erst beim Klick nach, statt dass die Seite ein Fenster fertiger
 * Nachbarn mitbringt: Jede Vorschau trägt eine signierte Cloudflare-Adresse, und
 * über 130 Lektionen auf Vorrat zu signieren wäre für Bilder bezahlt, die
 * niemand sieht. Die Karte merkt sich, was sie geholt hat — Hin und Her kostet
 * also nur beim ersten Mal.
 *
 * Zugang: dieselbe Schranke wie `/api/video-url` —
 * - Admin: jede Lektion, auch unveröffentlichte.
 * - Alle anderen: nur veröffentlichte, und zwar mit Zahlung (`profiles.is_paid`)
 *   alle, ohne Zahlung nur die aus einem Free-Kurs.
 * Zusätzlich muss das Modul für dieses Konto offen sein (Zugriff, keine
 * Admin-Sperre, Kurskette freigeschaltet) — gesperrte Nachbarn bleiben
 * unerreichbar, so wie der Pfeil dorthin schon tot ist.
 *
 * Es wird nur gelesen: Geblättert wird in der Ansicht, nicht im Fortschritt.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const userId = authData.user.id;

  const videoId = new URL(request.url).searchParams.get("video")?.trim();
  if (!videoId) {
    return NextResponse.json({ ok: false, error: "missing_video" }, { status: 400 });
  }

  // Nachschlagen über den Service-Client: Die Prüfung unten ist die Schranke,
  // nicht die Sichtbarkeit der Zeile — sonst käme fehlender Zugang als
  // „not_found“ an (siehe `lib/access-control/inhalt-zugang.ts`).
  const service = createServiceClient();
  const [{ data: profile }, { data: videoRow }] = await Promise.all([
    supabase.from("profiles").select("is_admin, is_paid").eq("id", userId).maybeSingle(),
    service.from("videos").select(VIDEO_SPALTEN).eq("id", videoId).maybeSingle(),
  ]);

  const video = videoRow as VideoZeile | null;
  if (!video) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (!profile?.is_admin) {
    if (!video.is_published) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    if (!hatInhaltsZugang(profile) && !(await videoIstFrei(service, video))) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
  }

  // Das Modul hängt direkt am Video oder an dessen Subkategorie.
  let moduleId = video.module_id ?? null;
  if (!moduleId && video.subcategory_id) {
    const { data: sub } = await service
      .from("subcategories")
      .select("module_id")
      .eq("id", video.subcategory_id)
      .maybeSingle();
    moduleId = ((sub as { module_id?: string | null } | null)?.module_id) ?? null;
  }
  if (!moduleId) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // Dieselbe Übersicht, aus der auch das Dashboard die Reihenfolge nimmt —
  // Modulsperre, Kurskette und Modulfortschritt stehen dort bereits fertig.
  const rows = await getAcademyModulesOverview(userId);
  const modul = rows.find((m) => m.id === moduleId);
  if (!modul || !modul.hasAccess || !modul.unlocked || modul.isLocked) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const { data: fortschritt } = await supabase
    .from("user_progress")
    .select("video_progress_by_video")
    .eq("user_id", userId)
    .eq("module_id", moduleId)
    .maybeSingle();

  const item = await getLektionsKarte(
    supabase,
    rows,
    moduleId,
    videoId,
    parseVideoProgressByVideo(
      (fortschritt as { video_progress_by_video?: unknown } | null)?.video_progress_by_video,
    ),
  );
  if (!item) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item });
}
