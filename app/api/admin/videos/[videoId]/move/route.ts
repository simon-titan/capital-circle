import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { transferVideoProgress } from "@/lib/progress-transfer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteParams = { params: Promise<{ videoId: string }> };

/**
 * Verschiebt ein einzelnes Video kurs-/modulübergreifend in ein anderes Modul (direkt) oder eine
 * Subkategorie. Der User-Fortschritt wird ins Ziel-Modul übertragen, wenn sich das Modul ändert.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { videoId } = await params;
  if (!videoId || !UUID_RE.test(videoId)) {
    return NextResponse.json({ ok: false, error: "invalid_video_id" }, { status: 400 });
  }

  const body = (await request.json()) as { targetModuleId?: string; targetSubcategoryId?: string | null };
  const targetModuleId = body.targetModuleId?.trim();
  const targetSubcategoryId = body.targetSubcategoryId?.trim() || null;

  if (!targetModuleId || !UUID_RE.test(targetModuleId)) {
    return NextResponse.json({ ok: false, error: "invalid_target_module_id" }, { status: 400 });
  }
  if (targetSubcategoryId && !UUID_RE.test(targetSubcategoryId)) {
    return NextResponse.json({ ok: false, error: "invalid_target_subcategory_id" }, { status: 400 });
  }

  // Ziel-Modul existiert?
  const { data: targetModule } = await supabase
    .from("modules")
    .select("id")
    .eq("id", targetModuleId)
    .maybeSingle();
  if (!targetModule?.id) {
    return NextResponse.json({ ok: false, error: "target_module_not_found" }, { status: 404 });
  }

  // Subkategorie (falls gewählt) muss zum Ziel-Modul gehören
  if (targetSubcategoryId) {
    const { data: targetSub } = await supabase
      .from("subcategories")
      .select("id,module_id")
      .eq("id", targetSubcategoryId)
      .maybeSingle();
    if (!targetSub?.id || targetSub.module_id !== targetModuleId) {
      return NextResponse.json({ ok: false, error: "subcategory_not_in_target_module" }, { status: 400 });
    }
  }

  // Aktuelles Video + Quell-Modul ermitteln
  const { data: video } = await supabase
    .from("videos")
    .select("id,module_id,subcategory_id")
    .eq("id", videoId)
    .maybeSingle();
  if (!video?.id) {
    return NextResponse.json({ ok: false, error: "video_not_found" }, { status: 404 });
  }

  let sourceModuleId = (video.module_id as string | null) ?? null;
  if (!sourceModuleId && video.subcategory_id) {
    const { data: srcSub } = await supabase
      .from("subcategories")
      .select("module_id")
      .eq("id", video.subcategory_id as string)
      .maybeSingle();
    sourceModuleId = (srcSub?.module_id as string | null) ?? null;
  }

  // No-op-Schutz: identisches Ziel
  const currentSubcategoryId = (video.subcategory_id as string | null) ?? null;
  const sameTarget = targetSubcategoryId
    ? currentSubcategoryId === targetSubcategoryId
    : sourceModuleId === targetModuleId && currentSubcategoryId === null;
  if (sameTarget) {
    return NextResponse.json({ ok: false, error: "already_in_target" }, { status: 400 });
  }

  // Position ans Ende des Ziels
  let posQuery = supabase
    .from("videos")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  posQuery = targetSubcategoryId
    ? posQuery.eq("subcategory_id", targetSubcategoryId)
    : posQuery.eq("module_id", targetModuleId).is("subcategory_id", null);
  const { data: maxRow } = await posQuery.maybeSingle();
  const nextPos = ((maxRow?.position as number | undefined) ?? -1) + 1;

  const updates = targetSubcategoryId
    ? { module_id: null, subcategory_id: targetSubcategoryId, position: nextPos }
    : { module_id: targetModuleId, subcategory_id: null, position: nextPos };

  const { data: updated, error: upErr } = await supabase
    .from("videos")
    .update(updates)
    .eq("id", videoId)
    .select("*")
    .single();
  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 });
  }

  // Fortschritt übertragen, wenn sich das Modul ändert
  if (sourceModuleId && sourceModuleId !== targetModuleId) {
    await transferVideoProgress(supabase, {
      sourceModuleId,
      targetModuleId,
      videoIds: [videoId],
    });
  }

  return NextResponse.json({ ok: true, item: updated });
}
