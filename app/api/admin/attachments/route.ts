import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export async function GET(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const url = new URL(request.url);
  const videoId = url.searchParams.get("videoId");
  if (!videoId) {
    return NextResponse.json({ ok: false, error: "missing_video_id" }, { status: 400 });
  }
  const { data, error: qErr } = await supabase
    .from("video_attachments")
    .select("*")
    .eq("video_id", videoId)
    .order("position", { ascending: true });
  if (qErr) return NextResponse.json({ ok: false, error: qErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json()) as {
    video_id: string;
    storage_key: string;
    filename: string;
    content_type?: string | null;
    size_bytes?: number | null;
    position?: number;
    arsenal_kind?: "template" | "pdf" | null;
    arsenal_category_id?: string | null;
    is_free?: boolean;
  };
  if (!body.video_id?.trim() || !body.storage_key?.trim() || !body.filename?.trim()) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }
  const { data, error: insertErr } = await supabase
    .from("video_attachments")
    .insert({
      video_id: body.video_id.trim(),
      storage_key: body.storage_key.trim(),
      filename: body.filename.trim(),
      content_type: body.content_type ?? null,
      size_bytes: body.size_bytes ?? null,
      position: body.position ?? 0,
      arsenal_kind: body.arsenal_kind ?? null,
      arsenal_category_id: body.arsenal_category_id?.trim() || null,
      is_free: body.is_free === true,
    })
    .select("*")
    .single();
  if (insertErr) return NextResponse.json({ ok: false, error: insertErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, item: data });
}

export async function PATCH(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json()) as {
    id: string;
    arsenal_kind?: "template" | "pdf" | null;
    arsenal_category_id?: string | null;
    is_free?: boolean;
  };
  if (!body.id?.trim()) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if ("arsenal_kind" in body) {
    patch.arsenal_kind = body.arsenal_kind ?? null;
  }
  if ("arsenal_category_id" in body) {
    patch.arsenal_category_id = body.arsenal_category_id?.trim() || null;
  }
  if (typeof body.is_free === "boolean") {
    patch.is_free = body.is_free;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "nothing_to_update" }, { status: 400 });
  }
  const { data, error: upErr } = await supabase
    .from("video_attachments")
    .update(patch)
    .eq("id", body.id.trim())
    .select("*")
    .single();
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, item: data });
}

export async function DELETE(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  const { error: delErr } = await supabase.from("video_attachments").delete().eq("id", id);
  if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
