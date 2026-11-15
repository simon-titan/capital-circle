import { NextResponse, type NextRequest } from "next/server";
import { berechneDashboard, ladeRohdaten } from "@/lib/finanzen/dashboard";
import { filterAusParams } from "@/lib/finanzen/filter";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/auswertung?zeitraum=7|30|90|gesamt|frei&von=YYYY-MM-DD&bis=YYYY-MM-DD
 *   &funnel=alle|free|main&quelle=alle|<kanal>|unknown&produkt=alle|main|premium|ausbildung|live
 *   &closer=all|unassigned|<user_id>
 *
 * Alle vier Reiter des Auswertungs-Dashboards (Tracking-Playbook 12) in einer Antwort.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const filter = filterAusParams(request.nextUrl.searchParams);
    const roh = await ladeRohdaten(createServiceClient());
    return NextResponse.json({ ok: true, ...berechneDashboard(roh, filter) });
  } catch (err) {
    console.error("[admin/auswertung]", err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
