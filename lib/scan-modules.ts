import type { createClient } from "@/lib/supabase/server";
import { listObjectKeysUnderPrefix } from "@/lib/storage";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

const VIDEO_EXT = /\.(mp4|webm|mov)$/i;
const THUMB_EXT = /^thumbnail\.(jpe?g|png|webp)$/i;

export type ParsedModuleFolder = {
  /** Roher Ordnername im Bucket (z. B. `Module_Title`), eindeutiger Anker für Sync */
  storageFolderKey: string;
  folderTitle: string;
  slugBase: string;
  thumbnailKey: string | null;
  directVideos: Array<{ storageKey: string; title: string }>;
  subfolders: Map<
    string,
    {
      title: string;
      videos: Array<{ storageKey: string; title: string }>;
    }
  >;
};

function slugifySegment(input: string): string {
  const s = input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return s || "modul";
}

function humanizeFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim() || "Video";
}

function humanizeFolder(name: string): string {
  return name.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim() || "Modul";
}

/** Parst S3-Keys unter Prefix `modules/` (modules/ModulName/...). */
export function parseModuleScanKeys(rawKeys: string[]): Map<string, ParsedModuleFolder> {
  const byModule = new Map<string, ParsedModuleFolder>();

  for (const full of rawKeys) {
    const parts = full.split("/").filter(Boolean);
    if (parts.length < 2 || parts[0].toLowerCase() !== "modules") continue;
    const moduleFolder = parts[1];
    if (!moduleFolder) continue;

    let entry = byModule.get(moduleFolder);
    if (!entry) {
      entry = {
        storageFolderKey: moduleFolder,
        folderTitle: humanizeFolder(moduleFolder),
        slugBase: slugifySegment(moduleFolder),
        thumbnailKey: null,
        directVideos: [],
        subfolders: new Map(),
      };
      byModule.set(moduleFolder, entry);
    }

    if (parts.length === 3) {
      const leaf = parts[2];
      if (THUMB_EXT.test(leaf)) {
        entry.thumbnailKey = full;
        continue;
      }
      if (VIDEO_EXT.test(leaf)) {
        entry.directVideos.push({ storageKey: full, title: humanizeFilename(leaf) });
      }
      continue;
    }

    if (parts.length >= 4) {
      const subName = parts[2];
      const leaf = parts[parts.length - 1];
      if (!subName || !leaf) continue;
      if (!VIDEO_EXT.test(leaf)) continue;

      let sub = entry.subfolders.get(subName);
      if (!sub) {
        sub = { title: humanizeFolder(subName), videos: [] };
        entry.subfolders.set(subName, sub);
      }
      sub.videos.push({ storageKey: full, title: humanizeFilename(leaf) });
    }
  }

  return byModule;
}

