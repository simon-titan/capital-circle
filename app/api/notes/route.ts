import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const moduleId = url.searchParams.get("moduleId")?.trim();
  if (!moduleId || !UUID_RE.test(moduleId)) {
    return NextResponse.json({ ok: false, error: "invalid_module_id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_notes")
    .select("id, content, updated_at")
    .eq("user_id", authData.user.id)
    .eq("module_id", moduleId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    note: data ? { id: data.id, content: data.content ?? "", updated_at: data.updated_at } : null,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { moduleId?: string; content?: string };
  const moduleId = body.moduleId?.trim();
  if (!moduleId || !UUID_RE.test(moduleId)) {
    return NextResponse.json({ ok: false, error: "invalid_module_id" }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content : "";
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("user_notes")
    .upsert(
      {
        user_id: authData.user.id,
        module_id: moduleId,
        content,
        updated_at: nowIso,
      },
      { onConflict: "user_id,module_id" },
    )
    .select("id, content, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, note: data });
}
