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

type SubVidRow = {
  id: string;
  duration_seconds: number | null;
  position: number;
  subcategory_id: string | null;
};

/** Direkte Modul-Videos und Subkategorien teilen sich einen gemeinsamen `position`-Index (Admin-Reihenfolge). */
function interleaveModuleContent<T extends { position: number }>(
  directItems: T[],
  subs: { id: string; title: string; position: number }[],
): Array<
  | { kind: "direct"; item: T }
  | { kind: "sub"; sub: { id: string; title: string } }
> {
  const union: Array<
    | { pos: number; kind: "direct"; item: T }
    | { pos: number; kind: "sub"; sub: { id: string; title: string } }
  > = [
    ...directItems.map((item) => ({ pos: item.position ?? 0, kind: "direct" as const, item })),
    ...subs.map((s) => ({
      pos: s.position ?? 0,
      kind: "sub" as const,
      sub: { id: s.id, title: s.title },
    })),
  ];
  union.sort((a, b) => a.pos - b.pos);
  return union.map((u) =>
    u.kind === "direct" ? { kind: "direct", item: u.item } : { kind: "sub", sub: u.sub },
  );
}

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
    .eq("is_published", true);

  const { data: subs } = await supabase
    .from("subcategories")
    .select("id,title,position")
    .eq("module_id", moduleId);

  const subIds = (subs ?? []).map((s) => s.id).filter(Boolean);
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

  const slots = interleaveModuleContent(
    (direct ?? []) as Array<{ id: string; duration_seconds: number | null; position: number }>,
    subs ?? [],
  );

  const out: DurationRow[] = [];
  for (const slot of slots) {
    if (slot.kind === "direct") {
      out.push({ id: slot.item.id, duration_seconds: slot.item.duration_seconds });
    } else {
      for (const v of videosBySubId.get(slot.sub.id) ?? []) {
        out.push({ id: v.id, duration_seconds: v.duration_seconds });
      }
    }
  }
  return out;
}

/**
 * Erstes veröffentlichtes Video in der gemischten Modul-Reihenfolge (direkte Videos + Subkategorien nach `position`).
 */
export async function getPrimaryPublishedVideoStorageKey(
  supabase: ServerClient,
  moduleId: string,
): Promise<string | null> {
  const { data: direct } = await supabase
    .from("videos")
    .select("id,storage_key,position")
    .eq("module_id", moduleId)
    .is("subcategory_id", null)
    .eq("is_published", true);

  const { data: subs } = await supabase
    .from("subcategories")
    .select("id,title,position")
    .eq("module_id", moduleId);

  const subIds = (subs ?? []).map((s) => s.id).filter(Boolean);
  const { data: subVideos } =
    subIds.length > 0
      ? await supabase
          .from("videos")
          .select("storage_key,subcategory_id,position")
          .in("subcategory_id", subIds)
          .eq("is_published", true)
      : { data: [] as { storage_key: string; subcategory_id: string | null; position: number }[] };

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

  const slots = interleaveModuleContent(
    (direct ?? []) as Array<{ id: string; storage_key: string; position: number }>,
    subs ?? [],
  );

  for (const slot of slots) {
    if (slot.kind === "direct") {
      if (slot.item.storage_key) return slot.item.storage_key;
    } else {
      const first = bySub.get(slot.sub.id)?.[0];
      if (first?.storage_key) return first.storage_key;
    }
  }

  return null;
}

/**
 * Geordnete Playlist: direkte Modul-Videos und Subkategorie-Blöcke gemischt nach gemeinsamer `position`, darin Videos nach `position`.
 */
export async function getModulePublishedPlaylist(supabase: ServerClient, moduleId: string): Promise<PlaylistVideoRow[]> {
  const raw: Omit<PlaylistVideoRow, "thumbnailSignedUrl">[] = [];

  const { data: direct } = await supabase
    .from("videos")
    .select("id,title,description,storage_key,thumbnail_key,duration_seconds,position")
    .eq("module_id", moduleId)
    .is("subcategory_id", null)
    .eq("is_published", true);

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

  const slots = interleaveModuleContent((direct ?? []) as VideoRow[], subs ?? []);

  for (const slot of slots) {
    if (slot.kind === "direct") {
      const v = slot.item;
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
    } else {
      const sub = slot.sub;
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
    const direct = directByModule.get(moduleId) ?? [];
    const subsList = subsByModule.get(moduleId) ?? [];
    const slots = interleaveModuleContent(direct, subsList);
    for (const slot of slots) {
      if (slot.kind === "direct") {
        const v = slot.item;
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
      } else {
        const sub = slot.sub;
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
  }

  const signedUrls = await Promise.all(allRaw.map((v) => signKey(v.thumbnail_key)));
  for (let i = 0; i < allRaw.length; i++) {
    const { _moduleId, ...rest } = allRaw[i];
    const row: PlaylistVideoRow = { ...rest, thumbnailSignedUrl: signedUrls[i] ?? null };
    map.get(_moduleId)!.push(row);
  }

  return map;
}
