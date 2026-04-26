import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPresignedGetUrl } from "@/lib/storage";

export const runtime = "nodejs";

/** Kurzlebige Signed-URL fuer News-Post-Bilder (eingeloggt). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  const { data: row } = await supabase
    .from("news_posts")
    .select("cover_image_storage_key")
    .eq("id", id)
    .maybeSingle();

  const key = (row as { cover_image_storage_key?: string | null } | null)?.cover_image_storage_key?.trim();
  if (!key) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const signed = await getPresignedGetUrl(key);
  return NextResponse.redirect(signed, 307);
}
