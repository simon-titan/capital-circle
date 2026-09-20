import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/** GET /api/admin/tickets/[id] — Ticket-Detail + Thread + Absender-Infos. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await ctx.params;
  const service = createServiceClient();

  const { data: ticket, error: ticketErr } = await service
    .from("support_tickets")
    .select(
      "id,user_id,subject,category,status,priority,created_at,first_response_at,resolved_at,updated_at,contact_email,contact_name,quelle",
    )
    .eq("id", id)
    .maybeSingle();

  if (ticketErr) {
    return NextResponse.json({ ok: false, error: ticketErr.message }, { status: 500 });
  }
  if (!ticket) {
    return NextResponse.json({ ok: false, error: "Ticket nicht gefunden." }, { status: 404 });
  }

  // Tickets aus dem Kontaktformular haben kein Konto (Migration 102).
  const userId = ticket.user_id as string | null;

  const [{ data: messages, error: msgErr }, { data: profile }, { data: authUser }] = await Promise.all([
    service
      .from("support_ticket_messages")
      .select("id,sender_type,sender_id,body,created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
    userId
      ? service.from("profiles").select("full_name,username").eq("id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
    userId ? service.auth.admin.getUserById(userId) : Promise.resolve({ data: null }),
  ]);

  if (msgErr) {
    return NextResponse.json({ ok: false, error: msgErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    ticket: {
      ...ticket,
      userEmail: authUser?.user?.email ?? (ticket.contact_email as string | null) ?? "",
      userName:
        (profile?.full_name as string | null) ||
        (profile?.username as string | null) ||
        (ticket.contact_name as string | null) ||
        null,
      ohneKonto: !userId,
    },
    messages: messages ?? [],
  });
}

/** PATCH /api/admin/tickets/[id] — Status und/oder Priorität aktualisieren. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as
    | { status?: string; priority?: string }
    | null;

  const updates: Record<string, unknown> = {};
  const validStatuses = ["open", "in_progress", "waiting_on_user", "resolved", "closed"];
  const validPriorities = ["low", "normal", "high"];

  if (body?.status) {
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ ok: false, error: "Ungültiger Status." }, { status: 400 });
    }
    updates.status = body.status;
    updates.resolved_at = body.status === "resolved" || body.status === "closed" ? new Date().toISOString() : null;
  }
  if (body?.priority) {
    if (!validPriorities.includes(body.priority)) {
      return NextResponse.json({ ok: false, error: "Ungültige Priorität." }, { status: 400 });
    }
    updates.priority = body.priority;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "Keine Änderungen übergeben." }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: updated, error: updateErr } = await service
    .from("support_tickets")
    .update(updates)
    .eq("id", id)
    .select("id,status,priority,resolved_at")
    .maybeSingle();

  if (updateErr) {
    return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Ticket nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ticket: updated });
}
