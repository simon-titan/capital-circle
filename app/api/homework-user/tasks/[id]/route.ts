import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { done?: boolean };
  if (typeof body.done !== "boolean") {
    return NextResponse.json({ ok: false, error: "invalid_done" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("homework_user_custom_tasks")
    .update({ done: body.done })
    .eq("id", id)
    .eq("user_id", authData.user.id)
    .select("id, title, notes, done, sort_order")
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message ?? "not_found" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, task: data });
}

export async function DELETE(_request: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("homework_user_custom_tasks").delete().eq("id", id).eq("user_id", authData.user.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
