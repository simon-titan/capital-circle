import { NextResponse, type NextRequest } from "next/server";
import { kassenlinkZeile, tabelleFehlt } from "@/lib/mentoring/admin";
import { KASSENLINK_SPALTEN, type Kassenlink } from "@/lib/mentoring/kasse";
import { getAppUrl } from "@/lib/site-url";
import { getStripe } from "@/lib/stripe/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/kassenlinks/[id]  `{ aktion: "stornieren" }`
 *
 * Storniert einen offenen Kassenlink. Bezahlte Links bleiben, wie sie sind —
 * eine Erstattung ist ein Vorgang in Stripe, kein Statuswechsel hier.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { aktion?: unknown } | null;
  if (body?.aktion !== "stornieren") {
    return NextResponse.json({ ok: false, error: "aktion_unbekannt" }, { status: 400 });
  }

  const service = createServiceClient();

  /*
    Die Bedingung `status = offen` steht im UPDATE selbst, nicht in einer
    Abfrage davor: Bezahlt der Kunde genau zwischen Lesen und Schreiben, darf
    der Webhook-Status „bezahlt" nicht von einer Stornierung überschrieben werden.
  */
  const { data, error: dbErr } = await service
    .from("kassenlink")
    .update({ status: "storniert" })
    .eq("id", id)
    .eq("status", "offen")
    .select(KASSENLINK_SPALTEN)
    .maybeSingle();

  if (dbErr) {
    if (tabelleFehlt(dbErr)) return NextResponse.json({ ok: false, error: "migration_fehlt" }, { status: 500 });
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "nicht_offen" }, { status: 409 });
  }

  const link = data as unknown as Kassenlink;

  /*
    Hat der Kunde die Stripe-Kasse schon geöffnet, läuft diese Session noch bis
    zu zwei Stunden weiter. Ohne Abbruch könnte er dort trotz Stornierung
    bezahlen. Gelingt der Abbruch nicht (Session schon abgelaufen oder
    abgeschlossen), ist die Stornierung trotzdem gültig.
  */
  if (link.stripe_session_id) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(link.stripe_session_id);
      if (session.status === "open") await stripe.checkout.sessions.expire(link.stripe_session_id);
    } catch (err) {
      console.warn(`[admin/kassenlinks] Stripe-Session ${link.stripe_session_id} nicht abgebrochen:`, err);
    }
  }

  return NextResponse.json({ ok: true, item: kassenlinkZeile(link, getAppUrl()) });
}
