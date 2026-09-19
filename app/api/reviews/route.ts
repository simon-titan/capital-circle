import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * GET /api/reviews?landing=bewerbung
 * GET /api/reviews?landing=membership,global
 *
 * Öffentlicher Endpunkt — sichtbare Bewertungen einer oder mehrerer
 * Kategorien.
 *
 * Mehrere Kategorien, weil `global` genau dafür gedacht ist: Stimmen, die auf
 * jede Verkaufsseite passen. Bis zum 20.09.2026 fragte jede Seite nur ihre
 * eigene Kategorie ab, und die Verkaufsseite zeigte deshalb 4 Bewertungen,
 * während 25 unter `global` im Admin lagen und nirgends auftauchten.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const kategorien = (url.searchParams.get("landing") ?? "global")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);

  const service = createServiceClient();
  const { data, error } = await service
    .from("landing_reviews")
    .select("id,name,rating,title,body,date_label,avatar_url,landing_slug")
    .in("landing_slug", kategorien.length > 0 ? kategorien : ["global"])
    .eq("visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}
