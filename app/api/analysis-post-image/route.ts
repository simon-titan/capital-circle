import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPresignedGetUrl } from "@/lib/storage";

/** Kurzlebige Signed-URL für Analysis-Post-Bilder (eingeloggt). */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const variant = url.searchParams.get("variant") ?? "inline";
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  const { data: row } = await supabase
    .from("analysis_posts")
    .select("image_storage_key, cover_image_storage_key")
    .eq("id", id)
    .maybeSingle();

  const r = row as { image_storage_key?: string | null; cover_image_storage_key?: string | null } | null;
  const key =
    variant === "cover"
      ? r?.cover_image_storage_key?.trim()
      : r?.image_storage_key?.trim();
  if (!key) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const signed = await getPresignedGetUrl(key.trim());
  return NextResponse.redirect(signed, 307);
}
