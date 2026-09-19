import type { ContinueItem } from "@/components/platform/dashboard/types";
import { buildThumbnailUrl } from "@/lib/cloudflare-stream";
import { getModulePublishedPlaylistsBulk, type PlaylistVideoRow } from "@/lib/module-video";
import { lessonHref } from "@/lib/module-route";
import type { AcademyModuleRow } from "@/lib/server-data";
import type { createClient } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Die Lektionsreihenfolge hinter den Pfeilen in „Als nächstes“.
 *
 * Die Reihenfolge der Ausbildung steckt bereits in der Institut-Übersicht
 * (Kurs-Sortierung, dann `order_index`), die Reihenfolge innerhalb eines Moduls
 * in seiner veröffentlichten Playlist. Am Modulrand wird deshalb schlicht über
 * die Grenze hinweg weitergezählt: Die letzte Lektion eines Moduls grenzt an die
 * erste des nächsten. Dass dabei das Modul wechselt, ist Folge des Sprungs, nicht
 * sein Maß.
 *
 * Bis 19.09.2026 gab diese Rechnung fertige Adressen aus (`prevHref`/`nextHref`)
 * und die Pfeile waren Links — ein Klick verließ das Dashboard. Seit dem
 * Nutzerwunsch vom 20.09.2026 blättern die Pfeile die Karte selbst, deshalb
 * liefert sie jetzt Video-IDs: Sie sind der Schlüssel, mit dem die Karte die
 * Nachbarlektion über `GET /api/dashboard/lektion` nachlädt.
 *
 * Nachbarn in Modulen, die der Nutzer nicht öffnen darf (kein Zugriff, Sperre,
 * Reihenfolge), bleiben `null` — der Pfeil ist dann sichtbar, aber tot.
 */
export type LektionsFenster = {
  /** Die Lektion an der gefragten Position selbst — Ausgangspunkt fürs Blättern. */
  videoId: string | null;
  prevVideoId: string | null;
  nextVideoId: string | null;
};

const LEER: LektionsFenster = { videoId: null, prevVideoId: null, nextVideoId: null };

/** Darf dieses Konto das Modul öffnen? */
function offen(m: AcademyModuleRow | undefined): AcademyModuleRow | null {
  return m && m.hasAccess && m.unlocked && !m.isLocked ? m : null;
}

type Umgebung = {
  /** Position des Moduls in der Institut-Übersicht, −1 wenn unbekannt. */
  i: number;
  davor: AcademyModuleRow | null;
  danach: AcademyModuleRow | null;
  playlists: Map<string, PlaylistVideoRow[]>;
  aktuell: PlaylistVideoRow[];
};

/**
 * Playlists des Moduls und seiner beiden offenen Nachbarmodule — ein
 * Bulk-Aufruf für höchstens drei Module. Die Playlists selbst stehen nicht in
 * der Institut-Übersicht, dort steht nur ihre Länge.
 */
async function ladeUmgebung(
  supabase: ServerSupabase,
  rows: AcademyModuleRow[],
  moduleId: string,
): Promise<Umgebung> {
  const i = rows.findIndex((m) => m.id === moduleId);
  if (i < 0) return { i, davor: null, danach: null, playlists: new Map(), aktuell: [] };
  const davor = offen(rows[i - 1]);
  const danach = offen(rows[i + 1]);
  const playlists = await getModulePublishedPlaylistsBulk(
    supabase,
    [moduleId, davor?.id, danach?.id].filter((id): id is string => Boolean(id)),
  );
  return { i, davor, danach, playlists, aktuell: playlists.get(moduleId) ?? [] };
}

/** Lektion am Rand eines Nachbarmoduls: die letzte davor bzw. die erste danach. */
function amRand(u: Umgebung, m: AcademyModuleRow | null, kante: "erste" | "letzte"): string | null {
  if (!m) return null;
  const list = u.playlists.get(m.id) ?? [];
  const v = kante === "erste" ? list[0] : list[list.length - 1];
  return v?.id ?? null;
}

function fensterAn(u: Umgebung, position: number): LektionsFenster {
  const hier = Math.min(Math.max(0, position), Math.max(0, u.aktuell.length - 1));
  return {
    videoId: u.aktuell[hier]?.id ?? null,
    prevVideoId: hier > 0 ? u.aktuell[hier - 1]?.id ?? null : amRand(u, u.davor, "letzte"),
    nextVideoId:
      hier < u.aktuell.length - 1 ? u.aktuell[hier + 1]?.id ?? null : amRand(u, u.danach, "erste"),
  };
}

