import { NextResponse, type NextRequest } from "next/server";
import { ladeEigenenTrade, tabelleFehlt } from "@/lib/journal/trade-zugriff";
import { deleteObject } from "@/lib/storage";

export const runtime = "nodejs";

/** Mehr als eine gut gefüllte A4-Seite schreibt niemand zu einem Trade. */
const MAX_NOTIZ_ZEICHEN = 20_000;
const MAX_GEBUEHREN = 100_000;

type PatchBody = { notes?: unknown; fees?: unknown };

/**
 * PATCH /api/journal/trades/[id] — Notizen und Gebühren.
 *
 * Mehr ist bewusst nicht änderbar: Preise, Zeiten und Kontrakte kommen aus dem
 * Import bzw. der Erfassung und tragen die P&L. `net_pnl` ist eine generierte
 * Spalte und rechnet nach einer Gebührenänderung von selbst neu.
 *
 * `updated_at` wird von Hand gesetzt — die Tabelle hat dafür keinen Trigger.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const zugriff = await ladeEigenenTrade(id);
  if (!zugriff.ok) return zugriff.antwort;

  const body = (await request.json().catch(() => null)) as PatchBody | null;
  if (!body) return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });

  const aenderung: Record<string, unknown> = {};

  if ("notes" in body) {
    if (body.notes !== null && typeof body.notes !== "string") {
      return NextResponse.json({ ok: false, error: "invalid_notes" }, { status: 400 });
    }
    const text = typeof body.notes === "string" ? body.notes : "";
    if (text.length > MAX_NOTIZ_ZEICHEN) {
      return NextResponse.json({ ok: false, error: "notes_too_long" }, { status: 413 });
    }
    aenderung.notes = text.trim() ? text : null;
  }

  if ("fees" in body) {
    if (body.fees === null) {
      aenderung.fees = null;
    } else {
      const fees = typeof body.fees === "number" ? body.fees : Number.NaN;
      if (!Number.isFinite(fees) || fees < 0 || fees > MAX_GEBUEHREN) {
        return NextResponse.json({ ok: false, error: "invalid_fees" }, { status: 400 });
      }
      aenderung.fees = Math.round(fees * 100) / 100;
    }
  }

  if (Object.keys(aenderung).length === 0) {
    return NextResponse.json({ ok: false, error: "nothing_to_update" }, { status: 400 });
  }

  aenderung.updated_at = new Date().toISOString();

  const { data, error } = await zugriff.supabase
    .from("journal_trades")
    .update(aenderung)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[journal/trades PATCH]", error?.message);
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, trade: data });
}

/**
 * DELETE /api/journal/trades/[id]
 *
 * Serverseitig statt direkt per RLS aus dem Browser, weil die Bilder in R2 mit
 * weg müssen. Reihenfolge:
 *   1. Bild-Schlüssel einsammeln (die Zeilen verschwinden gleich per Cascade).
 *   2. Importierte Trades als gelöscht merken — sonst holt ein Re-Import
 *      derselben CSV sie zurück.
 *   3. Trade löschen.
 *   4. R2-Objekte löschen. Scheitert das, ist der Trade trotzdem weg; die
 *      Waisen meldet `scripts/check-r2-dateien.mjs`.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const zugriff = await ladeEigenenTrade(id);
  if (!zugriff.ok) return zugriff.antwort;
  const { supabase, user, trade } = zugriff;

  let bildSchluessel: string[] = [];
  const { data: bilder, error: bilderFehler } = await supabase
    .from("journal_trade_bilder")
    .select("storage_key")
    .eq("trade_id", id);
  if (bilderFehler && !tabelleFehlt(bilderFehler)) {
    console.error("[journal/trades DELETE] Bilder nicht lesbar:", bilderFehler.message);
  }
  bildSchluessel = (bilder ?? []).map((b) => b.storage_key as string).filter(Boolean);

  if (trade.dedupe_key) {
    const { error: merkFehler } = await supabase.from("journal_trade_geloescht").upsert(
      { account_id: trade.account_id, dedupe_key: trade.dedupe_key, user_id: user.id },
      { onConflict: "account_id,dedupe_key", ignoreDuplicates: true },
    );
    // Ohne Migration 106 fehlt die Tabelle — gelöscht wird trotzdem, nur
    // käme der Trade bei einem Re-Import zurück.
    if (merkFehler && !tabelleFehlt(merkFehler)) {
      console.error("[journal/trades DELETE] dedupe_key nicht gemerkt:", merkFehler.message);
    }
  }

  const { error } = await supabase.from("journal_trades").delete().eq("id", id);
  if (error) {
    console.error("[journal/trades DELETE]", error.message);
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }

  const ergebnisse = await Promise.allSettled(bildSchluessel.map((key) => deleteObject(key)));
  const fehlgeschlagen = ergebnisse.filter((e) => e.status === "rejected").length;
  if (fehlgeschlagen > 0) {
    console.error(`[journal/trades DELETE] ${fehlgeschlagen} R2-Objekt(e) nicht gelöscht`, { tradeId: id });
  }

  return NextResponse.json({ ok: true });
}
