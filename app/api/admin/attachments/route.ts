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
    })
    .select("*")
    .single();
  if (insertErr) return NextResponse.json({ ok: false, error: insertErr.message }, { status: 400 });
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
