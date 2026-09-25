import { NextResponse } from "next/server";
import { protokolliere, sichereZeile, stempleProfil } from "@/lib/onboarding/server";
import { istNeukaeufer } from "@/lib/onboarding/weiche";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * „Weiter" auf dem Startbildschirm: Onboarding als begonnen merken und die
 * Antwortzeile anlegen (mit der Kennung Bestand/Neukäufer für die Auswertung).
 * Wirft nie — der Ablauf geht auch ohne gespeicherten Start weiter.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const service = createServiceClient();
  const { data: profil } = await service.from("profiles").select("created_at").eq("id", user.id).maybeSingle();
  await sichereZeile(service, user.id, !istNeukaeufer((profil?.created_at as string | null) ?? null));
  if (await stempleProfil(service, user.id, "onboarding_gestartet_am")) {
    await protokolliere(service, user.id, "onboarding_started");
  }
  return NextResponse.json({ ok: true });
}
