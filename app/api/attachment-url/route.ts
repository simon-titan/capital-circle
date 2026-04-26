import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPresignedGetUrl } from "@/lib/storage";

/**
 * Kurzlebige Signed-URL für Anhang-Download (PDF etc.).
 *
 * Zugriffsregeln:
 * - Nur eingeloggte Nutzer.
 * - Admin darf immer.
 * - Paid-Nutzer (profiles.is_paid) darf alle veroeffentlichten Anhaenge laden.
 * - Free-Nutzer darf:
 *     - standalone_attachments nur wenn is_free = true
 *     - video_attachments nur wenn is_free = true UND Parent-Video ist published
 *       UND das Parent-Modul gehoert zu einem is_free-Kurs.
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

  const [{ data: profile }, { data: videoAtt, error: videoAttErr }, { data: standaloneAtt }] = await Promise.all([
    supabase.from("profiles").select("is_admin,is_paid").eq("id", authData.user.id).single(),
    supabase
      .from("video_attachments")
      .select("id, storage_key, video_id, is_free")
      .eq("id", attachmentId)
      .maybeSingle(),
    supabase
      .from("standalone_attachments")
      .select("id, storage_key, is_free")
      .eq("id", attachmentId)
      .maybeSingle(),
  ]);

  const isAdmin = Boolean(profile?.is_admin);
  const isPaid = Boolean(profile?.is_paid);

  if (standaloneAtt?.storage_key) {
    const isFree = Boolean(standaloneAtt.is_free);
    if (!isAdmin && !isPaid && !isFree) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const signedUrl = await getPresignedGetUrl(standaloneAtt.storage_key);
    const expiresInSeconds = 60 * 15;
    return NextResponse.json({
      ok: true,
      url: signedUrl,
      expiresInSeconds,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    });
  }

  if (videoAttErr || !videoAtt) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const { data: video } = await supabase
    .from("videos")
    .select("id, is_published, module_id, subcategory_id")
    .eq("id", videoAtt.video_id)
    .maybeSingle();

  if (!video) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (!video.is_published && !isAdmin) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  if (!isAdmin && !isPaid) {
    // Free-Nutzer: attachment muss is_free sein UND das Parent-Modul in einem is_free-Kurs liegen.
    if (!videoAtt.is_free) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    let moduleId = (video.module_id as string | null) ?? null;
    if (!moduleId && video.subcategory_id) {
      const { data: sub } = await supabase
        .from("subcategories")
        .select("module_id")
        .eq("id", video.subcategory_id)
        .maybeSingle();
      moduleId = (sub?.module_id as string | null) ?? null;
    }
    if (!moduleId) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const { data: mod } = await supabase
      .from("modules")
      .select("course_id")
      .eq("id", moduleId)
      .maybeSingle();
    const courseId = (mod?.course_id as string | null) ?? null;
    if (!courseId) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const { data: course } = await supabase
      .from("courses")
      .select("is_free")
      .eq("id", courseId)
      .maybeSingle();
    if (!course?.is_free) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
  }

  const signedUrl = await getPresignedGetUrl(videoAtt.storage_key);
  const expiresInSeconds = 60 * 15;
  return NextResponse.json({
    ok: true,
    url: signedUrl,
    expiresInSeconds,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  });
}
