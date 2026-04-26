import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** GET /api/news/unread — Anzahl neuer News-Posts seit last_seen_at. */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ ok: false, count: 0 }, { status: 401 });
  }

  const { data: status } = await supabase
    .from("news_read_status")
    .select("last_seen_at")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  const lastSeen = (status as { last_seen_at: string } | null)?.last_seen_at ?? null;

  let q = supabase.from("news_posts").select("id", { count: "exact", head: true });
  if (lastSeen) q = q.gt("published_at", lastSeen);
  const { count } = await q;

  return NextResponse.json({ ok: true, count: count ?? 0 });
}
