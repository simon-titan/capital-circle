import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export async function GET(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ ok: false, error: "missing_course_id" }, { status: 400 });
  const { data } = await supabase.from("modules").select("*").eq("course_id", courseId).order("order_index");
  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const body = await request.json();
  const { data, error: insertError } = await supabase.from("modules").insert(body).select("*").single();
  if (insertError) return NextResponse.json({ ok: false, error: insertError.message }, { status: 400 });
  return NextResponse.json({ ok: true, item: data });
}

export async function PATCH(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json()) as
    | { id: string; updates: Record<string, unknown> }
    | { reorder: true; courseId: string; orderedModuleIds: string[] };

  if ("reorder" in body && body.reorder) {
    const { courseId, orderedModuleIds } = body;
    if (!courseId || !Array.isArray(orderedModuleIds)) {
      return NextResponse.json({ ok: false, error: "invalid_reorder_payload" }, { status: 400 });
    }
    for (let i = 0; i < orderedModuleIds.length; i++) {
      const { error: uErr } = await supabase
        .from("modules")
        .update({ order_index: i + 1 })
        .eq("id", orderedModuleIds[i])
        .eq("course_id", courseId);
      if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  const single = body as { id: string; updates: Record<string, unknown> };
  const { data, error: updateError } = await supabase
    .from("modules")
    .update(single.updates)
    .eq("id", single.id)
    .select("*")
    .single();
  if (updateError) return NextResponse.json({ ok: false, error: updateError.message }, { status: 400 });
  return NextResponse.json({ ok: true, item: data });
}

export async function DELETE(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  const { error: delError } = await supabase.from("modules").delete().eq("id", id);
  if (delError) return NextResponse.json({ ok: false, error: delError.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
