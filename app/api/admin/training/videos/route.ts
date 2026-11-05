import { NextResponse } from "next/server";
import { TRAINING_MODUL_ID } from "@/config/training";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  buildThumbnailUrl,
  getCloudflareStreamMisconfiguration,
  getVideoStatus,
  setRequireSignedUrls,
} from "@/lib/cloudflare-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Videos des kostenlosen Trainings (festes Modul aus Migration 109).
 *
 * GET  — die Videos in Reihenfolge, mit signiertem Vorschaubild.
 * POST — `{ videos: [{ uid, titel?, durationSeconds? }] }` hängt Stream-Videos
 *        hinten an. Jedes Video wird dabei auf signierte Wiedergabe gestellt:
 *        Direkt im Cloudflare-Dashboard hochgeladene Dateien tragen das nicht.
 *
 * Umsortieren, Umbenennen, Veröffentlichen und Entfernen laufen über die
 * allgemeine Route `/api/admin/videos` (PATCH/DELETE) — dieselbe wie im Modul-Editor.
 */

type Zeile = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  cloudflare_uid: string | null;
  cloudflare_status: string | null;
  duration_seconds: number | null;
  is_published: boolean | null;
};

async function modulVorhanden(service: ReturnType<typeof createServiceClient>): Promise<boolean> {
  const { data } = await service.from("modules").select("id").eq("id", TRAINING_MODUL_ID).maybeSingle();
  return Boolean(data);
}

async function ladeZeilen(service: ReturnType<typeof createServiceClient>): Promise<Zeile[]> {
  const { data, error } = await service
    .from("videos")
    .select("id,title,description,position,cloudflare_uid,cloudflare_status,duration_seconds,is_published")
    .eq("module_id", TRAINING_MODUL_ID)
    .is("subcategory_id", null)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Zeile[];
}

function mitVorschau(zeilen: Zeile[]) {
  return zeilen.map((z) => {
    let thumbnailUrl: string | null = null;
    if (z.cloudflare_uid) {
      try {
        thumbnailUrl = buildThumbnailUrl(z.cloudflare_uid, { signed: true, ttlSeconds: 60 * 60, width: 320 });
      } catch {
        // Ohne Signierschlüssel bleibt die Vorschau leer.
      }
    }
    return { ...z, thumbnailUrl };
  });
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const service = createServiceClient();
  if (!(await modulVorhanden(service))) {
    return NextResponse.json({ ok: false, error: "modul_fehlt" }, { status: 409 });
  }
  try {
    return NextResponse.json({ ok: true, items: mitVorschau(await ladeZeilen(service)) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "laden_fehlgeschlagen" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const cfgErr = getCloudflareStreamMisconfiguration();
  if (cfgErr) return NextResponse.json({ ok: false, error: cfgErr }, { status: 503 });

  const body = (await request.json().catch(() => null)) as {
    videos?: { uid?: string; titel?: string; durationSeconds?: number | null }[];
  } | null;
  const eingang = (body?.videos ?? [])
    .map((v) => ({
      uid: String(v.uid ?? "").trim(),
      titel: String(v.titel ?? "").trim().slice(0, 200),
      durationSeconds: typeof v.durationSeconds === "number" && v.durationSeconds > 0 ? Math.round(v.durationSeconds) : null,
    }))
    .filter((v) => /^[a-f0-9]{32}$/i.test(v.uid));
  if (eingang.length === 0) return NextResponse.json({ ok: false, error: "keine_videos" }, { status: 400 });

  const service = createServiceClient();
  if (!(await modulVorhanden(service))) {
    return NextResponse.json({ ok: false, error: "modul_fehlt" }, { status: 409 });
  }

  const vorhanden = await ladeZeilen(service);
  const schonDrin = new Set(vorhanden.map((z) => z.cloudflare_uid).filter(Boolean));
  let position = vorhanden.reduce((max, z) => Math.max(max, z.position + 1), 0);

  const fehler: string[] = [];
  let angelegt = 0;
  for (const v of eingang) {
    if (schonDrin.has(v.uid)) continue;
    schonDrin.add(v.uid);
    try {
      await setRequireSignedUrls(v.uid, true);
      const status = await getVideoStatus(v.uid);
      const { error: insErr } = await service.from("videos").insert({
        module_id: TRAINING_MODUL_ID,
        subcategory_id: null,
        title: v.titel || "Neues Video",
        position: position++,
        storage_key: null,
        cloudflare_uid: v.uid,
        cloudflare_status: status.state === "ready" ? "ready" : status.state === "error" ? "error" : "processing",
        cloudflare_ready_at: status.state === "ready" ? new Date().toISOString() : null,
        duration_seconds: status.durationSeconds ?? v.durationSeconds,
        // Eigenes Modul, nur hier gepflegt: Was man anhängt, soll im Training stehen.
        is_published: true,
      });
      if (insErr) throw new Error(insErr.message);
      angelegt++;
    } catch (e) {
      fehler.push(`${v.titel || v.uid}: ${e instanceof Error ? e.message : "fehlgeschlagen"}`);
    }
  }

  const items = mitVorschau(await ladeZeilen(service));
  return NextResponse.json({ ok: fehler.length === 0, angelegt, fehler, items }, { status: fehler.length && !angelegt ? 502 : 200 });
}
