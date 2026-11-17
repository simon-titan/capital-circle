import { NextResponse, type NextRequest } from "next/server";
import { ladeRohdaten } from "@/lib/finanzen/dashboard";
import { ExportFehler, baueBuchhaltungsExport, baueChatGptExport, pseudoSecret } from "@/lib/finanzen/export";
import { filterAusParams } from "@/lib/finanzen/filter";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * GET /api/admin/auswertung/export/buchhaltung?zeitraum=…   ZIP für Steuerberatung (Playbook 14)
 * GET /api/admin/auswertung/export/chatgpt?zeitraum=…       pseudonymisierte ZIP (Playbook 15)
 *
 * Zeitraum wie im Dashboard (`zeitraum`, `von`, `bis`); weitere Filter wirken
 * hier nicht — Exporte sind vollständig je Zeitraum. Schlägt eine Prüfung fehl
 * (Fremdschlüssel, Prüfsumme, PII, Brutto ≠ Netto + Steuer), kommt ein Fehler
 * statt einer unvollständigen ZIP.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ art: string }> }) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const { art } = await params;
  if (art !== "buchhaltung" && art !== "chatgpt") return NextResponse.json({ ok: false, error: "art" }, { status: 404 });

  const db = createServiceClient();
  const { zeitraum } = filterAusParams(request.nextUrl.searchParams);
  try {
    const roh = await ladeRohdaten(db);
    let ergebnis: { zip: Uint8Array; dateiname: string };
    if (art === "buchhaltung") {
      ergebnis = baueBuchhaltungsExport(roh, zeitraum);
    } else {
      const secret = pseudoSecret();
      if (!secret) {
        return NextResponse.json({ ok: false, error: "EXPORT_PSEUDO_SECRET fehlt oder ist kürzer als 32 Zeichen" }, { status: 500 });
      }
      const { data: sitzungen } = await db.from("funnel_sitzungen").select("*").limit(50000);
      ergebnis = baueChatGptExport(roh, (sitzungen ?? []) as Record<string, unknown>[], zeitraum, secret);
    }
    // Protokoll: Wer hat wann welchen Export gezogen (Playbook 16, Exportberechtigung protokollieren).
    console.info(`[export] ${art} von ${user?.id} (${zeitraum ? `${zeitraum.von.toISOString()}–${zeitraum.bis.toISOString()}` : "gesamt"}), ${ergebnis.zip.length} Bytes`);
    return new NextResponse(Buffer.from(ergebnis.zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${ergebnis.dateiname}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[export] ${art} fehlgeschlagen:`, err);
    return NextResponse.json({ ok: false, error: msg, pruefung: err instanceof ExportFehler }, { status: err instanceof ExportFehler ? 422 : 500 });
  }
}
