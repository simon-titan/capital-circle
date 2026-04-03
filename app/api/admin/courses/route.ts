import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";

export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const { data } = await supabase
    .from("courses")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json()) as {
    title: string;
    slug: string;
    description?: string;
    is_free?: boolean;
    icon?: string | null;
    accent_color?: string | null;
    sort_order?: number;
    is_sequential_exempt?: boolean;
  };
  const { data, error: insertError } = await supabase
    .from("courses")
    .insert({
      title: body.title,
      slug: body.slug,
      description: body.description ?? null,
      is_free: Boolean(body.is_free),
      icon: body.icon ?? null,
      accent_color: body.accent_color ?? null,
      sort_order: typeof body.sort_order === "number" ? body.sort_order : 0,
      is_sequential_exempt: Boolean(body.is_sequential_exempt),
    })
    .select("*")
    .single();
  if (insertError) return NextResponse.json({ ok: false, error: insertError.message }, { status: 400 });
  return NextResponse.json({ ok: true, item: data });
}

export async function PATCH(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json()) as { id: string; updates: Record<string, unknown> };
  const { data, error: updateError } = await supabase
    .from("courses")
    .update(body.updates)
    .eq("id", body.id)
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
  const { error: delError } = await supabase.from("courses").delete().eq("id", id);
  if (delError) return NextResponse.json({ ok: false, error: delError.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
