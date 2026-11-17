import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { freischaltenNachBuchung } from "@/lib/training/nach-buchung";

export const runtime = "nodejs";

/**
 * POST /api/training/nach-buchung — vom Browser direkt nach `calendly.event_scheduled`
 * (`/call` und Analysegespräch im Mitgliederbereich). Schaltet Free-Konten ohne
 * Zugang 30 Tage frei und nennt das Ziel (Free-Dashboard mit Termin-Karte).
 * Ohne Anmeldung `{ ziel: null }` — dann bleibt die Bestätigung im Modal stehen.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user?.email) return NextResponse.json({ ok: true, ziel: null });
  try {
    const { ziel } = await freischaltenNachBuchung(createServiceClient(), user.id, user.email);
    return NextResponse.json({ ok: true, ziel });
  } catch (err) {
    console.error("[training/nach-buchung]", err);
    return NextResponse.json({ ok: false, ziel: null }, { status: 500 });
  }
}
