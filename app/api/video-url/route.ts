import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getPresignedGetUrl } from "@/lib/storage";
import { buildManifestUrl } from "@/lib/cloudflare-stream";
import { videoIstFrei } from "@/lib/access-control/inhalt-zugang";
import { hatInhaltsZugang } from "@/lib/membership";

// jsonwebtoken's RS256-Signing braucht Node-crypto — Schutz gegen versehentliche Edge-Migration.
export const runtime = "nodejs";

const VIDEO_SPALTEN = "id, is_published, storage_key, cloudflare_uid, module_id, subcategory_id";

type VideoZeile = {
  id: string;
  is_published: boolean | null;
  storage_key: string | null;
  cloudflare_uid: string | null;
  module_id: string | null;
  subcategory_id: string | null;
};

/**
 * Liefert eine kurzlebige Signed-URL zum Abspielen — Cloudflare Stream
 * (signiertes HLS-Manifest) oder, für Altbestand ohne Stream-ID, R2 (MP4).
 *
 * Zugang (dieselbe Regel wie im Institut und in `/api/attachment-url`):
 * - Admin: jedes Video, auch unveröffentlichte (Vorschau im Admin).
 * - Alle anderen: nur veröffentlichte Videos, und zwar
 *   - mit Zahlung (`profiles.is_paid`): alle,
 *   - ohne Zahlung: nur Videos aus einem Free-Kurs.
 *
 * Die Antwortform (`{ ok, url, expiresInSeconds, expiresAt }` bzw.
 * `{ ok: false, error }`) bleibt unverändert — der Player wertet sie aus.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key")?.trim();
  if (!key) {
    return NextResponse.json({ ok: false, error: "missing_key" }, { status: 400 });
  }

  // Nachschlagen über den Service-Client: Die Zugangsprüfung unten ist die
  // Schranke, nicht die Sichtbarkeit der Zeile. Zwei getrennte
  // Gleichheitsabfragen statt eines zusammengesetzten Filters — der Schlüssel
  // kommt aus der Adresse und wird nur als Wert übergeben, nie als Filtertext.
  const service = createServiceClient();
  const [{ data: profile }, { data: perStreamId }] = await Promise.all([
    supabase.from("profiles").select("is_admin, is_paid").eq("id", authData.user.id).maybeSingle(),
    service.from("videos").select(VIDEO_SPALTEN).eq("cloudflare_uid", key).maybeSingle(),
  ]);

  let video = perStreamId as VideoZeile | null;
  if (!video) {
    const { data: perSchluessel } = await service
      .from("videos")
      .select(VIDEO_SPALTEN)
      .eq("storage_key", key)
      .limit(1)
      .maybeSingle();
    video = perSchluessel as VideoZeile | null;
  }

  if (!video) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (!profile?.is_admin) {
    if (!video.is_published) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    if (!hatInhaltsZugang(profile) && !(await videoIstFrei(service, video))) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
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

  if (!video.storage_key) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const signedUrl = await getPresignedGetUrl(video.storage_key);
  const expiresInSeconds = 60 * 15;
  return NextResponse.json({
    ok: true,
    url: signedUrl,
    expiresInSeconds,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  });
}
