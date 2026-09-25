import { NextResponse } from "next/server";
import {
  FRAGEN_FELDER,
  SONSTIGES_MAX,
  istGueltigeAntwort,
  type FrageFeld,
  type OnboardingEreignis,
} from "@/config/onboarding";
import { ladeAttribution, protokolliere, sichereZeile, stempleProfil } from "@/lib/onboarding/server";
import { istNeukaeufer } from "@/lib/onboarding/weiche";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * Eine ICP-Antwort speichern — sofort nach jedem Tippen, damit der Fortschritt
 * nie verloren geht (Tab zu, Akku leer). Beim erneuten Öffnen springt
 * `/einsteig` zur ersten offenen Frage.
 *
 * Sind danach alle fünf beantwortet, steht `profiles.onboarding_fragen_am`,
 * und die Weiche in `proxy.ts` lässt ins Dashboard. Dabei wird einmal die
 * technische Herkunft (UTM) mitgeschrieben — getrennt von der selbst
 * angegebenen Quelle aus Frage 5.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ ok: false, fehler: "Nicht angemeldet." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    feld?: string;
    wert?: string;
    sonstiges?: string | null;
  };
  const feld = body.feld as FrageFeld;
  const wert = typeof body.wert === "string" ? body.wert : "";
  if (!FRAGEN_FELDER.includes(feld) || !istGueltigeAntwort(feld, wert)) {
    return NextResponse.json({ ok: false, fehler: "Ungültige Antwort." }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: profil } = await service.from("profiles").select("created_at").eq("id", user.id).maybeSingle();
  const bestand = !istNeukaeufer((profil?.created_at as string | null) ?? null);
  if (!(await sichereZeile(service, user.id, bestand))) {
    return NextResponse.json({ ok: false, fehler: "Antwort konnte nicht gespeichert werden." }, { status: 500 });
  }

  // `bestand` jedes Mal mitschreiben: Die Zeile kann schon vorher entstanden
  // sein (z. B. beim Discord-Verbinden), dann mit dem Standardwert.
  const update: Record<string, unknown> = { [feld]: wert, bestand, updated_at: new Date().toISOString() };
  if (feld === "discovery_source") {
    const text = typeof body.sonstiges === "string" ? body.sonstiges.trim().slice(0, SONSTIGES_MAX) : "";
    update.discovery_source_other = wert === "sonstiges" && text ? text : null;
  }

  const { data: zeile, error } = await service
    .from("onboarding_antworten")
    .update(update)
    .eq("user_id", user.id)
    .select(`${FRAGEN_FELDER.join(",")},attribution`)
    .maybeSingle();
  if (error || !zeile) {
    console.error("[onboarding/antwort] Speichern fehlgeschlagen:", error?.message);
    return NextResponse.json({ ok: false, fehler: "Antwort konnte nicht gespeichert werden." }, { status: 500 });
  }

  // Wer direkt bei einer Frage einsteigt (Wiederaufnahme), hat den Start schon.
  await stempleProfil(service, user.id, "onboarding_gestartet_am");
  const nummer = FRAGEN_FELDER.indexOf(feld) + 1;
  await protokolliere(service, user.id, `onboarding_question_${nummer}_completed` as OnboardingEreignis);

  const werte = zeile as unknown as Record<string, unknown>;
  const fertig = FRAGEN_FELDER.every((f) => typeof werte[f] === "string" && werte[f]);
  if (fertig) {
    if (!werte.attribution) {
      const attribution = await ladeAttribution(service, user.id);
      if (attribution) {
        await service.from("onboarding_antworten").update({ attribution }).eq("user_id", user.id);
      }
    }
    if (await stempleProfil(service, user.id, "onboarding_fragen_am")) {
      await protokolliere(service, user.id, "onboarding_questions_completed");
    }
  }

  return NextResponse.json({ ok: true, fertig });
}
