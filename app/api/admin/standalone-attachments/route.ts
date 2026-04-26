import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const { data, error: qErr } = await supabase
    .from("standalone_attachments")
    .select("*")
    .order("position", { ascending: true });
  if (qErr) return NextResponse.json({ ok: false, error: qErr.message }, { status: 400 });
  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json()) as {
    storage_key: string;
    filename: string;
    content_type?: string | null;
    size_bytes?: number | null;
    kind: "pdf" | "template";
    category_id?: string | null;
    position?: number;
    is_free?: boolean;
  };
  if (!body.storage_key?.trim() || !body.filename?.trim() || !body.kind) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }
  const { data, error: insertErr } = await supabase
    .from("standalone_attachments")
    .insert({
      storage_key: body.storage_key.trim(),
      filename: body.filename.trim(),
      content_type: body.content_type ?? null,
      size_bytes: body.size_bytes ?? null,
      kind: body.kind,
      category_id: body.category_id?.trim() || null,
      position: body.position ?? 0,
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
    filename?: string;
    category_id?: string | null;
    kind?: "pdf" | "template";
    is_free?: boolean;
  };
  if (!body.id?.trim()) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }
  const updates: Record<string, unknown> = {};
  if (typeof body.filename === "string" && body.filename.trim()) {
    updates.filename = body.filename.trim();
  }
  if (body.category_id !== undefined) {
    updates.category_id = body.category_id?.trim() ? body.category_id.trim() : null;
  }
  if (body.kind === "pdf" || body.kind === "template") {
    updates.kind = body.kind;
  }
  if (typeof body.is_free === "boolean") {
    updates.is_free = body.is_free;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "no_updates" }, { status: 400 });
  }
  const { data, error: upErr } = await supabase
    .from("standalone_attachments")
    .update(updates)
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
  const { error: delErr } = await supabase.from("standalone_attachments").delete().eq("id", id);
  if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
