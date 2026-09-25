import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { TRADE_BILD_MAX_ANZAHL, TRADE_BILD_MAX_BYTES, TRADE_BILD_TYPEN, tradeBildPraefix } from "@/lib/journal/bilder";
import { ladeEigenenTrade, tabelleFehlt } from "@/lib/journal/trade-zugriff";
import { getPresignedPutUrl, getStorageMisconfiguration } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * POST /api/journal/trades/[id]/bilder/presign — Presigned PUT für ein Bild.
 *
 * Body: `{ contentType, bytes }`. Größe und Anzahl werden hier vorab geprüft,
 * damit der Browser gar nicht erst 30 MB hochschiebt; verbindlich prüft sie
 * aber erst die Anmeldung (POST …/bilder), weil ein Presigned PUT die Größe
 * nicht begrenzen kann. Der Dateiname des Nutzers taucht im Schlüssel nicht
 * auf — eine UUID reicht und verrät nichts.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cfgErr = getStorageMisconfiguration();
  if (cfgErr) return NextResponse.json({ ok: false, error: cfgErr }, { status: 503 });

  const { id } = await params;
  const zugriff = await ladeEigenenTrade(id);
  if (!zugriff.ok) return zugriff.antwort;
  const { supabase, user } = zugriff;

  const body = (await request.json().catch(() => null)) as { contentType?: unknown; bytes?: unknown } | null;
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";
  const bytes = typeof body?.bytes === "number" ? body.bytes : Number.NaN;

  const endung = TRADE_BILD_TYPEN[contentType];
  if (!endung) {
    return NextResponse.json({ ok: false, error: "only_png_jpeg_webp" }, { status: 400 });
  }
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > TRADE_BILD_MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "file_too_large" }, { status: 413 });
  }

  const { count, error } = await supabase
    .from("journal_trade_bilder")
    .select("id", { count: "exact", head: true })
    .eq("trade_id", id);
  if (error) {
    if (tabelleFehlt(error)) {
      return NextResponse.json({ ok: false, error: "bilder_nicht_eingerichtet" }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
  if ((count ?? 0) >= TRADE_BILD_MAX_ANZAHL) {
    return NextResponse.json({ ok: false, error: "too_many_images" }, { status: 409 });
  }

  const storageKey = `${tradeBildPraefix(user.id, id)}${randomUUID()}.${endung}`;
  try {
    const presignedUrl = await getPresignedPutUrl(storageKey, contentType);
    return NextResponse.json({ ok: true, presignedUrl, storageKey });
  } catch (e) {
    console.error("[journal/bilder presign]", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "presign_failed" }, { status: 500 });
  }
}
