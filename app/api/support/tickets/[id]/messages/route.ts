import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** POST /api/support/tickets/[id]/messages — eigene Antwort im Thread. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const { data: ticket, error: ticketErr } = await supabase
    .from("support_tickets")
    .select("id,user_id,status")
    .eq("id", id)
    .maybeSingle();

  if (ticketErr) {
    return NextResponse.json({ ok: false, error: ticketErr.message }, { status: 500 });
  }
  if (!ticket || ticket.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "Ticket nicht gefunden." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { message?: string } | null;
  const message = body?.message?.trim();
  if (!message || message.length < 1) {
    return NextResponse.json({ ok: false, error: "Nachricht darf nicht leer sein." }, { status: 400 });
  }

  const { data: inserted, error: msgErr } = await supabase
    .from("support_ticket_messages")
    .insert({ ticket_id: id, sender_type: "user", sender_id: user.id, body: message })
    .select("id,sender_type,sender_id,body,created_at")
    .single();

  if (msgErr || !inserted) {
    return NextResponse.json({ ok: false, error: msgErr?.message ?? "Nachricht konnte nicht gespeichert werden." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: inserted });
}
