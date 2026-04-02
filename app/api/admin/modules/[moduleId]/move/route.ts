import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteParams = { params: Promise<{ moduleId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const { moduleId } = await params;
  if (!moduleId || !UUID_RE.test(moduleId)) {
    return NextResponse.json({ ok: false, error: "invalid_module_id" }, { status: 400 });
  }

  const body = (await request.json()) as { targetCourseId?: string };
  const targetCourseId = body.targetCourseId?.trim();
  if (!targetCourseId || !UUID_RE.test(targetCourseId)) {
    return NextResponse.json({ ok: false, error: "invalid_target_course_id" }, { status: 400 });
  }

  const { data: mod, error: modErr } = await supabase.from("modules").select("id,course_id").eq("id", moduleId).maybeSingle();
  if (modErr || !mod?.id) {
    return NextResponse.json({ ok: false, error: "module_not_found" }, { status: 404 });
  }
  if (mod.course_id === targetCourseId) {
    return NextResponse.json({ ok: false, error: "already_in_target_course" }, { status: 400 });
  }

  const { data: maxRow } = await supabase
    .from("modules")
    .select("order_index")
    .eq("course_id", targetCourseId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = ((maxRow?.order_index as number | undefined) ?? 0) + 1;

  const { error: upErr } = await supabase
    .from("modules")
    .update({ course_id: targetCourseId, order_index: nextOrder })
    .eq("id", moduleId);

  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
