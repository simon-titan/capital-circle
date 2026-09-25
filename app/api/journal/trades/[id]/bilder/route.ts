import { NextResponse, type NextRequest } from "next/server";
import {
  TRADE_BILD_MAX_ANZAHL,
  TRADE_BILD_MAX_BYTES,
  TRADE_BILD_TYPEN,
  tradeBildPraefix,
  type TradeBild,
} from "@/lib/journal/bilder";
import { ladeEigenenTrade, tabelleFehlt } from "@/lib/journal/trade-zugriff";
import { deleteObject, getObjectSize, getPresignedGetUrl, getStorageMisconfiguration } from "@/lib/storage";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type BildZeile = {
  id: string;
  storage_key: string;
  content_type: string;
  bytes: number | null;
  created_at: string;
};

async function alsTradeBild(zeile: BildZeile): Promise<TradeBild> {
  let url: string | null = null;
  try {
    url = await getPresignedGetUrl(zeile.storage_key, 60 * 60);
  } catch {
    url = null;
  }
  return { id: zeile.id, url, contentType: zeile.content_type, bytes: zeile.bytes, createdAt: zeile.created_at };
}

/** Migration 106 fehlt noch — die Detailansicht zeigt dann einen ruhigen Hinweis. */
function nichtEingerichtet() {
  return NextResponse.json({ ok: false, error: "bilder_nicht_eingerichtet" }, { status: 503 });
}

/** GET /api/journal/trades/[id]/bilder — alle Bilder des Trades mit signierter URL (1 h). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const zugriff = await ladeEigenenTrade(id);
  if (!zugriff.ok) return zugriff.antwort;

  const { data, error } = await zugriff.supabase
    .from("journal_trade_bilder")
    .select("id,storage_key,content_type,bytes,created_at")
    .eq("trade_id", id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (tabelleFehlt(error)) return nichtEingerichtet();
    console.error("[journal/bilder GET]", error.message);
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }

  const bilder = await Promise.all(((data ?? []) as BildZeile[]).map(alsTradeBild));
  return NextResponse.json({ ok: true, bilder });
}

/**
 * POST /api/journal/trades/[id]/bilder — ein hochgeladenes Bild anmelden.
 *
 * Body: `{ storageKey, contentType }`. Der Schlüssel muss unter dem Präfix
 * dieses Trades liegen, und das Objekt muss in R2 existieren. Die Größe prüft
 * erst diese Route: Ein Presigned PUT kann sie nicht begrenzen, also wird ein
 * zu großes Objekt hier wieder entfernt statt angehängt.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cfgErr = getStorageMisconfiguration();
  if (cfgErr) return NextResponse.json({ ok: false, error: cfgErr }, { status: 503 });

  const { id } = await params;
  const zugriff = await ladeEigenenTrade(id);
  if (!zugriff.ok) return zugriff.antwort;
  const { user } = zugriff;

  const body = (await request.json().catch(() => null)) as { storageKey?: unknown; contentType?: unknown } | null;
  const storageKey = typeof body?.storageKey === "string" ? body.storageKey : "";
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";

  if (!storageKey.startsWith(tradeBildPraefix(user.id, id)) || storageKey.includes("..")) {
    return NextResponse.json({ ok: false, error: "invalid_storage_key" }, { status: 400 });
  }
  if (!TRADE_BILD_TYPEN[contentType]) {
    return NextResponse.json({ ok: false, error: "only_png_jpeg_webp" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: vorhanden, error: zaehlFehler } = await service
    .from("journal_trade_bilder")
    .select("position")
    .eq("trade_id", id);
  if (zaehlFehler) {
    if (tabelleFehlt(zaehlFehler)) return nichtEingerichtet();
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
  if ((vorhanden ?? []).length >= TRADE_BILD_MAX_ANZAHL) {
    await deleteObject(storageKey).catch(() => undefined);
    return NextResponse.json({ ok: false, error: "too_many_images" }, { status: 409 });
  }

  const bytes = await getObjectSize(storageKey);
  if (bytes === null) {
    return NextResponse.json({ ok: false, error: "upload_missing" }, { status: 400 });
  }
  if (bytes > TRADE_BILD_MAX_BYTES) {
    await deleteObject(storageKey).catch(() => undefined);
    return NextResponse.json({ ok: false, error: "file_too_large" }, { status: 413 });
  }

  const naechstePosition = Math.max(-1, ...(vorhanden ?? []).map((b) => Number(b.position) || 0)) + 1;

  const { data, error } = await service
    .from("journal_trade_bilder")
    .insert({
      trade_id: id,
      user_id: user.id,
      storage_key: storageKey,
      content_type: contentType,
      bytes,
      position: naechstePosition,
    })
    .select("id,storage_key,content_type,bytes,created_at")
    .single();

  if (error || !data) {
    console.error("[journal/bilder POST]", error?.message);
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, bild: await alsTradeBild(data as BildZeile) });
}
