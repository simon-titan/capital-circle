import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPresignedGetUrl } from "@/lib/storage";

/**
 * Kurzlebige Signed-URL für Anhang-Download (PDF etc.).
 * Nur eingeloggt; Video muss published sein (oder Admin).
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const attachmentId = url.searchParams.get("id");
  if (!attachmentId) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  const [{ data: profile }, { data: att, error: attErr }] = await Promise.all([
    supabase.from("profiles").select("is_admin").eq("id", authData.user.id).single(),
    supabase
      .from("video_attachments")
      .select("id, storage_key, video_id")
      .eq("id", attachmentId)
      .maybeSingle(),
  ]);

  if (attErr || !att) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const { data: video } = await supabase
    .from("videos")
    .select("id, is_published")
    .eq("id", att.video_id)
    .maybeSingle();

  if (!video) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (!video.is_published && !profile?.is_admin) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const signedUrl = await getPresignedGetUrl(att.storage_key);
  const expiresInSeconds = 60 * 15;
  return NextResponse.json({
    ok: true,
    url: signedUrl,
    expiresInSeconds,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  });
}
