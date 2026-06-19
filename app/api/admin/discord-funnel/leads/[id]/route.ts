import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  CLOSED_VALUES,
  CLOSERS,
  CLOSE_TYPES,
  MEMBERSHIP_INSTALLMENTS,
  type ClosedValue,
  type CloserId,
  type CloseType,
} from "@/lib/discord-funnel/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/discord-funnel/leads/[id]
 *
 * Aktualisiert die Closer-Felder eines Leads. Body darf beliebige Teilmenge von:
 *   { qualified, no_show, closed, closer, close_type, membership_installments,
 *     closed_at, product, revenue_cents, internal_notes }
 * enthalten. Enums werden gegen die Konstanten aus types.ts validiert.
 *
 * Konsistenzregeln (serverseitig):
 *  - close_type != 'membership' (effektiv) → membership_installments zwingend null.
 *  - membership_installments nur erlaubt, wenn close_type === 'membership' im Body
 *    ODER bereits am Lead.
 *  - closed = 'closed_won' im Body ohne mitgeliefertes closed_at → closed_at = now().
 */

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing lead id." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if ("qualified" in body) {
    const v = body.qualified;
    if (v !== null && typeof v !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "qualified muss boolean oder null sein." },
        { status: 400 },
      );
    }
    update.qualified = v;
  }

  if ("no_show" in body) {
    if (typeof body.no_show !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "no_show muss boolean sein." },
        { status: 400 },
      );
    }
    update.no_show = body.no_show;
  }

  if ("closed" in body) {
    const v = body.closed;
    if (typeof v !== "string" || !CLOSED_VALUES.includes(v as ClosedValue)) {
      return NextResponse.json(
        { ok: false, error: "closed muss pending|closed_won|closed_lost sein." },
        { status: 400 },
      );
    }
    update.closed = v;
  }

  if ("product" in body) {
    const v = body.product;
    if (v !== null && typeof v !== "string") {
      return NextResponse.json(
        { ok: false, error: "product muss Text oder null sein." },
        { status: 400 },
      );
    }
    update.product = v === "" ? null : v;
  }

  if ("revenue_cents" in body) {
    const v = body.revenue_cents;
    if (v !== null && (typeof v !== "number" || !Number.isFinite(v) || v < 0)) {
      return NextResponse.json(
        { ok: false, error: "revenue_cents muss eine nicht-negative Zahl oder null sein." },
        { status: 400 },
      );
    }
    update.revenue_cents = v === null ? null : Math.round(v as number);
  }

  if ("internal_notes" in body) {
    const v = body.internal_notes;
    if (v !== null && typeof v !== "string") {
      return NextResponse.json(
        { ok: false, error: "internal_notes muss Text oder null sein." },
        { status: 400 },
      );
    }
    update.internal_notes = v === "" ? null : v;
  }

  // ── Neue Closer-Felder ──────────────────────────────────────────────────────
  if ("closer" in body) {
    const v = body.closer;
    if (v !== null && (typeof v !== "string" || !CLOSERS.includes(v as CloserId))) {
      return NextResponse.json(
        { ok: false, error: "closer muss kevin|simon oder null sein." },
        { status: 400 },
      );
    }
    update.closer = v;
  }

  if ("close_type" in body) {
    const v = body.close_type;
    if (v !== null && (typeof v !== "string" || !CLOSE_TYPES.includes(v as CloseType))) {
      return NextResponse.json(
        { ok: false, error: "close_type muss one_to_one|membership oder null sein." },
        { status: 400 },
      );
    }
    update.close_type = v;
  }

  if ("membership_installments" in body) {
    const v = body.membership_installments;
    if (
      v !== null &&
      (typeof v !== "number" || !(MEMBERSHIP_INSTALLMENTS as readonly number[]).includes(v))
    ) {
      return NextResponse.json(
        { ok: false, error: "membership_installments muss 1|2|4 oder null sein." },
        { status: 400 },
      );
    }
    update.membership_installments = v;
  }

  if ("closed_at" in body) {
    const v = body.closed_at;
    if (v !== null) {
      if (typeof v !== "string" || Number.isNaN(new Date(v).getTime())) {
        return NextResponse.json(
          { ok: false, error: "closed_at muss ein ISO-Datum oder null sein." },
          { status: 400 },
        );
      }
      update.closed_at = new Date(v).toISOString();
    } else {
      update.closed_at = null;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { ok: false, error: "Keine gültigen Felder im Body." },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  // Bestehenden Lead laden, um Konsistenzregeln gegen die effektiven Werte zu prüfen.
  const { data: existing, error: fetchError } = await service
    .from("discord_leads")
    .select("close_type,membership_installments")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Lead nicht gefunden." }, { status: 404 });
  }

  // ── Konsistenzregeln (gegen effektive Werte: Body überschreibt Bestand) ──────
  const effectiveCloseType =
    "close_type" in update
      ? (update.close_type as CloseType | null)
      : (existing.close_type as CloseType | null);

  if (effectiveCloseType !== "membership") {
    // Versuch, explizit Raten zu setzen, obwohl effektiv keine Mitgliedschaft → 400.
    if ("membership_installments" in update && update.membership_installments !== null) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "membership_installments ist nur bei close_type='membership' erlaubt.",
        },
        { status: 400 },
      );
    }
    // Stale Bestandswert (oder explizit gesetztes) bei nicht-Mitgliedschaft → null erzwingen.
    if (
      ("membership_installments" in update && update.membership_installments !== null) ||
      (!("membership_installments" in update) && existing.membership_installments !== null)
    ) {
      update.membership_installments = null;
    }
  }

  // closed = 'closed_won' im Body ohne mitgeliefertes closed_at → closed_at = now().
  if (update.closed === "closed_won" && !("closed_at" in update)) {
    update.closed_at = new Date().toISOString();
  }

  update.updated_at = new Date().toISOString();

  const { data, error } = await service
    .from("discord_leads")
    .update(update)
    .eq("id", id)
    .select(
      "id,qualified,no_show,closed,closer,close_type,membership_installments,closed_at,product,revenue_cents,internal_notes,updated_at",
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Lead nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item: data });
}
