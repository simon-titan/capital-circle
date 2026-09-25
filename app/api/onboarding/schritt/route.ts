import { NextResponse } from "next/server";
import { schliesseAbWennFertig } from "@/lib/onboarding/checkliste";
import { protokolliere, stempleSchritt } from "@/lib/onboarding/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * Aktionen der Start-Checkliste im Dashboard.
 *
 *   community_link      Vorstellungskanal geöffnet → „Als erledigt markieren" wird frei
 *   community_erledigt  Vorstellung von Hand bestätigt (nur nach geöffnetem Link)
 *   dashboard_gezeigt   Checkliste zum ersten Mal gesehen (Messpunkt)
 *   abschliessen        „Weiterlernen" nach „Alles eingerichtet." (prüft serverseitig)
 */
type Aktion = "community_link" | "community_erledigt" | "dashboard_gezeigt" | "abschliessen";
const AKTIONEN: Aktion[] = ["community_link", "community_erledigt", "dashboard_gezeigt", "abschliessen"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { aktion?: string };
  const aktion = body.aktion as Aktion;
  if (!AKTIONEN.includes(aktion)) return NextResponse.json({ ok: false }, { status: 400 });

  const service = createServiceClient();

  if (aktion === "community_link") {
    await stempleSchritt(service, user.id, "community_link_geoeffnet_am");
    return NextResponse.json({ ok: true });
  }

  if (aktion === "community_erledigt") {
    const { data } = await service
      .from("onboarding_antworten")
      .select("community_link_geoeffnet_am")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data?.community_link_geoeffnet_am) {
      return NextResponse.json({ ok: false, fehler: "Öffne zuerst den Vorstellungskanal." }, { status: 409 });
    }
    if (await stempleSchritt(service, user.id, "community_vorgestellt_am")) {
      await protokolliere(service, user.id, "onboarding_community_intro_completed", { erkannt: "bestaetigt" });
    }
    return NextResponse.json({ ok: true });
  }

  if (aktion === "dashboard_gezeigt") {
    await protokolliere(service, user.id, "onboarding_dashboard_shown");
    return NextResponse.json({ ok: true });
  }

  const fertig = await schliesseAbWennFertig(service, user.id);
  return NextResponse.json({ ok: fertig });
}
