import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export async function GET(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const url = new URL(request.url);
  const moduleId = url.searchParams.get("moduleId");
  const subcategoryId = url.searchParams.get("subcategoryId");
  const allForModule = url.searchParams.get("allForModule");

  if (!moduleId && !subcategoryId) {
    return NextResponse.json({ ok: false, error: "missing_parent" }, { status: 400 });
  }

  // Alle Videos eines Moduls (direkte + alle Subkategorien) auf einmal laden
  if (allForModule === "1" && moduleId) {
    const { data: subs } = await supabase
      .from("subcategories")
      .select("id")
      .eq("module_id", moduleId);
    const subIds = (subs ?? []).map((s: { id: string }) => s.id);

    let q = supabase.from("videos").select("*").order("position", { ascending: true });
    if (subIds.length > 0) {
      q = q.or(`module_id.eq.${moduleId},subcategory_id.in.(${subIds.join(",")})`);
    } else {
      q = q.eq("module_id", moduleId);
    }
    const { data, error: qErr } = await q;
    if (qErr) return NextResponse.json({ ok: false, error: qErr.message }, { status: 400 });
    return NextResponse.json({ ok: true, items: data ?? [] });
  }

  let q = supabase.from("videos").select("*").order("position", { ascending: true });
  if (subcategoryId) {
    q = q.eq("subcategory_id", subcategoryId);
  } else {
    q = q.eq("module_id", moduleId!).is("subcategory_id", null);
  }
  const { data, error: qErr } = await q;
  if (qErr) return NextResponse.json({ ok: false, error: qErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json()) as {
    id?: string;
    module_id?: string | null;
    subcategory_id?: string | null;
    title: string;
    description?: string | null;
    position?: number;
    storage_key: string;
    thumbnail_key?: string | null;
    duration_seconds?: number | null;
    is_published?: boolean;
  };
  const hasModule = Boolean(body.module_id);
  const hasSub = Boolean(body.subcategory_id);
  if (hasModule === hasSub) {
    return NextResponse.json({ ok: false, error: "exactly_one_parent_required" }, { status: 400 });
  }
  const insertPayload: Record<string, unknown> = {
    title: body.title,
    description: body.description ?? null,
    position: body.position ?? 0,
    storage_key: body.storage_key,
    thumbnail_key: body.thumbnail_key ?? null,
    duration_seconds: body.duration_seconds ?? null,
    is_published: body.is_published ?? false,
  };
  if (body.id) insertPayload.id = body.id;
  if (hasModule) {
    insertPayload.module_id = body.module_id;
    insertPayload.subcategory_id = null;
  } else {
    insertPayload.module_id = null;
    insertPayload.subcategory_id = body.subcategory_id;
  }
  const { data, error: insertError } = await supabase.from("videos").insert(insertPayload).select("*").single();
  if (insertError) return NextResponse.json({ ok: false, error: insertError.message }, { status: 400 });
  return NextResponse.json({ ok: true, item: data });
}

export async function PATCH(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json()) as
    | { id: string; updates: Record<string, unknown> }
    | {
        reorder: true;
        moduleId?: string;
        subcategoryId?: string;
        orderedVideoIds: string[];
      };

  if ("reorder" in body && body.reorder) {
    const { moduleId, subcategoryId, orderedVideoIds } = body;
    if (!Array.isArray(orderedVideoIds) || (!moduleId && !subcategoryId)) {
      return NextResponse.json({ ok: false, error: "invalid_reorder_payload" }, { status: 400 });
    }
    for (let i = 0; i < orderedVideoIds.length; i++) {
      let q = supabase.from("videos").update({ position: i }).eq("id", orderedVideoIds[i]);
      if (subcategoryId) q = q.eq("subcategory_id", subcategoryId);
      else q = q.eq("module_id", moduleId!);
      const { error: uErr } = await q;
      if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  const single = body as { id: string; updates: Record<string, unknown> };
  const { data, error: updateError } = await supabase
    .from("videos")
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
  const { error: delError } = await supabase.from("videos").delete().eq("id", id);
  if (delError) return NextResponse.json({ ok: false, error: delError.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
