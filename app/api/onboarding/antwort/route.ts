import { NextResponse } from "next/server";
import {
  BASIS_FELDER,
  FREE_FELDER,
  FRAGEN_FELDER,
  KAEUFER_FELDER,
  MEHRFACH_SPALTE,
  MEHRFACH_TRENNER,
  SONSTIGES_MAX,
  frageNummer,
  frageZu,
  istGueltigeAntwort,
  type FrageFeld,
  type OnboardingEreignis,
} from "@/config/onboarding";
import { ladeOnboardingProfil } from "@/lib/onboarding/profil";
import { icpArt } from "@/lib/onboarding/weiche";
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
 * Sind danach die fünf aus 107 beantwortet, steht `profiles.onboarding_fragen_am`;
 * Fragen 1–7 stempeln `icp_free_am`, 1–10 `icp_kaeufer_am` (Migration 113).
 * Welche Menge ein Konto braucht, sagt `icpArt` — die Weiche in `proxy.ts`
 * lässt danach ins Dashboard. Dabei wird einmal die
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
  const roh = typeof body.wert === "string" ? body.wert : "";
  if (!FRAGEN_FELDER.includes(feld)) {
    return NextResponse.json({ ok: false, fehler: "Ungültige Antwort." }, { status: 400 });
  }
  // Mehrfachfrage (Frage 3): kommagetrennt, Reihenfolge = angetippt, erste = Hauptantwort.
  const mehrfach = Boolean(frageZu(feld).mehrfach);
  const gewaehlt = mehrfach ? [...new Set(roh.split(MEHRFACH_TRENNER).map((w) => w.trim()).filter(Boolean))] : [roh];
  if (!gewaehlt.length || !gewaehlt.every((w) => istGueltigeAntwort(feld, w))) {
    return NextResponse.json({ ok: false, fehler: "Ungültige Antwort." }, { status: 400 });
  }
  const wert = gewaehlt[0]!;

  const service = createServiceClient();
  const { data: profilZeit } = await service.from("profiles").select("created_at").eq("id", user.id).maybeSingle();
  const bestand = !istNeukaeufer((profilZeit?.created_at as string | null) ?? null);
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

  // Ohne Migration 113 gibt es die Spalten der Fragen 5–6 und 8–10 noch nicht.
  const { profil, icpSpalteDa, trainingAngenommen } = await ladeOnboardingProfil(service, user.id);
  if (!icpSpalteDa && !BASIS_FELDER.includes(feld)) {
    return NextResponse.json({ ok: false, fehler: "Ungültige Antwort." }, { status: 400 });
  }
  const spalten = `${(icpSpalteDa ? FRAGEN_FELDER : BASIS_FELDER).join(",")},attribution`;
  const listenSpalte = mehrfach ? MEHRFACH_SPALTE[feld] : undefined;
  let { data: zeile, error } = await service
    .from("onboarding_antworten")
    .update(listenSpalte ? { ...update, [listenSpalte]: gewaehlt } : update)
    .eq("user_id", user.id)
    .select(spalten)
    .maybeSingle();
  // Ohne Migration 115 fehlt die Listen-Spalte (42703) → nur die Hauptantwort speichern.
  if (error && listenSpalte && (error.code === "42703" || error.code === "PGRST204")) {
    ({ data: zeile, error } = await service.from("onboarding_antworten").update(update).eq("user_id", user.id).select(spalten).maybeSingle());
  }
  if (error || !zeile) {
    console.error("[onboarding/antwort] Speichern fehlgeschlagen:", error?.message);
    return NextResponse.json({ ok: false, fehler: "Antwort konnte nicht gespeichert werden." }, { status: 500 });
  }

  // Wer direkt bei einer Frage einsteigt (Wiederaufnahme), hat den Start schon.
  await stempleProfil(service, user.id, "onboarding_gestartet_am");
  await protokolliere(service, user.id, `onboarding_question_${frageNummer(feld)}_completed` as OnboardingEreignis);

  const werte = zeile as unknown as Record<string, unknown>;
  const komplett = (felder: FrageFeld[]) => felder.every((f) => typeof werte[f] === "string" && werte[f]);
  const art = icpArt(profil, trainingAngenommen);
  if (icpSpalteDa && komplett(FREE_FELDER)) await stempleProfil(service, user.id, "icp_free_am");
  if (icpSpalteDa && komplett(KAEUFER_FELDER) && art === "kaeufer") await stempleProfil(service, user.id, "icp_kaeufer_am");
  // Fertig heißt: die Menge, die dieses Konto braucht, ist vollständig.
  const fertig = komplett(!icpSpalteDa || !art || art === "mitglied" ? BASIS_FELDER : art === "kaeufer" ? KAEUFER_FELDER : FREE_FELDER);
  if (fertig) {
    if (!werte.attribution) {
      const attribution = await ladeAttribution(service, user.id);
      if (attribution) {
        await service.from("onboarding_antworten").update({ attribution }).eq("user_id", user.id);
      }
    }
    if (komplett(BASIS_FELDER) && (await stempleProfil(service, user.id, "onboarding_fragen_am"))) {
      await protokolliere(service, user.id, "onboarding_questions_completed");
    }
  }

  return NextResponse.json({ ok: true, fertig });
}
