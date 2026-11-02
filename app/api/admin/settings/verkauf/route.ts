import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { VERKAUF_SCHLUESSEL, ladeVerkaufsSchalter, pruefeEingabe } from "@/lib/verkauf/schalter";

export const runtime = "nodejs";

/**
 * Verkaufsschalter (`lib/verkauf/schalter.ts`).
 *
 * Gespeichert werden die **Eingaben** (leere Felder bleiben leer), angezeigt
 * werden die Werte mit Standardtexten. So lässt sich ein Text zurück auf den
 * Standard setzen, indem man das Feld leert.
 */

/** GET /api/admin/settings/verkauf */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const service = createServiceClient();
  const { data } = await service
    .from("app_settings")
    .select("value")
    .eq("key", VERKAUF_SCHLUESSEL)
    .maybeSingle();

  return NextResponse.json({ ok: true, gespeichert: data?.value ?? null, wirksam: await ladeVerkaufsSchalter() });
}

/** PUT /api/admin/settings/verkauf { geschlossen, ueberschrift?, nachricht?, zielUrl?, zielLabel? } */
export async function PUT(request: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const eingabe = pruefeEingabe(body);
  if (!eingabe.ok) return NextResponse.json({ ok: false, error: eingabe.fehler }, { status: 400 });

  // Upsert statt update: Die Zeile gibt es erst nach dem ersten Speichern —
  // dafür braucht es keine Migration.
  const { error: dbErr } = await createServiceClient()
    .from("app_settings")
    .upsert(
      { key: VERKAUF_SCHLUESSEL, value: eingabe.wert, updated_by: user?.id ?? null },
      { onConflict: "key" },
    );

  if (dbErr) return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, gespeichert: eingabe.wert, wirksam: await ladeVerkaufsSchalter() });
}
