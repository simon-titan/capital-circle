import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { nextUniqueModuleSlug, slugifySegment } from "@/lib/scan-modules";
import { transferVideoProgress } from "@/lib/progress-transfer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteParams = { params: Promise<{ subcategoryId: string }> };

/**
 * Wandelt eine Subkategorie in ein eigenständiges Modul (im selben Kurs) um:
 * neues Modul am Kursende, Videos umhängen, User-Fortschritt übertragen, leere Subkategorie löschen.
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { subcategoryId } = await params;
  if (!subcategoryId || !UUID_RE.test(subcategoryId)) {
    return NextResponse.json({ ok: false, error: "invalid_subcategory_id" }, { status: 400 });
  }

  // Subkategorie + Parent-Modul laden
  const { data: sub, error: subErr } = await supabase
    .from("subcategories")
    .select("id,module_id,title")
    .eq("id", subcategoryId)
    .maybeSingle();
  if (subErr || !sub?.id) {
    return NextResponse.json({ ok: false, error: "subcategory_not_found" }, { status: 404 });
  }

  const parentModuleId = sub.module_id as string;
  const { data: parentModule, error: modErr } = await supabase
    .from("modules")
    .select("id,course_id,is_published")
    .eq("id", parentModuleId)
    .maybeSingle();
  if (modErr || !parentModule?.id) {
    return NextResponse.json({ ok: false, error: "parent_module_not_found" }, { status: 404 });
  }
  const courseId = parentModule.course_id as string;

  // Video-IDs der Subkategorie (vor dem Umhängen für den Progress-Transfer einsammeln)
  const { data: vids } = await supabase
    .from("videos")
    .select("id")
    .eq("subcategory_id", subcategoryId);
  const videoIds = (vids ?? []).map((v) => v.id as string);

  // order_index ans Kursende
  const { data: maxRow } = await supabase
    .from("modules")
    .select("order_index")
    .eq("course_id", courseId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((maxRow?.order_index as number | undefined) ?? 0) + 1;

  const title = (sub.title as string)?.trim() || "Neues Modul";
  const slug = await nextUniqueModuleSlug(supabase, slugifySegment(title));

  // Neues Modul anlegen
  const { data: newModule, error: createErr } = await supabase
    .from("modules")
    .insert({
      course_id: courseId,
      title,
      slug,
      order_index: nextOrder,
      is_published: Boolean(parentModule.is_published),
      is_locked: false,
    })
    .select("id")
    .single();
  if (createErr || !newModule?.id) {
    return NextResponse.json({ ok: false, error: createErr?.message ?? "create_module_failed" }, { status: 400 });
  }
  const newModuleId = newModule.id as string;

  // Videos umhängen (WICHTIG: vor dem Löschen der Subkategorie, sonst Cascade-Delete der Videos)
  if (videoIds.length > 0) {
    const { error: moveErr } = await supabase
      .from("videos")
      .update({ module_id: newModuleId, subcategory_id: null })
      .eq("subcategory_id", subcategoryId);
    if (moveErr) {
      return NextResponse.json({ ok: false, error: moveErr.message }, { status: 400 });
    }

    // User-Fortschritt der bewegten Videos ins neue Modul übertragen
    await transferVideoProgress(supabase, {
      sourceModuleId: parentModuleId,
      targetModuleId: newModuleId,
      videoIds,
    });
  }

  // Leere Subkategorie löschen
  const { error: delErr } = await supabase.from("subcategories").delete().eq("id", subcategoryId);
  if (delErr) {
    return NextResponse.json({ ok: false, error: delErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, moduleId: newModuleId });
}
