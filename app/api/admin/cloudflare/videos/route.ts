import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { buildThumbnailUrl, getCloudflareStreamMisconfiguration, listVideos } from "@/lib/cloudflare-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/cloudflare/videos?search=&before= — Videos aus Cloudflare
 * Stream zur Auswahl im Admin (Live-Sessions).
 *
 * Jeder Eintrag trägt ein signiertes Vorschaubild (alle Videos verlangen
 * signierte Adressen, ein nacktes Thumbnail-URL antwortet mit 401) und den
 * Vermerk, wo das Video schon hängt, damit niemand dasselbe Video unbemerkt
 * ein zweites Mal einbindet.
 */
export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const cfgErr = getCloudflareStreamMisconfiguration();
  if (cfgErr) return NextResponse.json({ ok: false, error: cfgErr }, { status: 503 });

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim().slice(0, 100) || undefined;
  const before = url.searchParams.get("before")?.trim() || undefined;
  if (before && Number.isNaN(Date.parse(before))) {
    return NextResponse.json({ ok: false, error: "invalid_before" }, { status: 400 });
  }

  try {
    const { items, next } = await listVideos({ search, before, limit: 40 });
    const uids = items.map((v) => v.uid);

    const verwendet = new Map<string, Set<string>>();
    if (uids.length > 0) {
      const service = createServiceClient();
      const [{ data: live }, { data: kurs }] = await Promise.all([
        service.from("live_session_videos").select("cloudflare_uid").in("cloudflare_uid", uids),
        service.from("videos").select("cloudflare_uid").in("cloudflare_uid", uids),
      ]);
      const merke = (zeilen: { cloudflare_uid: string | null }[] | null, wo: string) => {
        for (const z of zeilen ?? []) {
          if (!z.cloudflare_uid) continue;
          const set = verwendet.get(z.cloudflare_uid) ?? new Set<string>();
          set.add(wo);
          verwendet.set(z.cloudflare_uid, set);
        }
      };
      merke(live as { cloudflare_uid: string | null }[] | null, "Live-Session");
      merke(kurs as { cloudflare_uid: string | null }[] | null, "Kurs");
    }

    return NextResponse.json({
      ok: true,
      next,
      items: items.map((v) => {
        let thumbnailUrl: string | null = null;
        try {
          thumbnailUrl = buildThumbnailUrl(v.uid, { signed: true, ttlSeconds: 60 * 60, width: 240 });
        } catch {
          // Ohne Signierschlüssel bleibt die Vorschau leer, die Auswahl geht trotzdem.
        }
        return { ...v, thumbnailUrl, verwendetIn: [...(verwendet.get(v.uid) ?? [])] };
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "cloudflare_list_failed";
    console.error("[cloudflare/videos] Liste nicht abrufbar:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
