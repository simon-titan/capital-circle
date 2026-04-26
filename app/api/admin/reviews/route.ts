import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * GET /api/admin/reviews?landing=bewerbung
 * Lists all reviews (visible + hidden) for admin management.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const landing = url.searchParams.get("landing") ?? undefined;

  const service = createServiceClient();
  let query = service
    .from("landing_reviews")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);

  if (landing) query = query.eq("landing_slug", landing);

  const { data, error: dbErr } = await query;
  if (dbErr) {
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}

/**
 * POST /api/admin/reviews
 * Creates a new review.
 */
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as Record<string, unknown>;
  const { name, rating, title, body: reviewBody, date_label, avatar_url, landing_slug, visible, sort_order } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("landing_reviews")
    .insert({
      name: name.trim(),
      rating: typeof rating === "number" ? rating : 5,
      title: typeof title === "string" ? title.trim() : "",
      body: typeof reviewBody === "string" ? reviewBody.trim() : "",
      date_label: typeof date_label === "string" ? date_label.trim() : "",
      avatar_url: typeof avatar_url === "string" ? avatar_url.trim() || null : null,
      landing_slug: typeof landing_slug === "string" ? landing_slug.trim() : "global",
      visible: typeof visible === "boolean" ? visible : true,
      sort_order: typeof sort_order === "number" ? sort_order : 0,
    })
    .select()
    .single();

  if (dbErr) {
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}
