import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHetznerStorageMisconfiguration, getPresignedPutUrl } from "@/lib/storage";

export const runtime = "nodejs";

function extFromFileName(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i >= 0 ? fileName.slice(i + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "jpg";
}

/**
 * Presigned PUT fuer Trade-Screenshots (Paid-Nutzer, eigenes Journal).
 * GET /api/trading-journal/screenshot?tradeId=&journalId=&fileName=&contentType=
 */
export async function GET(request: Request) {
  const cfgErr = getHetznerStorageMisconfiguration();
  if (cfgErr) {
    return NextResponse.json({ ok: false, error: cfgErr }, { status: 503 });
  }

  const url = new URL(request.url);
  const tradeId = url.searchParams.get("tradeId")?.trim();
  const journalId = url.searchParams.get("journalId")?.trim();
  const rawFileName = url.searchParams.get("fileName")?.trim() ?? "upload.jpg";
  const contentType = url.searchParams.get("contentType")?.trim() || "image/jpeg";

  if (!tradeId || !journalId) {
    return NextResponse.json({ ok: false, error: "tradeId_and_journalId_required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("is_paid").eq("id", user.id).maybeSingle();
  if (!profile?.is_paid) {
    return NextResponse.json({ ok: false, error: "paid_only" }, { status: 403 });
  }

  const { data: journal } = await supabase
    .from("trading_journals")
    .select("id")
    .eq("id", journalId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!journal) {
    return NextResponse.json({ ok: false, error: "journal_not_found" }, { status: 404 });
  }

  const { data: trade } = await supabase
    .from("trading_journal_trades")
    .select("id, journal_id, user_id")
    .eq("id", tradeId)
    .maybeSingle();
  if (!trade || trade.user_id !== user.id || trade.journal_id !== journalId) {
    return NextResponse.json({ ok: false, error: "trade_not_found" }, { status: 404 });
  }

  const ext = extFromFileName(rawFileName);
  const storageKey = `trading-journal/${user.id}/${tradeId}.${ext}`;

  try {
    const presignedUrl = await getPresignedPutUrl(storageKey, contentType);
    return NextResponse.json({ ok: true, presignedUrl, storageKey });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "presign_failed";
    console.error("[trading-journal/screenshot]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
