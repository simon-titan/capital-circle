import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { homeworkId?: string | null; title?: string; notes?: string | null };
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length < 1 || title.length > 500) {
    return NextResponse.json({ ok: false, error: "invalid_title" }, { status: 400 });
  }
  const notesRaw = typeof body.notes === "string" ? body.notes.trim() : "";
  const notes = notesRaw.length > 0 ? notesRaw : null;
  if (notes && notes.length > 4000) {
    return NextResponse.json({ ok: false, error: "invalid_notes" }, { status: 400 });
  }

  let homeworkId: string | null = null;
  const rawHw = body.homeworkId;
  if (rawHw != null && String(rawHw).trim() !== "") {
    const hid = String(rawHw).trim();
    if (!UUID_RE.test(hid)) {
      return NextResponse.json({ ok: false, error: "invalid_homework_id" }, { status: 400 });
    }
    const { data: hw } = await supabase.from("homework").select("id").eq("id", hid).eq("is_active", true).maybeSingle();
    if (!hw) {
      return NextResponse.json({ ok: false, error: "homework_not_found" }, { status: 404 });
    }
    homeworkId = hid;
  }

  let maxQ = supabase.from("homework_user_custom_tasks").select("sort_order").eq("user_id", authData.user.id);
  maxQ = homeworkId === null ? maxQ.is("homework_id", null) : maxQ.eq("homework_id", homeworkId);
  const { data: maxRows } = await maxQ.order("sort_order", { ascending: false }).limit(1);
  const maxSort = maxRows?.[0]?.sort_order;
  const sortOrder = typeof maxSort === "number" ? maxSort + 1 : 0;

  const { data, error } = await supabase
    .from("homework_user_custom_tasks")
    .insert({
      user_id: authData.user.id,
      homework_id: homeworkId,
      title,
      notes,
      sort_order: sortOrder,
    })
    .select("id, title, notes, done, sort_order")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, task: data });
}
