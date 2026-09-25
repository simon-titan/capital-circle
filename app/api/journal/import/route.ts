import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { hasActivePaidAccess } from "@/lib/access-control/has-access";
import { parseCsv, toObjects } from "@/lib/journal/import/csv";
import { reconstructTrades } from "@/lib/journal/import/reconstruct";
import { DEFAULT_IMPORT_TIMEZONE, isSupportedTimezone } from "@/lib/journal/import/time";
import { adaptTradovate } from "@/lib/journal/import/tradovate";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Orders-Exporte sind wenige hundert KB; alles darüber ist keine Order-Historie. */
const MAX_CSV_BYTES = 8 * 1024 * 1024;
const INSERT_CHUNK_SIZE = 500;

interface ImportBody {
  accountId?: string;
  fileName?: string;
  csv?: string;
  timezone?: string;
}

/**
 * POST /api/journal/import
 *
 * Nimmt einen Tradovate-/TradingView-Orders-Export entgegen, rekonstruiert die
 * geschlossenen Round-Trips und legt sie als Trades an.
 *
 * Bewusst serverseitig: die P&L-Berechnung darf nicht aus dem Browser kommen,
 * sonst könnte sich jeder Nutzer beliebige Zahlen ins Journal schreiben.
 */
export async function POST(request: Request) {
  let body: ImportBody;
  try {
    body = (await request.json()) as ImportBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const accountId = body.accountId?.trim();
  const csv = body.csv;
  const fileName = body.fileName?.trim().slice(0, 200) || "orders.csv";
  const timezone = body.timezone?.trim() || DEFAULT_IMPORT_TIMEZONE;

  if (!accountId || !csv) {
    return NextResponse.json({ ok: false, error: "accountId_and_csv_required" }, { status: 400 });
  }
  if (Buffer.byteLength(csv, "utf8") > MAX_CSV_BYTES) {
    return NextResponse.json({ ok: false, error: "file_too_large" }, { status: 413 });
  }
  if (!isSupportedTimezone(timezone)) {
    return NextResponse.json({ ok: false, error: "invalid_timezone" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Zweite Verteidigungslinie neben dem Layout-Gate: RLS prüft Eigentum,
  // nicht den Bezahlstatus.
  const { hasAccess } = await hasActivePaidAccess(user.id);
  if (!hasAccess) {
    return NextResponse.json({ ok: false, error: "paid_membership_required" }, { status: 403 });
  }

  const { data: account } = await supabase
    .from("journal_accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!account) {
    return NextResponse.json({ ok: false, error: "account_not_found" }, { status: 404 });
  }

  // Ganzdatei-Idempotenz: derselbe Export wird pro Konto nur einmal verarbeitet.
  const fileHash = createHash("sha256").update(csv, "utf8").digest("hex");
  const { data: existing } = await supabase
    .from("journal_import_batches")
    .select("id, status, inserted_count")
    .eq("account_id", accountId)
    .eq("file_hash", fileHash)
    .maybeSingle();
  if (existing) {
    if (existing.status !== "failed") {
      return NextResponse.json(
        { ok: false, error: "file_already_imported", batchId: existing.id, inserted: existing.inserted_count },
        { status: 409 },
      );
    }
    // Gescheiterter Vorversuch: belegt den Unique-Index (account_id, file_hash)
    // und muss weg, damit der Retry überhaupt einen Batch anlegen kann.
    await supabase.from("journal_import_batches").delete().eq("id", existing.id);
  }

  // Parsen, bevor der Batch angelegt wird — kaputte Dateien hinterlassen keine Spur.
  const rows = toObjects(parseCsv(csv));
  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: "empty_file" }, { status: 400 });
  }

  const { fills, ignoredRows, invalidRows, unresolvedProducts } = adaptTradovate(rows, timezone);
  if (fills.length === 0) {
    return NextResponse.json(
      { ok: false, error: "no_filled_orders", ignoredRows, invalidRows, unresolvedProducts },
      { status: 422 },
    );
  }

  const { trades, openPositions } = reconstructTrades(fills);

  const { data: batch, error: batchError } = await supabase
    .from("journal_import_batches")
    .insert({
      user_id: user.id,
      account_id: accountId,
      source: "tradovate_csv",
      file_name: fileName,
      file_hash: fileHash,
      timezone,
      row_count: fills.length,
      trade_count: trades.length,
      open_positions_count: openPositions.length,
      status: "processing",
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return NextResponse.json({ ok: false, error: "batch_create_failed" }, { status: 500 });
  }

  try {
    // Bereits importierte Round-Trips überspringen (z. B. überlappende Exporte).
    const keys = trades.map((t) => t.dedupeKey);
    const known = new Set<string>();
    for (let i = 0; i < keys.length; i += INSERT_CHUNK_SIZE) {
      const { data } = await supabase
        .from("journal_trades")
        .select("dedupe_key")
        .eq("account_id", accountId)
        .in("dedupe_key", keys.slice(i, i + INSERT_CHUNK_SIZE));
      for (const row of data ?? []) if (row.dedupe_key) known.add(row.dedupe_key);

      // Vom Nutzer gelöschte Trades bleiben gelöscht — auch wenn dieselbe CSV
      // noch einmal kommt. Ohne Migration 106 fehlt die Tabelle; dann kommt
      // der Fehler zurück und es bleibt beim alten Verhalten.
      const { data: geloescht } = await supabase
        .from("journal_trade_geloescht")
        .select("dedupe_key")
        .eq("account_id", accountId)
        .in("dedupe_key", keys.slice(i, i + INSERT_CHUNK_SIZE));
      for (const row of geloescht ?? []) if (row.dedupe_key) known.add(row.dedupe_key);
    }

    const fresh = trades.filter((t) => !known.has(t.dedupeKey));
    const payload = fresh.map((t) => ({
      user_id: user.id,
      account_id: accountId,
      source: "tradovate_csv",
      symbol: t.product,
      contract: t.contract,
      direction: t.direction,
      qty: t.qty,
      entry_price: t.entryPrice,
      exit_price: t.exitPrice,
      entry_time: t.entryTime.toISOString(),
      exit_time: t.exitTime.toISOString(),
      trade_date: t.tradeDate,
      point_value: t.pointValue,
      gross_pnl: t.grossPnl,
      external_ids: t.orderIds,
      import_batch_id: batch.id,
      dedupe_key: t.dedupeKey,
    }));

    for (let i = 0; i < payload.length; i += INSERT_CHUNK_SIZE) {
      const { error } = await supabase.from("journal_trades").insert(payload.slice(i, i + INSERT_CHUNK_SIZE));
      if (error) throw new Error(error.message);
    }

    const skipped = trades.length - fresh.length;
    await supabase
      .from("journal_import_batches")
      .update({ status: "done", inserted_count: fresh.length, skipped_count: skipped })
      .eq("id", batch.id);

    return NextResponse.json({
      ok: true,
      batchId: batch.id,
      tradeCount: trades.length,
      inserted: fresh.length,
      skipped,
      openPositions: openPositions.length,
      ignoredRows,
      invalidRows,
      unresolvedProducts,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "import_failed";
    console.error("[journal/import]", message);
    // Batch als gescheitert markieren; die Cascade räumt Teil-Inserts nicht weg,
    // deshalb hier explizit löschen, damit ein Retry sauber startet.
    await supabase.from("journal_trades").delete().eq("import_batch_id", batch.id);
    await supabase
      .from("journal_import_batches")
      .update({ status: "failed", error: message.slice(0, 500) })
      .eq("id", batch.id);
    return NextResponse.json({ ok: false, error: "import_failed", batchId: batch.id }, { status: 500 });
  }
}