/**
 * Die gezeigte Lektion und ihre beiden Nachbarn, ausgehend von einer Position
 * in der Modul-Playlist (0-basiert). Für den ersten Aufbau der Karte auf dem
 * Server — dort ist die Position bekannt („Lektion 7 von 24“), die Video-ID noch nicht.
 */
export async function getLektionsFenster(
  supabase: ServerSupabase,
  rows: AcademyModuleRow[],
  moduleId: string,
  lessonIndex: number,
): Promise<LektionsFenster> {
  const u = await ladeUmgebung(supabase, rows, moduleId);
  if (u.i < 0) return LEER;
  return fensterAn(u, lessonIndex);
}

/**
 * Vorschaubild der Lektion — dieselbe Staffel wie in „Weiter wo du warst“:
 * bevorzugt das Cloudflare-Standbild an der Stelle, an der weitergeschaut wird,
 * dann das von Hand gepflegte Lektionsbild aus R2, zuletzt das Modul-Thumbnail.
 */
function lektionsBild(v: PlaylistVideoRow, modul: AcademyModuleRow, sekunden: number): string | null {
  if (v.cloudflare_uid) {
    try {
      return buildThumbnailUrl(v.cloudflare_uid, { signed: true, timeSeconds: sekunden, width: 960 });
    } catch {
      // Signatur nicht konfiguriert — dann eben das nächste Bild in der Staffel.
    }
  }
  return v.thumbnailSignedUrl ?? modul.thumbnailSignedUrl ?? null;
}

/**
 * Eine beliebige Lektion als fertige Karte „Als nächstes“ — die Antwort von
 * `GET /api/dashboard/lektion`.
 *
 * Bewusst dieselbe Form wie der serverseitig gebaute Ersteintrag: Die Karte
 * tauscht beim Blättern nur ihren Inhalt aus und muss keine zwei Fälle kennen.
 * `kind` (und damit die Beschriftung des Knopfes) hängt am Fortschritt der
 * gezeigten Lektion, nicht am Modul: Wer eine noch nie geöffnete Lektion
 * vorblättert, liest dort „Jetzt starten“.
 *
 * Geblättert wird nur in der Ansicht — hier wird nichts geschrieben.
 */
export async function getLektionsKarte(
  supabase: ServerSupabase,
  rows: AcademyModuleRow[],
  moduleId: string,
  videoId: string,
  /** `user_progress.video_progress_by_video` des Moduls, bereits geparst. */
  videoFortschritt: Record<string, number>,
): Promise<ContinueItem | null> {
  const u = await ladeUmgebung(supabase, rows, moduleId);
  if (u.i < 0) return null;
  const modul = rows[u.i];
  const position = u.aktuell.findIndex((v) => v.id === videoId);
  if (position < 0) return null;
  const v = u.aktuell[position];

  const sekunden = Math.max(0, videoFortschritt[videoId] ?? 0);
  const dauer = v.duration_seconds ?? 0;
  const { prevVideoId, nextVideoId } = fensterAn(u, position);

  return {
    kind: sekunden > 0 ? "resume" : "start",
    videoId,
    // Tiefer Link auf genau diese Lektion — nicht auf das Modul: Sonst öffnete
    // der Knopf die zuletzt gesehene Lektion statt der angezeigten.
    href: lessonHref({ id: modul.id, slug: modul.slug }, videoId),
    moduleTitle: modul.title,
    lessonLabel: u.aktuell.length > 0 ? `Lektion ${position + 1} von ${u.aktuell.length}` : null,
    videoTitle: v.title,
    description: modul.description?.trim() || null,
    progressPercent: Math.max(0, Math.min(100, Math.round(modul.progressPercent ?? 0))),
    thumbnailUrl: lektionsBild(v, modul, sekunden),
    videoStorageKey: v.cloudflare_uid ?? (v.storage_key || null),
    startAtSeconds: dauer > 0 ? Math.min(sekunden, dauer - 0.25) : sekunden,
    prevVideoId,
    nextVideoId,
  };
}
