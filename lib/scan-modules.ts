import type { createClient } from "@/lib/supabase/server";
import { listFolderPrefixes, listObjectKeysUnderPrefix } from "@/lib/storage";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Feste ID des internen "Nicht zugeordnet"-Kurses (muss mit Migration 036 übereinstimmen). */
export const UNASSIGNED_COURSE_ID = "00000000-0000-0000-0000-000000000001";

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

/**
 * Ergänzt leere Modul- und Unterordner (nur S3 CommonPrefixes, keine Objekt-Keys).
 * Ohne diese Erkennung erscheinen leere Ordner nicht in `parseModuleScanKeys`.
 */
function mergeEmptyFoldersIntoParsed(
  parsed: Map<string, ParsedModuleFolder>,
  modulePrefixes: string[],
  subPrefixesByModule: Map<string, string[]>,
): void {
  for (const prefix of modulePrefixes) {
    const parts = prefix.replace(/\/$/, "").split("/").filter(Boolean);
    if (parts.length < 2 || parts[0].toLowerCase() !== "modules") continue;
    const moduleFolder = parts[1];
    if (!moduleFolder) continue;

    if (!parsed.has(moduleFolder)) {
      parsed.set(moduleFolder, {
        storageFolderKey: moduleFolder,
        folderTitle: humanizeFolder(moduleFolder),
        slugBase: slugifySegment(moduleFolder),
        thumbnailKey: null,
        directVideos: [],
        subfolders: new Map(),
      });
    }
    const entry = parsed.get(moduleFolder)!;
    const subs = subPrefixesByModule.get(moduleFolder) ?? [];
    for (const sp of subs) {
      const sparts = sp.replace(/\/$/, "").split("/").filter(Boolean);
      const subName = sparts[2];
      if (!subName) continue;
      if (!entry.subfolders.has(subName)) {
        entry.subfolders.set(subName, { title: humanizeFolder(subName), videos: [] });
      }
    }
  }
}

