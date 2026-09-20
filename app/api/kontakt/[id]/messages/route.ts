import { NextResponse, type NextRequest } from "next/server";
import { KONTAKT_DROSSEL, KONTAKT_GRENZEN, istUuid } from "@/lib/support/kontakt";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/kontakt/[id]/messages?t=<token> — Nachricht im Verlauf eines
 * Kontakt-Tickets ohne Anmeldung.
 *
 * Der Token aus der Bestätigungsmail ersetzt die Sitzung. Ein falscher Token
 * und ein unbekanntes Ticket sehen von außen gleich aus (404), damit sich über
 * die Route keine Ticket-IDs erraten lassen.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = request.nextUrl.searchParams.get("t");
  const nichtGefunden = NextResponse.json({ ok: false, error: "Ticket nicht gefunden." }, { status: 404 });

  if (!istUuid(id) || !istUuid(token)) return nichtGefunden;

  const service = createServiceClient();
  const { data: ticket, error: ticketFehler } = await service
    .from("support_tickets")
    .select("id,status,zugangs_token,user_id")
    .eq("id", id)
    .eq("zugangs_token", token)
    .is("user_id", null)
    .maybeSingle();

  if (ticketFehler) {
    console.error("[kontakt/messages] Ticket nicht lesbar:", ticketFehler.message);
    return NextResponse.json({ ok: false, error: "Die Nachricht konnte gerade nicht gesendet werden." }, { status: 500 });
  }
  if (!ticket) return nichtGefunden;

  if (ticket.status === "closed") {
    return NextResponse.json({ ok: false, error: "Dieses Ticket ist geschlossen." }, { status: 409 });
  }

  const rumpf = (await request.json().catch(() => null)) as { message?: unknown } | null;
  const nachricht = typeof rumpf?.message === "string" ? rumpf.message.trim() : "";
  if (!nachricht) {
    return NextResponse.json({ ok: false, error: "Nachricht darf nicht leer sein." }, { status: 400 });
  }
  if (nachricht.length > KONTAKT_GRENZEN.nachrichtMax) {
    return NextResponse.json(
      { ok: false, error: `Die Nachricht ist zu lang (höchstens ${KONTAKT_GRENZEN.nachrichtMax} Zeichen).` },
      { status: 400 },
    );
  }

  // Bremse gegen Fluten in einem einzelnen Ticket. Schlägt die Zählung fehl, wird nicht gesperrt.
  const seit = new Date(Date.now() - KONTAKT_DROSSEL.fensterMs).toISOString();
  const { count } = await service
    .from("support_ticket_messages")
    .select("id", { count: "exact", head: true })
    .eq("ticket_id", id)
    .eq("sender_type", "user")
    .gte("created_at", seit);
  if ((count ?? 0) >= KONTAKT_DROSSEL.antwortenProStunde) {
    return NextResponse.json(
      { ok: false, error: "Du hast in der letzten Stunde schon viele Nachrichten geschickt. Wir antworten dir bald." },
      { status: 429 },
    );
  }

  const { data: eingefuegt, error: nachrichtFehler } = await service
    .from("support_ticket_messages")
    .insert({ ticket_id: id, sender_type: "user", sender_id: null, body: nachricht })
    .select("id,sender_type,sender_id,body,created_at")
    .single();

  if (nachrichtFehler || !eingefuegt) {
    console.error("[kontakt/messages] Nachricht nicht speicherbar:", nachrichtFehler?.message);
    return NextResponse.json({ ok: false, error: "Die Nachricht konnte gerade nicht gespeichert werden." }, { status: 500 });
  }

  // Wer auf eine Rückfrage antwortet oder ein gelöstes Ticket wieder aufgreift, macht es für uns wieder sichtbar offen.
  if (ticket.status === "waiting_on_user" || ticket.status === "resolved") {
    await service.from("support_tickets").update({ status: "open" }).eq("id", id);
  }

  return NextResponse.json({ ok: true, message: eingefuegt });
}
