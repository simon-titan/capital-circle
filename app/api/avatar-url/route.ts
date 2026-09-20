import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPresignedGetUrl } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Signierte Adresse für Profilbilder (Prefix `avatars/`).
 *
 * Warum es die Route braucht: `POST /api/profile/avatar` legt das Bild in R2
 * ab und schreibt den **Schlüssel** (`avatars/<userId>/<datei>`) nach
 * `profiles.avatar_url`. Der Bucket ist nicht öffentlich, ein Schlüssel ist
 * also keine Adresse. Bis zum 20.09.2026 stand er trotzdem direkt im
 * `src`-Attribut — der Upload lief durch, zu sehen war danach nichts.
 *
 * Wie `cover-url`: eine Weiterleitung statt einer JSON-Antwort, damit ein
 * schlichtes `<img src="/api/avatar-url?key=…">` genügt.
 *
 * Sichtbar für jedes angemeldete Mitglied, weil Profilbilder auch neben
 * News-Kommentaren stehen. Der Schlüssel muss mit `avatars/` beginnen, sonst
 * ließe sich über diese Route jede Datei im Speicher signieren.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const key = new URL(request.url).searchParams.get("key")?.trim() ?? "";
  if (!key || !key.startsWith("avatars/") || key.includes("..")) {
    return NextResponse.json({ ok: false, error: "invalid_key" }, { status: 400 });
  }

  const signed = await getPresignedGetUrl(key);
  return NextResponse.redirect(signed, 307);
}
