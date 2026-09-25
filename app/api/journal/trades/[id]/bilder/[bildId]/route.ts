import { NextResponse, type NextRequest } from "next/server";
import { istUuid, ladeEigenenTrade, tabelleFehlt } from "@/lib/journal/trade-zugriff";
import { deleteObject } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * DELETE /api/journal/trades/[id]/bilder/[bildId]
 *
 * Erst die Zeile, dann das Objekt: Bleibt das R2-Objekt liegen, sieht der
 * Nutzer davon nichts, und `scripts/check-r2-dateien.mjs` findet die Waise.
 * Umgekehrt stünde eine Zeile ohne Bild in der Galerie.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; bildId: string }> },
) {
  const { id, bildId } = await params;
  if (!istUuid(bildId)) return NextResponse.json({ ok: false, error: "image_not_found" }, { status: 404 });

  const zugriff = await ladeEigenenTrade(id);
  if (!zugriff.ok) return zugriff.antwort;
  const { supabase } = zugriff;

  const { data: bild, error } = await supabase
    .from("journal_trade_bilder")
    .select("id,storage_key")
    .eq("id", bildId)
    .eq("trade_id", id)
    .maybeSingle();
  if (error) {
    if (tabelleFehlt(error)) {
      return NextResponse.json({ ok: false, error: "bilder_nicht_eingerichtet" }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
  if (!bild) return NextResponse.json({ ok: false, error: "image_not_found" }, { status: 404 });

  const { error: loeschFehler } = await supabase.from("journal_trade_bilder").delete().eq("id", bildId);
  if (loeschFehler) {
    console.error("[journal/bilder DELETE]", loeschFehler.message);
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }

  try {
    await deleteObject(bild.storage_key as string);
  } catch (e) {
    console.error("[journal/bilder DELETE] R2:", e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ ok: true });
}
