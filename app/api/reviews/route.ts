import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * GET /api/reviews?landing=bewerbung
 * Public endpoint — returns visible reviews for a given landing page.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const landing = url.searchParams.get("landing") ?? "global";

  const service = createServiceClient();
  const { data, error } = await service
    .from("landing_reviews")
    .select("id,name,rating,title,body,date_label,avatar_url,landing_slug")
    .eq("landing_slug", landing)
    .eq("visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}
