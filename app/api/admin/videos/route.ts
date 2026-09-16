import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export async function GET(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const url = new URL(request.url);
  const moduleId = url.searchParams.get("moduleId");
  const subcategoryId = url.searchParams.get("subcategoryId");
  const allForModule = url.searchParams.get("allForModule");
  const unassigned = url.searchParams.get("unassigned");

  /**
   * Der Stapel: Videos ohne Modul und ohne Untermodul. Entsteht beim Import aus
   * Cloudflare Stream und beim Herausziehen aus einem Modul; wird im
   * Modul-Editor per Drag & Drop geleert. Braucht Migration 070.
   */
  if (unassigned === "1") {
    const { data, error: qErr } = await supabase
      .from("videos")
      .select("*")
      .is("module_id", null)
      .is("subcategory_id", null)
      .order("position", { ascending: true });
    if (qErr) return NextResponse.json({ ok: false, error: qErr.message }, { status: 400 });
    return NextResponse.json({ ok: true, items: data ?? [] });
  }

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
    storage_key?: string;
    cloudflare_uid?: string;
    cloudflare_status?: string;
    thumbnail_key?: string | null;
    duration_seconds?: number | null;
    is_published?: boolean;
  };
  const hasModule = Boolean(body.module_id);
  const hasSub = Boolean(body.subcategory_id);
  if (hasModule === hasSub) {
    return NextResponse.json({ ok: false, error: "exactly_one_parent_required" }, { status: 400 });
  }
  if (!body.storage_key && !body.cloudflare_uid) {
    return NextResponse.json({ ok: false, error: "storage_key_or_cloudflare_uid_required" }, { status: 400 });
  }
  const insertPayload: Record<string, unknown> = {
    title: body.title,
    description: body.description ?? null,
    position: body.position ?? 0,
    storage_key: body.storage_key ?? null,
    cloudflare_uid: body.cloudflare_uid ?? null,
    cloudflare_status: body.cloudflare_status ?? (body.cloudflare_uid ? "processing" : "none"),
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
        /** Reihenfolge im Stapel (Videos ohne Modul und ohne Untermodul). */
        unassigned?: boolean;
        orderedVideoIds: string[];
      };

  if ("reorder" in body && body.reorder) {
    const { moduleId, subcategoryId, unassigned, orderedVideoIds } = body;
    if (!Array.isArray(orderedVideoIds) || (!moduleId && !subcategoryId && !unassigned)) {
      return NextResponse.json({ ok: false, error: "invalid_reorder_payload" }, { status: 400 });
    }
    for (let i = 0; i < orderedVideoIds.length; i++) {
      let q = supabase.from("videos").update({ position: i }).eq("id", orderedVideoIds[i]);
      // Die Elternbedingung ist Absicht: Sie verhindert, dass eine veraltete
      // Liste aus dem Browser Positionen in einem fremden Modul ueberschreibt.
      if (unassigned) q = q.is("module_id", null).is("subcategory_id", null);
      else if (subcategoryId) q = q.eq("subcategory_id", subcategoryId);
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
