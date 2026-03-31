import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export async function GET(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const url = new URL(request.url);
  const moduleId = url.searchParams.get("moduleId");
  if (!moduleId) return NextResponse.json({ ok: false, error: "missing_module_id" }, { status: 400 });
  const { data, error: qErr } = await supabase
    .from("subcategories")
    .select("*")
    .eq("module_id", moduleId)
    .order("position", { ascending: true });
  if (qErr) return NextResponse.json({ ok: false, error: qErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json()) as {
    module_id: string;
    title: string;
    description?: string | null;
    position?: number;
  };
  const { data, error: insertError } = await supabase
    .from("subcategories")
    .insert({
      module_id: body.module_id,
      title: body.title,
      description: body.description ?? null,
      position: body.position ?? 0,
    })
    .select("*")
    .single();
  if (insertError) return NextResponse.json({ ok: false, error: insertError.message }, { status: 400 });
  return NextResponse.json({ ok: true, item: data });
}

export async function PATCH(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json()) as
    | { id: string; updates: Record<string, unknown> }
    | { reorder: true; moduleId: string; orderedSubcategoryIds: string[] };

  if ("reorder" in body && body.reorder) {
    const { moduleId, orderedSubcategoryIds } = body;
    if (!moduleId || !Array.isArray(orderedSubcategoryIds)) {
      return NextResponse.json({ ok: false, error: "invalid_reorder_payload" }, { status: 400 });
    }
    for (let i = 0; i < orderedSubcategoryIds.length; i++) {
      const { error: uErr } = await supabase
        .from("subcategories")
        .update({ position: i })
        .eq("id", orderedSubcategoryIds[i])
        .eq("module_id", moduleId);
      if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  const single = body as { id: string; updates: Record<string, unknown> };
  const { data, error: updateError } = await supabase
    .from("subcategories")
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
  const { error: delError } = await supabase.from("subcategories").delete().eq("id", id);
  if (delError) return NextResponse.json({ ok: false, error: delError.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
