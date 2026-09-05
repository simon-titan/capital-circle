import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** GET /api/support/tickets — eigene Tickets des eingeloggten Nutzers. */
export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("support_tickets")
    .select("id,subject,category,status,priority,created_at,first_response_at,resolved_at,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tickets: data ?? [] });
}

/** POST /api/support/tickets — neues Ticket inkl. erster Nachricht. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { subject?: string; category?: string; message?: string }
    | null;
  const subject = body?.subject?.trim();
  const category = body?.category?.trim() || null;
  const message = body?.message?.trim();

  if (!subject || subject.length < 3) {
    return NextResponse.json({ ok: false, error: "Bitte gib einen Betreff mit mindestens 3 Zeichen an." }, { status: 400 });
  }
  if (!message || message.length < 5) {
    return NextResponse.json({ ok: false, error: "Bitte beschreibe dein Anliegen etwas ausführlicher." }, { status: 400 });
  }

  const { data: ticket, error: ticketErr } = await supabase
    .from("support_tickets")
    .insert({ user_id: user.id, subject, category })
    .select("id,subject,category,status,priority,created_at,first_response_at,resolved_at,updated_at")
    .single();

  if (ticketErr || !ticket) {
    return NextResponse.json(
      { ok: false, error: ticketErr?.message ?? "Ticket konnte nicht erstellt werden." },
      { status: 500 },
    );
  }

  const { error: msgErr } = await supabase.from("support_ticket_messages").insert({
    ticket_id: ticket.id,
    sender_type: "user",
    sender_id: user.id,
    body: message,
  });

  if (msgErr) {
    return NextResponse.json({ ok: false, error: msgErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ticket });
}
