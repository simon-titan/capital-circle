import type { Json } from "@/lib/supabase/types";

export type TradeSource = "manual" | "tradovate_csv";

/** Zeile aus public.journal_trades. */
export interface JournalTradeRow {
  id: string;
  user_id: string;
  account_id: string;
  source: TradeSource;
  symbol: string;
  contract: string | null;
  direction: "long" | "short";
  qty: number;
  entry_price: number;
  exit_price: number;
  entry_time: string;
  exit_time: string;
  trade_date: string;
  point_value: number;
  gross_pnl: number;
  fees: number | null;
  /** Generierte Spalte: gross_pnl − coalesce(fees, 0). */
  net_pnl: number;
  notes: string | null;
  screenshot_storage_key: string | null;
  tags: Json;
  external_ids: Json;
  import_batch_id: string | null;
  dedupe_key: string | null;
  created_at: string;
  updated_at: string;
}

/** Zeile aus public.journal_accounts. */
export interface JournalAccountRow {
  id: string;
  name: string;
  broker: string | null;
  currency: string;
  created_at: string;
}

/** Antwort von POST /api/journal/import. */
export interface ImportResult {
  ok: true;
  batchId: string;
  tradeCount: number;
  inserted: number;
  skipped: number;
  openPositions: number;
  ignoredRows: number;
  invalidRows: number;
  unresolvedProducts: string[];
}
