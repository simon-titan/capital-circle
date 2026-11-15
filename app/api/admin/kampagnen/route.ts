import { NextResponse, type NextRequest } from "next/server";
import { KAMPAGNEN_IDS, type KampagneId } from "@/config/kampagnen";
import { darfEchtSenden, ladeKampagnenStand, sendeKampagnenPaket, sendeKampagnenTest } from "@/lib/kampagnen/kampagnen";
import { getAppUrl } from "@/lib/site-url";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { vornameAus } from "@/lib/training/zugang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Einmal-Kampagnen (`/admin/kampagnen`, `lib/kampagnen/kampagnen.ts`).
 *
 * GET  → Stand beider Kampagnen und ob hier echt gesendet werden darf.
 * POST `{ kampagne, aktion: "test" }`   → Testmail an den eigenen Admin-Account.
 * POST `{ kampagne, aktion: "senden" }` → ein Paket echter Mails (bis 60),
 *       nur in Produktion. Der Browser ruft so lange auf, bis nichts mehr offen ist.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const service = createServiceClient();
  try {
    const staende = await Promise.all(KAMPAGNEN_IDS.map((id) => ladeKampagnenStand(service, id)));
    return NextResponse.json({ ok: true, echtSenden: darfEchtSenden(), staende });
  } catch (err) {
    console.error("[admin/kampagnen]", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "server" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireAdmin();
  if (error || !user) return error;
  const body = (await request.json().catch(() => ({}))) as { kampagne?: string; aktion?: string };
  const id = body.kampagne as KampagneId;
  if (!KAMPAGNEN_IDS.includes(id)) return NextResponse.json({ ok: false, error: "unbekannte_kampagne" }, { status: 400 });
  const service = createServiceClient();

  if (body.aktion === "test") {
    if (!user.email) return NextResponse.json({ ok: false, error: "keine_adresse" }, { status: 400 });
    const { data } = await service.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    try {
      // Links der Testmail zeigen auf die Umgebung, aus der getestet wird (Preview bleibt Preview).
      await sendeKampagnenTest(
        id,
        { userId: user.id, email: user.email, vorname: vornameAus((data as { full_name?: string | null } | null)?.full_name ?? null) || null },
        new URL(request.url).origin,
      );
      return NextResponse.json({ ok: true, an: user.email });
    } catch (err) {
      console.error("[admin/kampagnen] Test:", err);
      return NextResponse.json({ ok: false, error: "versand_fehlgeschlagen" }, { status: 500 });
    }
  }

  if (body.aktion === "senden") {
    if (!darfEchtSenden()) return NextResponse.json({ ok: false, error: "nur_produktion" }, { status: 403 });
    try {
      const r = await sendeKampagnenPaket(service, id, { limit: 60, basisUrl: getAppUrl() });
      return NextResponse.json({ ok: true, ...r });
    } catch (err) {
      console.error("[admin/kampagnen] Senden:", err);
      return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "server" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: false, error: "unbekannte_aktion" }, { status: 400 });
}
