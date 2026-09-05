import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** GET /api/support/tickets/[id] — Ticket-Detail + Thread. RLS erlaubt nur das eigene Ticket. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  const { data: ticket, error: ticketErr } = await supabase
    .from("support_tickets")
    .select("id,subject,category,status,priority,created_at,first_response_at,resolved_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (ticketErr) {
    return NextResponse.json({ ok: false, error: ticketErr.message }, { status: 500 });
  }
  if (!ticket) {
    return NextResponse.json({ ok: false, error: "Ticket nicht gefunden." }, { status: 404 });
  }

  const { data: messages, error: msgErr } = await supabase
    .from("support_ticket_messages")
    .select("id,sender_type,sender_id,body,created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  if (msgErr) {
    return NextResponse.json({ ok: false, error: msgErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ticket, messages: messages ?? [] });
}
