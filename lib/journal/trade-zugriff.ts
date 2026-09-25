import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { hasActivePaidAccess } from "@/lib/access-control/has-access";
import { createClient } from "@/lib/supabase/server";

/**
 * Gemeinsamer Türsteher der Trade-Routen unter `app/api/journal/trades/[id]`.
 *
 * Prüft drei Dinge, in dieser Reihenfolge: eingeloggt, bezahlter Zugang (RLS
 * kennt nur Eigentum, nicht den Bezahlstatus — gleiche Begründung wie im
 * Import) und dass der Trade dem Nutzer gehört. Letzteres erledigt der
 * Nutzer-Client selbst: Ein fremder Trade ist für ihn schlicht nicht da.
 */

export type EigenerTrade = {
  id: string;
  user_id: string;
  account_id: string;
  source: string;
  dedupe_key: string | null;
};

type Ergebnis =
  | { ok: true; supabase: SupabaseClient; user: User; trade: EigenerTrade }
  | { ok: false; antwort: NextResponse };

/** UUID-Form — alles andere braucht gar nicht erst in die Datenbank. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function istUuid(wert: string): boolean {
  return UUID.test(wert);
}

export async function ladeEigenenTrade(tradeId: string): Promise<Ergebnis> {
  if (!istUuid(tradeId)) {
    return { ok: false, antwort: NextResponse.json({ ok: false, error: "trade_not_found" }, { status: 404 }) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, antwort: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  }

  const { hasAccess } = await hasActivePaidAccess(user.id);
  if (!hasAccess) {
    return {
      ok: false,
      antwort: NextResponse.json({ ok: false, error: "paid_membership_required" }, { status: 403 }),
    };
  }

  const { data: trade } = await supabase
    .from("journal_trades")
    .select("id,user_id,account_id,source,dedupe_key")
    .eq("id", tradeId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!trade) {
    return { ok: false, antwort: NextResponse.json({ ok: false, error: "trade_not_found" }, { status: 404 }) };
  }

  return { ok: true, supabase, user, trade: trade as EigenerTrade };
}

/**
 * Fehlt eine Tabelle aus Migration 106 noch in der Datenbank? PostgREST meldet
 * das je nach Version als `PGRST205` („Could not find the table“) oder reicht
 * Postgres' `42P01` durch. Dann bleiben Bilder still aus, statt dass die ganze
 * Detailansicht kippt.
 */
export function tabelleFehlt(fehler: { code?: string; message?: string } | null | undefined): boolean {
  if (!fehler) return false;
  if (fehler.code === "PGRST205" || fehler.code === "42P01") return true;
  return /could not find the table|does not exist/i.test(fehler.message ?? "");
}
