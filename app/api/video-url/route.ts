import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPresignedGetUrl } from "@/lib/storage";
import { buildManifestUrl } from "@/lib/cloudflare-stream";

// jsonwebtoken's RS256-Signing braucht Node-crypto — Schutz gegen versehentliche Edge-Migration.
export const runtime = "nodejs";

/**
 * Liefert eine kurzlebige Signed-URL zum Abspielen — Hetzner (MP4) oder,
 * falls das Video bereits migriert ist, Cloudflare Stream (signiertes HLS-Manifest).
 * Nur eingeloggte Nutzer; published Video oder Admin-Vorschau.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ ok: false, error: "missing_key" }, { status: 400 });
  }

  const [{ data: profile }, { data: video }] = await Promise.all([
    supabase.from("profiles").select("is_admin").eq("id", authData.user.id).single(),
    supabase
      .from("videos")
      .select("id, is_published, storage_key, cloudflare_uid")
      .or(`storage_key.eq.${key},cloudflare_uid.eq.${key}`)
      .maybeSingle(),
  ]);

  if (!video) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (!video.is_published && !profile?.is_admin) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  if (video.cloudflare_uid) {
    const expiresInSeconds = 4 * 60 * 60;
    try {
      const manifestUrl = buildManifestUrl(video.cloudflare_uid, { signed: true, ttlSeconds: expiresInSeconds });
      return NextResponse.json({
        ok: true,
        url: manifestUrl,
        expiresInSeconds,
        expiresAt: Date.now() + expiresInSeconds * 1000,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "cloudflare_signing_failed";
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
  }

  const signedUrl = await getPresignedGetUrl(key);
  const expiresInSeconds = 60 * 15;
  return NextResponse.json({
    ok: true,
    url: signedUrl,
    expiresInSeconds,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  });
}
