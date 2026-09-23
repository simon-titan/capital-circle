import { NextResponse } from "next/server";
import { LIFETIME_MINDESTTAGE, pruefeLifetimeAngebot } from "@/lib/access-control/lifetime-offer";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * Lifetime-Popup im Mitgliederbereich (`components/platform/shell/LifetimePopup.tsx`).
 *
 * GET  → `{ zeigen }`: ob das Popup jetzt erscheinen soll.
 * POST → merkt sich, dass es geschlossen wurde (`profiles.lifetime_popup_gesehen_am`).
 *
 * Gezeigt wird es genau einmal, wenn alle drei Bedingungen stehen:
 *   1. `pruefeLifetimeAngebot()` erlaubt den Kauf. Damit gilt dieselbe Regel
 *      wie für Karte und Kasse: nicht für Lifetime und 1:1-Mentoring, nicht
 *      für Konten, die nie gezahlt haben, nicht bei abgeschaltetem Angebot.
 *      Ein Popup, dessen Knopf in eine gesperrte Kasse führt, wäre schlimmer
 *      als keins.
 *   2. Das Konto ist mindestens 30 Tage alt (`profiles.created_at`, Nutzerwunsch
 *      23.09.2026: „30 Tage nach der ersten Anmeldung"). Hier ausdrücklich
 *      auch für Ehemalige und die aus dem Whop-Umzug, die `pruefeLifetimeAngebot`
 *      von der Wartezeit ausnimmt: Kaufen dürfen sie sofort, das Popup kommt
 *      trotzdem erst nach einem Monat bei uns.
 *   3. Es wurde noch nicht geschlossen.
 *
 * Fehlt Migration 104, antwortet PostgREST auf die Spalte mit einem Fehler.
 * Dann gilt „noch nicht gesehen" — der Client merkt sich das Schliessen
 * zusätzlich im Browser, das Popup kommt also auf demselben Gerät nicht wieder.
 */

type Profil = { created_at: string | null; lifetime_popup_gesehen_am?: string | null };

async function leseProfil(userId: string): Promise<Profil | null> {
  const service = createServiceClient();
  const mitSpalte = await service
    .from("profiles")
    .select("created_at,lifetime_popup_gesehen_am")
    .eq("id", userId)
    .maybeSingle();
  if (!mitSpalte.error) return (mitSpalte.data as Profil | null) ?? null;

  const ohne = await service.from("profiles").select("created_at").eq("id", userId).maybeSingle();
  return (ohne.data as Profil | null) ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ zeigen: false }, { status: 401 });

  try {
    const profil = await leseProfil(auth.user.id);
    if (!profil || profil.lifetime_popup_gesehen_am) return NextResponse.json({ zeigen: false });

    const seit = profil.created_at ? new Date(profil.created_at) : null;
    if (!seit || Number.isNaN(seit.getTime())) return NextResponse.json({ zeigen: false });
    const tage = (Date.now() - seit.getTime()) / 86_400_000;
    if (tage < LIFETIME_MINDESTTAGE) return NextResponse.json({ zeigen: false });

    const angebot = await pruefeLifetimeAngebot(auth.user.id);
    return NextResponse.json({ zeigen: angebot.erlaubt, ehemalig: Boolean(angebot.ehemalig) });
  } catch {
    // Im Zweifel kein Popup: Ein nicht gezeigtes Angebot kostet nichts.
    return NextResponse.json({ zeigen: false });
  }
}

export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { error } = await createServiceClient()
    .from("profiles")
    .update({ lifetime_popup_gesehen_am: new Date().toISOString() })
    .eq("id", auth.user.id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