/** Höchste Video-Position unter Modul (direkt) bzw. unter Subkategorie — Basis für neue Einträge ans Ende. */
async function maxVideoPosition(
  supabase: ServerClient,
  moduleId: string,
  subcategoryId: string | null,
): Promise<number> {
  const base = supabase.from("videos").select("position").order("position", { ascending: false }).limit(1);
  const { data } = subcategoryId
    ? await base.eq("subcategory_id", subcategoryId).maybeSingle()
    : await base.eq("module_id", moduleId).is("subcategory_id", null).maybeSingle();
  const p = data?.position;
  return typeof p === "number" ? p : -1;
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

/**
 * Synchronisiert alle gescannten Modul-Ordner global in die DB.
 *
 * Regeln:
 * - Modul bereits vorhanden (Treffer via storage_folder_key, kursübergreifend):
 *   → Nur Metadaten (thumbnail) aktualisieren. course_id und title werden NICHT geändert.
 *   → Umbenennung in der DB bleibt erhalten, kein Duplikat entsteht.
 * - Modul noch nicht vorhanden:
 *   → Wird in den "Nicht zugeordnet"-Kurs eingefügt (UNASSIGNED_COURSE_ID).
 *   → Admin kann es danach manuell einem echten Kurs zuordnen.
 * - Videos/Subkategorien: Nur neue Keys werden eingefügt, bestehende bleiben unberührt.
 * - Subkategorien: Zuordnung über storage_folder_key (Bucket-Unterordnername); Legacy-Zeilen ohne Key
 *   werden einmalig per title gematcht und erhalten storage_folder_key (Titel/Position unverändert).
 * - Neue Videos erhalten Positionen ans Ende (max+1), keine Neu-Sortierung bestehender Einträge.
 */
export async function syncParsedModulesGlobal(
  supabase: ServerClient,
  parsed: Map<string, ParsedModuleFolder>,
): Promise<ScanSyncResult> {
  const errors: string[] = [];
  let modulesTouched = 0;
  let videosCreated = 0;
  let subcategoriesCreated = 0;

  // Nächste order_index für neue Module im Unassigned-Kurs
  const { data: maxRow } = await supabase
    .from("modules")
    .select("order_index")
    .eq("course_id", UNASSIGNED_COURSE_ID)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  let nextOrder = (maxRow?.order_index as number | undefined) ?? 0;

  for (const [, folder] of parsed) {
    try {
      // Globale Suche: storage_folder_key ist jetzt kursübergreifend unique (Index 036).
      // Findet das Modul egal in welchem Kurs es liegt.
      const { data: byStorage } = await supabase
        .from("modules")
        .select("id,title,slug,course_id")
        .eq("storage_folder_key", folder.storageFolderKey)
        .maybeSingle();

      let moduleId: string;

      if (byStorage?.id) {
        // Modul existiert bereits — nur Thumbnail aktualisieren.
        // course_id, title, slug werden bewusst NICHT geändert (Umbenennung-Schutz).
        moduleId = byStorage.id;
        const updates: Record<string, unknown> = {};
        if (folder.thumbnailKey) updates.thumbnail_storage_key = folder.thumbnailKey;
        if (!byStorage.slug) {
          updates.slug = await nextUniqueModuleSlug(supabase, folder.slugBase);
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from("modules").update(updates).eq("id", moduleId);
        }
      } else {
        // Neues Modul: landet im "Nicht zugeordnet"-Kurs.
        nextOrder += 1;
        const uniqueSlug = await nextUniqueModuleSlug(supabase, folder.slugBase);
        const { data: inserted, error: insErr } = await supabase
          .from("modules")
          .insert({
            course_id: UNASSIGNED_COURSE_ID,
            title: folder.folderTitle,
            description: null,
            order_index: nextOrder,
            is_published: false,
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

      // Videos und Subkategorien: nur neue Keys einfügen, keine bestehenden anfassen.
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

      let nextDirectPos = (await maxVideoPosition(supabase, moduleId, null)) + 1;
      for (const v of folder.directVideos.sort((a, b) => a.storageKey.localeCompare(b.storageKey))) {
        if (existingKeys.has(v.storageKey)) continue;
        const { error: vErr } = await supabase.from("videos").insert({
          module_id: moduleId,
          subcategory_id: null,
          title: v.title,
          position: nextDirectPos,
          storage_key: v.storageKey,
          is_published: true,
        });
        if (vErr) errors.push(`${v.title}: ${vErr.message}`);
        else {
          videosCreated += 1;
          existingKeys.add(v.storageKey);
          nextDirectPos += 1;
        }
      }

      const subEntries = [...folder.subfolders.entries()].sort(([a], [b]) => a.localeCompare(b));
      let subPos = 0;
      for (const [subFolderKey, sub] of subEntries) {
        const { data: byStorageKey } = await supabase
          .from("subcategories")
          .select("id")
          .eq("module_id", moduleId)
          .eq("storage_folder_key", subFolderKey)
          .maybeSingle();

        let subId: string;
        if (byStorageKey?.id) {
          subId = byStorageKey.id;
        } else {
          const { data: legacyRow } = await supabase
            .from("subcategories")
            .select("id")
            .eq("module_id", moduleId)
            .eq("title", sub.title)
            .is("storage_folder_key", null)
            .maybeSingle();

          if (legacyRow?.id) {
            subId = legacyRow.id;
            await supabase
              .from("subcategories")
              .update({ storage_folder_key: subFolderKey })
              .eq("id", subId);
          } else {
            const { data: insSub, error: sErr } = await supabase
              .from("subcategories")
              .insert({
                module_id: moduleId,
                title: sub.title,
                position: subPos,
                storage_folder_key: subFolderKey,
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
        }
        subPos += 1;

        let nextSubVideoPos = (await maxVideoPosition(supabase, moduleId, subId)) + 1;
        for (const v of sub.videos.sort((a, b) => a.storageKey.localeCompare(b.storageKey))) {
          if (existingKeys.has(v.storageKey)) continue;
          const { error: vErr } = await supabase.from("videos").insert({
            module_id: null,
            subcategory_id: subId,
            title: v.title,
            position: nextSubVideoPos,
            storage_key: v.storageKey,
            is_published: true,
          });
          if (vErr) errors.push(`${sub.title}/${v.title}: ${vErr.message}`);
          else {
            videosCreated += 1;
            existingKeys.add(v.storageKey);
            nextSubVideoPos += 1;
          }
        }
      }
    } catch (e) {
      errors.push(folder.folderTitle + ": " + (e instanceof Error ? e.message : String(e)));
    }
  }

  return { modulesTouched, videosCreated, subcategoriesCreated, errors };
}

/** Scannt den gesamten Bucket und synchronisiert alle Module global (ohne Kurs-Zuweisung). */
export async function runModuleScan(supabase: ServerClient, prefix = "modules") {
  const keys = await scanModulesFromBucket(prefix);
  const parsed = parseModuleScanKeys(keys);

  const modulePrefixes = await listFolderPrefixes(prefix);
  const subPrefixesByModule = new Map<string, string[]>();
  for (const mp of modulePrefixes) {
    const parts = mp.replace(/\/$/, "").split("/").filter(Boolean);
    const moduleFolder = parts[1];
    if (!moduleFolder) continue;
    const subs = await listFolderPrefixes(mp);
    subPrefixesByModule.set(moduleFolder, subs);
  }
  mergeEmptyFoldersIntoParsed(parsed, modulePrefixes, subPrefixesByModule);

  const result = await syncParsedModulesGlobal(supabase, parsed);
  return { ...result, keyCount: keys.length, moduleFolders: parsed.size };
}

/**
 * @deprecated Verwende stattdessen `runModuleScan` (ohne courseId).
 * Bleibt für Rückwärtskompatibilität erhalten.
 */
export async function runModuleScanForCourse(supabase: ServerClient, _courseId: string, prefix = "modules") {
  return runModuleScan(supabase, prefix);
}
