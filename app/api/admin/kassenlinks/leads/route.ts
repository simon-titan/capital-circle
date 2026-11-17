import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * GET /api/admin/kassenlinks/leads?q=<Name oder E-Mail>
 *
 * Lead-Vorschläge für das Formular „Kassenlink anlegen". Höchstens acht
 * Treffer, neueste zuerst — der Closer sucht den Lead aus dem Call von eben,
 * nicht im ganzen Bestand.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ ok: true, items: [] });

  // Zeichen, die in PostgRESTs `or=(…)`-Syntax eine Bedeutung haben, fliegen raus.
  const sicher = q.replace(/[%,()*"\\]/g, " ").trim().slice(0, 80);
  if (!sicher) return NextResponse.json({ ok: true, items: [] });

  const { data, error: dbErr } = await createServiceClient()
    .from("discord_leads")
    .select("id,name,email,closer,closed,calendly_booked_at,created_at")
    .or(`name.ilike.%${sicher}%,email.ilike.%${sicher}%`)
    .order("created_at", { ascending: false })
    .limit(8);

  if (dbErr) {
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}
