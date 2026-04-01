import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPresignedGetUrl } from "@/lib/storage";

/**
 * Signed GET für Cover-/Editor-Bilder (Prefix covers/).
 * Nur eingeloggte Mitglieder — gleiche Keys wie Admin-Upload (folder=covers).
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key")?.trim() ?? "";
  if (!key || !key.startsWith("covers/") || key.includes("..")) {
    return NextResponse.json({ ok: false, error: "invalid_key" }, { status: 400 });
  }

  const signed = await getPresignedGetUrl(key);
  return NextResponse.redirect(signed, 307);
}
