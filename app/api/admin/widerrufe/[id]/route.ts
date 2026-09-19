import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { GRENZEN } from "@/lib/widerruf/shared";

export const runtime = "nodejs";

/** Nur diese Stände lassen sich von Hand abschließen. */
const OFFEN = ["eingegangen", "manuell_pruefen"];

/**
 * PATCH /api/admin/widerrufe/[id] — „als erledigt markieren".
 *
 * Body: `{ status: "erledigt", notiz?: string }`. Die Notiz hält fest, was
 * entschieden wurde (z. B. „voll erstattet am 20.09.", „Wertersatz 30 €
 * einbehalten", „Frist abgelaufen, abgelehnt"). Die Erklärung selbst
 * (Inhalt, Eingangszeit) ist ein Beleg und bleibt unverändert.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { status?: unknown; notiz?: unknown } | null;
  if (body?.status !== "erledigt") {
    return NextResponse.json({ ok: false, error: "Nur status=erledigt ist erlaubt." }, { status: 400 });
  }
  const notiz = typeof body.notiz === "string" ? body.notiz.trim().slice(0, GRENZEN.notizMax) || null : null;

  const { data, error: dbFehler } = await createServiceClient()
    .from("widerrufe")
    .update({
      status: "erledigt",
      erledigt_am: new Date().toISOString(),
      erledigt_von: user?.id ?? null,
      erledigt_notiz: notiz,
    })
    .eq("id", id)
    .in("status", OFFEN)
    .select("id,status,erledigt_am,erledigt_notiz")
    .maybeSingle();

  if (dbFehler) {
    return NextResponse.json({ ok: false, error: dbFehler.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Nicht gefunden oder bereits abgeschlossen." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, item: data });
}
