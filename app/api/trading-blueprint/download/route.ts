import { NextResponse } from "next/server";
import { BLUEPRINT_PFAD } from "@/config/free-bereich";
import { getPresignedDownloadUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { ladeBlueprintFreigabe } from "@/lib/training/blueprint-freigabe";
import { downloadName, ladeBlueprint } from "@/lib/trading-blueprint";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/trading-blueprint/download — leitet angemeldete Konten (Free und
 * Zahlende) auf eine fünf Minuten gültige, signierte R2-Adresse um. Ohne
 * Anmeldung geht es zum Login und danach zurück auf die Blueprint-Seite.
 *
 * Ist noch kein PDF hinterlegt oder fehlt die Datei in R2, landet man auf
 * `/trading-blueprint?fehler=datei` statt auf einer rohen S3-Fehlerseite.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", BLUEPRINT_PFAD);
    return NextResponse.redirect(login, 303);
  }

  // Free erst nach dem kompletten kostenlosen Kurs — sonst zurück auf die Seite mit dem Sperrhinweis.
  const freigabe = await ladeBlueprintFreigabe(supabase, data.user.id);
  if (!freigabe.frei) return NextResponse.redirect(new URL(BLUEPRINT_PFAD, request.url), 303);

  const blueprint = await ladeBlueprint();
  const fehler = new URL(`${BLUEPRINT_PFAD}?fehler=datei`, request.url);
  if (!blueprint.r2_key) return NextResponse.redirect(fehler, 303);

  try {
    const url = await getPresignedDownloadUrl(blueprint.r2_key, downloadName(blueprint), {
      contentType: "application/pdf",
    });
    if (!url) return NextResponse.redirect(fehler, 303);
    const antwort = NextResponse.redirect(url, 303);
    antwort.headers.set("Cache-Control", "no-store");
    return antwort;
  } catch (err) {
    console.error("[trading-blueprint/download]", err);
    return NextResponse.redirect(fehler, 303);
  }
}
