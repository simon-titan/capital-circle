import type { createClient } from "@/lib/supabase/server";
import { getPresignedGetUrl } from "@/lib/storage";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type PlaylistVideoRow = {
  id: string;
  title: string;
  description: string | null;
  storage_key: string;
  thumbnail_key: string | null;
  thumbnailSignedUrl: string | null;
  duration_seconds: number | null;
  position: number;
  subcategoryId: string | null;
  subcategoryTitle: string | null;
};

/** Mindest-Sekunden bei fehlender Dauer in der DB (kein 1-Sekunden-Scrub als „fertig“). */
const MIN_WATCHED_SECONDS_WHEN_NO_DURATION = 30;

/** Mindest-Anteil der Videodauer der angesehen sein muss (90%). */
const MIN_WATCHED_RATIO = 0.9;

/** Video gilt als vollständig angesehen (Fortschritt nahe Dauer). */
export function isPlaylistVideoDone(v: PlaylistVideoRow, progressMap: Record<string, number>): boolean {
  const d = v.duration_seconds ?? 0;
  const w = progressMap[v.id] ?? 0;
  // Ohne verlässliche Dauer: nur nach ausreichend langer Wiedergabe als fertig zählen
  if (d <= 0) return w >= MIN_WATCHED_SECONDS_WHEN_NO_DURATION;
  // Mit Dauer: mindestens 90% gesehen (robuster als d-1 bei kurzen Videos)
  return w >= d * MIN_WATCHED_RATIO;
}

async function signKey(key: string | null | undefined): Promise<string | null> {
  if (!key?.trim()) return null;
  try {
    return await getPresignedGetUrl(key.trim());
  } catch {
    return null;
  }
}

type DurationRow = { id: string; duration_seconds: number | null };

type VideoRow = {
  id: string;
  title: string;
  description?: string | null;
  storage_key: string;
  thumbnail_key: string | null;
  duration_seconds: number | null;
  position: number;
  module_id?: string;
  subcategory_id?: string | null;
};

/**
 * Nur Video-IDs und Dauern in Playlist-Reihenfolge — keine Thumbnails, keine Presigns (z. B. POST /api/progress).
 */
