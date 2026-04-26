import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** POST /api/news/save { postId } — toggelt den Bookmark des eingeloggten Nutzers. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { postId?: string } = {};
  try {
    body = (await request.json()) as { postId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const postId = body.postId?.trim();
  if (!postId) {
    return NextResponse.json({ ok: false, error: "missing_post_id" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("news_saves")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("news_saves").delete().eq("id", (existing as { id: string }).id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, saved: false });
  }

  const { error } = await supabase.from("news_saves").insert({ post_id: postId, user_id: auth.user.id });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, saved: true });
}
