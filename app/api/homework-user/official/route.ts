import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { homeworkId?: string; done?: boolean };
  const homeworkId = body.homeworkId?.trim();
  if (!homeworkId || !UUID_RE.test(homeworkId)) {
    return NextResponse.json({ ok: false, error: "invalid_homework_id" }, { status: 400 });
  }

  const { data: hw } = await supabase.from("homework").select("id").eq("id", homeworkId).eq("is_active", true).maybeSingle();
  if (!hw) {
    return NextResponse.json({ ok: false, error: "homework_not_found" }, { status: 404 });
  }

  const done = Boolean(body.done);
  const { error } = await supabase.from("homework_user_official_done").upsert(
    {
      user_id: authData.user.id,
      homework_id: homeworkId,
      done,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,homework_id" },
  );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
