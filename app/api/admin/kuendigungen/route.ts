import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPALTEN =
  "id,eingegangen_am,name,email,bestaetigung_email,user_id,eingeloggt,art,grund,zeitpunkt_wunsch,vertrag_angabe," +
  "vertrag_plan,stripe_subscription_id,wirksam_zum,status,pruef_hinweis,ausgefuehrt_am,erledigt_am,bestaetigung_gesendet_am";

/**
 * GET /api/admin/kuendigungen — Kündigungen aus dem Kündigungsbutton (`/kuendigen`).
 *
 * Neueste zuerst, höchstens 300. Gelesen wird mit dem Service-Client, weil
 * die Tabelle bewusst keine Policies hat (Migration 072); der Admin-Check
 * steht davor.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const { data, error: dbFehler } = await createServiceClient()
    .from("kuendigungen")
    .select(SPALTEN)
    .order("eingegangen_am", { ascending: false })
    .limit(300);

  if (dbFehler) {
    const fehlt = /does not exist|schema cache/i.test(dbFehler.message);
    return NextResponse.json(
      {
        ok: false,
        error: fehlt
          ? "Die Tabelle „kuendigungen“ fehlt. Migration 072_kuendigungen.sql im Supabase-SQL-Editor einspielen."
          : dbFehler.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}
