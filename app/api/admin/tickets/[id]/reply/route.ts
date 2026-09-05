import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { sendSupportReply } from "@/lib/email/templates";

export const runtime = "nodejs";

/**
 * POST /api/admin/tickets/[id]/reply — Admin-Antwort im Thread.
 *
 * Das Setzen von `first_response_at` passiert NICHT hier, sondern race-sicher
 * per DB-Trigger (siehe Migration 063) beim Insert der Nachricht.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error, user } = await requireAdmin();
  if (error) return error;
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { message?: string } | null;
  const message = body?.message?.trim();
  if (!message) {
    return NextResponse.json({ ok: false, error: "Nachricht darf nicht leer sein." }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: ticket, error: ticketErr } = await service
    .from("support_tickets")
    .select("id,user_id,subject,status")
    .eq("id", id)
    .maybeSingle();

  if (ticketErr) {
    return NextResponse.json({ ok: false, error: ticketErr.message }, { status: 500 });
  }
  if (!ticket) {
    return NextResponse.json({ ok: false, error: "Ticket nicht gefunden." }, { status: 404 });
  }

  const { data: inserted, error: msgErr } = await service
    .from("support_ticket_messages")
    .insert({ ticket_id: id, sender_type: "admin", sender_id: user.id, body: message })
    .select("id,sender_type,sender_id,body,created_at")
    .single();

  if (msgErr || !inserted) {
    return NextResponse.json(
      { ok: false, error: msgErr?.message ?? "Antwort konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }

  // Ticket, das noch nicht aktiv bearbeitet wurde, geht mit der ersten Antwort automatisch in Bearbeitung.
  if (ticket.status === "open") {
    await service.from("support_tickets").update({ status: "in_progress" }).eq("id", id);
  }

  // Benachrichtigungs-Mail ist best-effort — ein Mail-Fehler darf die Antwort nicht blockieren.
  void (async () => {
    try {
      const { data: authUser } = await service.auth.admin.getUserById(ticket.user_id as string);
      const { data: profile } = await service
        .from("profiles")
        .select("full_name,username")
        .eq("id", ticket.user_id)
        .maybeSingle();
      const email = authUser?.user?.email;
      if (!email) return;
      const firstName =
        (profile?.full_name as string | null)?.trim().split(/\s+/)[0] ||
        (profile?.username as string | null) ||
        "Trader";

      await sendSupportReply({
        email,
        firstName,
        subject: ticket.subject as string,
        ticketId: id,
        excerpt: message.slice(0, 220),
      });
    } catch (mailErr) {
      console.error("[admin/tickets/reply] Mail-Versand fehlgeschlagen:", mailErr);
    }
  })();

  return NextResponse.json({ ok: true, message: inserted });
}
