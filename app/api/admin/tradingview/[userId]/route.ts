import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { MIGRATION_HINWEIS, TV_SPALTEN, protokolliereTv, tabelleFehlt, type TvStatus } from "@/lib/tradingview/zugang";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/tradingview/[userId] — Handarbeit auf TradingView abhaken.
 *
 * Body `{ aktion }`:
 *   - `freigeben`: angefragt → aktiv (Name ist im Invite-only-Script eingetragen)
 *   - `entzogen`:  entzug_offen oder aktiv → entzogen (Name ist ausgetragen)
 *
 * Nur diese Übergänge. `entzug_offen` setzt ausschließlich der Nachtlauf —
 * wer von Hand entziehen will, trägt den Namen aus und klickt „Entzogen“.
 */
const UEBERGAENGE: Record<string, { von: TvStatus[]; nach: TvStatus; spalte: "freigegeben_am" | "entzogen_am" }> = {
  freigeben: { von: ["angefragt"], nach: "aktiv", spalte: "freigegeben_am" },
  entzogen: { von: ["entzug_offen", "aktiv"], nach: "entzogen", spalte: "entzogen_am" },
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { error, user } = await requireAdmin();
  if (error) return error;

  const { userId } = await params;
  const body = (await request.json().catch(() => null)) as { aktion?: unknown } | null;
  const regel = typeof body?.aktion === "string" ? UEBERGAENGE[body.aktion] : undefined;
  if (!regel) {
    return NextResponse.json({ ok: false, error: "aktion muss „freigeben“ oder „entzogen“ sein." }, { status: 400 });
  }

  const service = createServiceClient();
  const jetzt = new Date().toISOString();
  const { data, error: dbFehler } = await service
    .from("tradingview_zugaenge")
    .update({ status: regel.nach, [regel.spalte]: jetzt, bearbeitet_von: user?.id ?? null, updated_at: jetzt })
    .eq("user_id", userId)
    .in("status", regel.von)
    .select(TV_SPALTEN)
    .maybeSingle();

  if (dbFehler) {
    return NextResponse.json(
      { ok: false, error: tabelleFehlt(dbFehler) ? MIGRATION_HINWEIS : dbFehler.message },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, error: "Nicht gefunden oder der Stand hat sich inzwischen geändert. Bitte neu laden." },
      { status: 409 },
    );
  }

  await protokolliereTv(service, {
    userId,
    adminId: user?.id ?? null,
    aktion: regel.nach === "aktiv" ? "tradingview_freigegeben" : "tradingview_entzogen",
    neu: regel.nach,
    metadata: { tv_benutzername: (data as { tv_benutzername: string }).tv_benutzername },
  });

  return NextResponse.json({ ok: true, item: data });
}
