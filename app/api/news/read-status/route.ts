import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** POST /api/news/read-status — setzt last_seen_at des Nutzers auf jetzt (Badge zuruecksetzen). */
export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("news_read_status")
    .upsert(
      { user_id: auth.user.id, last_seen_at: now, updated_at: now },
      { onConflict: "user_id" },
    );

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
