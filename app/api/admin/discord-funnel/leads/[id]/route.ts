import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/discord-funnel/leads/[id]
 *
 * Aktualisiert die Closer-Felder eines Leads. Body darf beliebige Teilmenge von:
 *   { qualified, no_show, closed, product, revenue_cents, internal_notes }
 * enthalten. `closed` wird gegen das Enum validiert.
 */

const CLOSED_VALUES = ["pending", "closed_won", "closed_lost"] as const;
type ClosedValue = (typeof CLOSED_VALUES)[number];

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

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { ok: false, error: "Keine gültigen Felder im Body." },
      { status: 400 },
    );
  }

  update.updated_at = new Date().toISOString();

  const service = createServiceClient();
  const { data, error } = await service
    .from("discord_leads")
    .update(update)
    .eq("id", id)
    .select(
      "id,qualified,no_show,closed,product,revenue_cents,internal_notes,updated_at",
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
