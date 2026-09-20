import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPALTEN =
  "id,eingegangen_am,name,email,bestaetigung_email,vertrag_bezeichnung,vertrag_angabe,user_id,eingeloggt," +
  "vertrag_plan,stripe_subscription_id,vertragsschluss_am,frist_ende,fristgerecht,status,pruef_hinweis," +
  "bestaetigung_gesendet_am,erledigt_am,erledigt_notiz";

/**
 * GET /api/admin/widerrufe — Widerrufe aus der Widerrufsfunktion (`/widerrufen`).
 *
 * Neueste zuerst, höchstens 300. Gelesen wird mit dem Service-Client, weil
 * die Tabelle bewusst keine Policies hat (Migration 090); der Admin-Check
 * steht davor.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const { data, error: dbFehler } = await createServiceClient()
    .from("widerrufe")
    .select(SPALTEN)
    .order("eingegangen_am", { ascending: false })
    .limit(300);

  if (dbFehler) {
    const fehlt = /does not exist|schema cache/i.test(dbFehler.message);
    return NextResponse.json(
      {
        ok: false,
        error: fehlt
          ? "Die Tabelle „widerrufe“ fehlt. Migration 090_widerrufe.sql im Supabase-SQL-Editor einspielen."
          : dbFehler.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}
