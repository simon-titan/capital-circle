import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * PUT /api/admin/reviews/[id]
 * Updates a review.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.rating === "number") updates.rating = body.rating;
  if (typeof body.title === "string") updates.title = body.title.trim();
  if (typeof body.body === "string") updates.body = body.body.trim();
  if (typeof body.date_label === "string") updates.date_label = body.date_label.trim();
  if (body.avatar_url === null || typeof body.avatar_url === "string") {
    updates.avatar_url = body.avatar_url ? (body.avatar_url as string).trim() : null;
  }
  if (typeof body.landing_slug === "string") updates.landing_slug = body.landing_slug.trim();
  if (typeof body.visible === "boolean") updates.visible = body.visible;
  if (typeof body.sort_order === "number") updates.sort_order = body.sort_order;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("landing_reviews")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (dbErr) {
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}

/**
 * DELETE /api/admin/reviews/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const service = createServiceClient();
  const { error: dbErr } = await service
    .from("landing_reviews")
    .delete()
    .eq("id", id);

  if (dbErr) {
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