async function nextUniqueModuleSlug(supabase: ServerClient, base: string): Promise<string> {
  let candidate = base;
  let n = 0;
  while (true) {
    const { data } = await supabase.from("modules").select("id").eq("slug", candidate).maybeSingle();
    if (!data?.id) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export type ScanSyncResult = {
  modulesTouched: number;
  videosCreated: number;
  subcategoriesCreated: number;
  errors: string[];
};

export async function scanModulesFromBucket(prefix = "modules"): Promise<string[]> {
  const listed = await listObjectKeysUnderPrefix(prefix);
  return listed.map((o) => o.key);
}

export async function syncParsedModulesToCourse(
  supabase: ServerClient,
  courseId: string,
  parsed: Map<string, ParsedModuleFolder>,
): Promise<ScanSyncResult> {
  const errors: string[] = [];
  let modulesTouched = 0;
  let videosCreated = 0;
  let subcategoriesCreated = 0;

  const { data: maxRow } = await supabase
    .from("modules")
    .select("order_index")
    .eq("course_id", courseId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  let nextOrder = (maxRow?.order_index as number | undefined) ?? 0;

  for (const [, folder] of parsed) {
    try {
      const { data: byStorage } = await supabase
        .from("modules")
        .select("id,title,slug")
        .eq("course_id", courseId)
        .eq("storage_folder_key", folder.storageFolderKey)
        .maybeSingle();

      const { data: bySlug } = await supabase
        .from("modules")
        .select("id,title,slug")
        .eq("course_id", courseId)
        .eq("slug", folder.slugBase)
        .maybeSingle();

      const { data: byTitle } = await supabase
        .from("modules")
        .select("id,slug")
        .eq("course_id", courseId)
        .eq("title", folder.folderTitle)
        .maybeSingle();

      /** Reihenfolge: Storage-Ordnername (am zuverlässigsten), dann Slug, dann Titel */
      const matchRow = byStorage?.id ? byStorage : bySlug?.id ? bySlug : byTitle?.id ? byTitle : null;

      let moduleId: string;
      if (matchRow?.id) {
        moduleId = matchRow.id;
        const updates: Record<string, unknown> = { storage_folder_key: folder.storageFolderKey };
        if (folder.thumbnailKey) updates.thumbnail_storage_key = folder.thumbnailKey;
        if (!matchRow.slug) {
          updates.slug = await nextUniqueModuleSlug(supabase, folder.slugBase);
        }
        await supabase.from("modules").update(updates).eq("id", moduleId);
      } else {
        nextOrder += 1;
        const uniqueSlug = await nextUniqueModuleSlug(supabase, folder.slugBase);
        const { data: inserted, error: insErr } = await supabase
          .from("modules")
          .insert({
            course_id: courseId,
            title: folder.folderTitle,
            description: null,
            order_index: nextOrder,
            is_published: true,
            slug: uniqueSlug,
            thumbnail_storage_key: folder.thumbnailKey,
            storage_folder_key: folder.storageFolderKey,
          })
          .select("id")
          .single();
        if (insErr || !inserted?.id) {
          errors.push(`${folder.folderTitle}: ${insErr?.message ?? "insert failed"}`);
          continue;
        }
        moduleId = inserted.id;
      }

      modulesTouched += 1;

      const { data: directV } = await supabase.from("videos").select("storage_key").eq("module_id", moduleId);
      const { data: subRows } = await supabase.from("subcategories").select("id").eq("module_id", moduleId);
      const subIds = (subRows ?? []).map((s) => s.id).filter(Boolean);
      const { data: subV } =
        subIds.length > 0
          ? await supabase.from("videos").select("storage_key").in("subcategory_id", subIds)
          : { data: [] as { storage_key: string }[] };
      const existingKeys = new Set([
        ...(directV ?? []).map((v) => v.storage_key),
        ...(subV ?? []).map((v) => v.storage_key),
      ]);

      let pos = 0;
      for (const v of folder.directVideos.sort((a, b) => a.storageKey.localeCompare(b.storageKey))) {
        if (existingKeys.has(v.storageKey)) {
          pos += 1;
          continue;
        }
        const { error: vErr } = await supabase.from("videos").insert({
          module_id: moduleId,
          subcategory_id: null,
          title: v.title,
          position: pos,
          storage_key: v.storageKey,
          is_published: true,
        });
        if (vErr) errors.push(`${v.title}: ${vErr.message}`);
        else {
          videosCreated += 1;
          existingKeys.add(v.storageKey);
        }
        pos += 1;
      }

      const subEntries = [...folder.subfolders.entries()].sort(([a], [b]) => a.localeCompare(b));
      let subPos = 0;
      for (const [, sub] of subEntries) {
        const { data: subRow } = await supabase
          .from("subcategories")
          .select("id")
          .eq("module_id", moduleId)
          .eq("title", sub.title)
          .maybeSingle();

        let subId: string;
        if (subRow?.id) {
          subId = subRow.id;
        } else {
          const { data: insSub, error: sErr } = await supabase
            .from("subcategories")
            .insert({
              module_id: moduleId,
              title: sub.title,
              position: subPos,
            })
            .select("id")
            .single();
          if (sErr || !insSub?.id) {
            errors.push(`Sub ${sub.title}: ${sErr?.message ?? "fail"}`);
            continue;
          }
          subId = insSub.id;
          subcategoriesCreated += 1;
        }
        subPos += 1;

        let vPos = 0;
        for (const v of sub.videos.sort((a, b) => a.storageKey.localeCompare(b.storageKey))) {
          if (existingKeys.has(v.storageKey)) {
            vPos += 1;
            continue;
          }
          const { error: vErr } = await supabase.from("videos").insert({
            module_id: null,
            subcategory_id: subId,
            title: v.title,
            position: vPos,
            storage_key: v.storageKey,
            is_published: true,
          });
          if (vErr) errors.push(`${sub.title}/${v.title}: ${vErr.message}`);
          else {
            videosCreated += 1;
            existingKeys.add(v.storageKey);
          }
          vPos += 1;
        }
      }
    } catch (e) {
      errors.push(folder.folderTitle + ": " + (e instanceof Error ? e.message : String(e)));
    }
  }

  return { modulesTouched, videosCreated, subcategoriesCreated, errors };
}

export async function runModuleScanForCourse(supabase: ServerClient, courseId: string, prefix = "modules") {
  const keys = await scanModulesFromBucket(prefix);
  const parsed = parseModuleScanKeys(keys);
  const result = await syncParsedModulesToCourse(supabase, courseId, parsed);
  return { ...result, keyCount: keys.length, moduleFolders: parsed.size };
}
