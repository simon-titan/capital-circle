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

  /*
   * Die ausführlichen Stimmen zuerst (Wunsch Simon, 20.09.2026): Wer die
   * Bewertungen überfliegt, sieht dann zuerst die, die etwas erzählen — und
   * nicht drei Zeilen „Top!". Sortiert wird nach der Länge des Textes, bei
   * gleicher Länge bleibt die Reihenfolge aus der Datenbank (`sort_order`,
   * dann Datum) erhalten.
   *
   * Warum in JavaScript und nicht in der Abfrage: PostgREST kann nicht nach
   * `length(body)` ordnen, und eine eigene Spalte dafür müsste bei jeder
   * Änderung im Admin mitgepflegt werden.
   */
  const laenge = (r: { body?: string | null; title?: string | null }) =>
    (r.body?.trim().length ?? 0) + (r.title?.trim().length ?? 0);

  const items = [...(data ?? [])].sort((a, b) => laenge(b) - laenge(a));

  return NextResponse.json({ ok: true, items });
}
