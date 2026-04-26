import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BODY = 2000;

/**
 * POST /api/news/comment { postId, body }
 * Erstellt den (einzigen) Kommentar des Nutzers zu einem Post.
 * Unique-Constraint (post_id, user_id) verhindert mehrere Kommentare.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let json: { postId?: string; body?: string } = {};
  try {
    json = (await request.json()) as { postId?: string; body?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const postId = json.postId?.trim();
  const body = json.body?.trim();
  if (!postId || !body) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }
  if (body.length > MAX_BODY) {
    return NextResponse.json({ ok: false, error: "body_too_long" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("news_comments")
    .insert({ post_id: postId, user_id: auth.user.id, body })
    .select("id")
    .maybeSingle();

  if (error) {
    // Unique-Violation: bereits kommentiert
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, error: "already_commented" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: (data as { id: string } | null)?.id ?? null });
}

/** DELETE /api/news/comment?postId=... — entfernt den eigenen Kommentar. */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const postId = url.searchParams.get("postId")?.trim();
  if (!postId) {
    return NextResponse.json({ ok: false, error: "missing_post_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("news_comments")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", auth.user.id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
