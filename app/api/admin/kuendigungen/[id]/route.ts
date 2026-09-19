import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/** Nur diese Stände lassen sich von Hand abschließen — `ausgefuehrt` ist schon fertig. */
const OFFEN = ["eingegangen", "manuell_pruefen", "kein_vertrag"];

/**
 * PATCH /api/admin/kuendigungen/[id] — „als erledigt markieren".
 *
 * Body: `{ status: "erledigt" }`. Mehr kann die Route bewusst nicht: Die
 * Erklärung selbst (Inhalt, Eingangszeit) ist ein Beleg und bleibt
 * unverändert. Wer eine Kündigung von Hand bearbeitet, bestätigt dem Kunden
 * den Beendigungszeitpunkt per E-Mail und hakt sie hier ab.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
  if (body?.status !== "erledigt") {
    return NextResponse.json({ ok: false, error: "Nur status=erledigt ist erlaubt." }, { status: 400 });
  }

  const { data, error: dbFehler } = await createServiceClient()
    .from("kuendigungen")
    .update({
      status: "erledigt",
      erledigt_am: new Date().toISOString(),
      erledigt_von: user?.id ?? null,
    })
    .eq("id", id)
    .in("status", OFFEN)
    .select("id,status,erledigt_am")
    .maybeSingle();

  if (dbFehler) {
    return NextResponse.json({ ok: false, error: dbFehler.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, error: "Nicht gefunden oder bereits abgeschlossen." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, item: data });
}