export async function getModulePlaylistDurationsOnly(
  supabase: ServerClient,
  moduleId: string,
): Promise<DurationRow[]> {
  const { data: direct } = await supabase
    .from("videos")
    .select("id,duration_seconds,position")
    .eq("module_id", moduleId)
    .is("subcategory_id", null)
    .eq("is_published", true)
    .order("position", { ascending: true });

  const { data: subs } = await supabase
    .from("subcategories")
    .select("id,position")
    .eq("module_id", moduleId)
    .order("position", { ascending: true });

  const subIds = (subs ?? []).map((s) => s.id).filter(Boolean);
  type SubVidRow = {
    id: string;
    duration_seconds: number | null;
    position: number;
    subcategory_id: string | null;
  };
  const { data: subVideoRows } =
    subIds.length > 0
      ? await supabase
          .from("videos")
          .select("id,duration_seconds,position,subcategory_id")
          .in("subcategory_id", subIds)
          .eq("is_published", true)
      : { data: [] as SubVidRow[] };

  const videosBySubId = new Map<string, SubVidRow[]>();
  for (const v of (subVideoRows ?? []) as SubVidRow[]) {
    const sid = v.subcategory_id;
    if (!sid) continue;
    const arr = videosBySubId.get(sid) ?? [];
    arr.push(v);
    videosBySubId.set(sid, arr);
  }
  for (const [, arr] of videosBySubId) {
    arr.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  const out: DurationRow[] = [];
  for (const v of direct ?? []) {
    out.push({ id: v.id, duration_seconds: v.duration_seconds });
  }
  for (const sub of subs ?? []) {
    for (const v of videosBySubId.get(sub.id) ?? []) {
      out.push({ id: v.id, duration_seconds: v.duration_seconds });
    }
  }
  return out;
}

/**
 * Erstes veröffentlichtes Video: zuerst direkt am Modul, sonst erste Subkategorie (nach position).
 */
export async function getPrimaryPublishedVideoStorageKey(
  supabase: ServerClient,
  moduleId: string,
): Promise<string | null> {
  const { data: direct } = await supabase
    .from("videos")
    .select("storage_key")
    .eq("module_id", moduleId)
    .is("subcategory_id", null)
    .eq("is_published", true)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (direct?.storage_key) return direct.storage_key;

  const { data: subs } = await supabase
    .from("subcategories")
    .select("id")
    .eq("module_id", moduleId)
    .order("position", { ascending: true });

  const subIds = (subs ?? []).map((s) => s.id).filter(Boolean);
  if (subIds.length === 0) return null;

  const { data: subVideos } = await supabase
    .from("videos")
    .select("storage_key,subcategory_id,position")
    .in("subcategory_id", subIds)
    .eq("is_published", true);

  const bySub = new Map<string, { storage_key: string; position: number }[]>();
  for (const v of subVideos ?? []) {
    const sid = v.subcategory_id;
    if (!sid || !v.storage_key) continue;
    const arr = bySub.get(sid) ?? [];
    arr.push({ storage_key: v.storage_key, position: v.position ?? 0 });
    bySub.set(sid, arr);
  }
  for (const [, arr] of bySub) {
    arr.sort((a, b) => a.position - b.position);
  }

  for (const sub of subs ?? []) {
    const first = bySub.get(sub.id)?.[0];
    if (first?.storage_key) return first.storage_key;
  }

  return null;
}

/**
 * Geordnete Playlist: direkte Modul-Videos, dann je Subkategorie deren Videos.
 */
export async function getModulePublishedPlaylist(supabase: ServerClient, moduleId: string): Promise<PlaylistVideoRow[]> {
  const raw: Omit<PlaylistVideoRow, "thumbnailSignedUrl">[] = [];

  const { data: direct } = await supabase
    .from("videos")
    .select("id,title,description,storage_key,thumbnail_key,duration_seconds,position")
    .eq("module_id", moduleId)
    .is("subcategory_id", null)
    .eq("is_published", true)
    .order("position", { ascending: true });

  for (const v of direct ?? []) {
    raw.push({
      id: v.id,
      title: v.title,
      description: v.description ?? null,
      storage_key: v.storage_key,
      thumbnail_key: v.thumbnail_key,
      duration_seconds: v.duration_seconds,
      position: v.position,
      subcategoryId: null,
      subcategoryTitle: null,
    });
  }

  const { data: subs } = await supabase
    .from("subcategories")
    .select("id,title,position")
    .eq("module_id", moduleId)
    .order("position", { ascending: true });

  const subIdsPlaylist = (subs ?? []).map((s) => s.id).filter(Boolean);
  const { data: subVideoRowsPlaylist } =
    subIdsPlaylist.length > 0
      ? await supabase
          .from("videos")
          .select("id,title,description,storage_key,thumbnail_key,duration_seconds,position,subcategory_id")
          .in("subcategory_id", subIdsPlaylist)
          .eq("is_published", true)
      : { data: [] as VideoRow[] };

  const videosBySubIdPlaylist = new Map<string, VideoRow[]>();
  for (const v of (subVideoRowsPlaylist ?? []) as VideoRow[]) {
    const sid = v.subcategory_id;
    if (!sid) continue;
    const arr = videosBySubIdPlaylist.get(sid) ?? [];
    arr.push(v);
    videosBySubIdPlaylist.set(sid, arr);
  }
  for (const [, arr] of videosBySubIdPlaylist) {
    arr.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  for (const sub of subs ?? []) {
    for (const v of videosBySubIdPlaylist.get(sub.id) ?? []) {
      raw.push({
        id: v.id,
        title: v.title,
        description: v.description ?? null,
        storage_key: v.storage_key,
        thumbnail_key: v.thumbnail_key,
        duration_seconds: v.duration_seconds,
        position: v.position,
        subcategoryId: sub.id,
        subcategoryTitle: sub.title,
      });
    }
  }

  const signedUrls = await Promise.all(raw.map((v) => signKey(v.thumbnail_key)));
  return raw.map((v, i) => ({ ...v, thumbnailSignedUrl: signedUrls[i] ?? null }));
}

export function totalPlaylistDurationSeconds(videos: PlaylistVideoRow[]): number {
  return videos.reduce((s, v) => s + (v.duration_seconds ?? 0), 0);
}

/**
 * Alle veröffentlichten Playlists für viele Module in wenigen Queries (kein N+1).
 */
export async function getModulePublishedPlaylistsBulk(
  supabase: ServerClient,
  moduleIds: string[],
): Promise<Map<string, PlaylistVideoRow[]>> {
  const map = new Map<string, PlaylistVideoRow[]>();
  for (const id of moduleIds) map.set(id, []);
  if (moduleIds.length === 0) return map;

  const { data: directRows } = await supabase
    .from("videos")
    .select("id,title,description,storage_key,thumbnail_key,duration_seconds,position,module_id")
    .in("module_id", moduleIds)
    .is("subcategory_id", null)
    .eq("is_published", true);

  const { data: subRows } = await supabase
    .from("subcategories")
    .select("id,title,position,module_id")
    .in("module_id", moduleIds)
    .order("position", { ascending: true });

  const subIds = (subRows ?? []).map((s) => s.id).filter(Boolean);
  const { data: subVideoRows } =
    subIds.length > 0
      ? await supabase
          .from("videos")
          .select("id,title,description,storage_key,thumbnail_key,duration_seconds,position,subcategory_id")
          .in("subcategory_id", subIds)
          .eq("is_published", true)
      : { data: [] as VideoRow[] };

  const directByModule = new Map<string, VideoRow[]>();
  for (const v of (directRows ?? []) as VideoRow[]) {
    const mid = v.module_id;
    if (!mid) continue;
    const arr = directByModule.get(mid) ?? [];
    arr.push(v);
    directByModule.set(mid, arr);
  }
  for (const [, arr] of directByModule) {
    arr.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  const subsByModule = new Map<string, { id: string; title: string; position: number }[]>();
  for (const s of subRows ?? []) {
    const mid = s.module_id as string;
    const arr = subsByModule.get(mid) ?? [];
    arr.push({ id: s.id, title: s.title, position: s.position });
    subsByModule.set(mid, arr);
  }
  for (const [, arr] of subsByModule) {
    arr.sort((a, b) => a.position - b.position);
  }

  const videosBySubId = new Map<string, VideoRow[]>();
  for (const v of (subVideoRows ?? []) as VideoRow[]) {
    const sid = v.subcategory_id;
    if (!sid) continue;
    const arr = videosBySubId.get(sid) ?? [];
    arr.push(v);
    videosBySubId.set(sid, arr);
  }
  for (const [, arr] of videosBySubId) {
    arr.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  const allRaw: (Omit<PlaylistVideoRow, "thumbnailSignedUrl"> & { _moduleId: string })[] = [];

  for (const moduleId of moduleIds) {
    for (const v of directByModule.get(moduleId) ?? []) {
      allRaw.push({
        _moduleId: moduleId,
        id: v.id,
        title: v.title,
        description: v.description ?? null,
        storage_key: v.storage_key,
        thumbnail_key: v.thumbnail_key,
        duration_seconds: v.duration_seconds,
        position: v.position,
        subcategoryId: null,
        subcategoryTitle: null,
      });
    }
    for (const sub of subsByModule.get(moduleId) ?? []) {
      for (const v of videosBySubId.get(sub.id) ?? []) {
        allRaw.push({
          _moduleId: moduleId,
          id: v.id,
          title: v.title,
          description: v.description ?? null,
          storage_key: v.storage_key,
          thumbnail_key: v.thumbnail_key,
          duration_seconds: v.duration_seconds,
          position: v.position,
          subcategoryId: sub.id,
          subcategoryTitle: sub.title,
        });
      }
    }
  }

  const signedUrls = await Promise.all(allRaw.map((v) => signKey(v.thumbnail_key)));
  for (let i = 0; i < allRaw.length; i++) {
    const { _moduleId, ...rest } = allRaw[i];
    const row: PlaylistVideoRow = { ...rest, thumbnailSignedUrl: signedUrls[i] ?? null };
    map.get(_moduleId)!.push(row);
  }

  return map;
}
