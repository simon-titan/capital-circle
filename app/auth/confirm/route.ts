import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Einlösepunkt für Links aus unseren E-Mails (Passwort setzen / zurücksetzen).
 *
 * **Warum nicht der bequeme `action_link`?**
 * `generateLink` erzeugt einen Link auf Supabases `/auth/v1/verify`. Dessen
 * Antwort ist eine Weiterleitung, die Access- und Refresh-Token im
 * **Hash-Fragment** anhängt (`#access_token=…`). Fragmente werden vom Browser
 * niemals an den Server geschickt — serverseitig kommt dort also nichts an.
 * Das Ergebnis wäre eine Seite „Passwort setzen" ohne Sitzung, und zwar bei
 * jedem Kunden, weil der Fehler nicht am Konto hängt, sondern am Weg.
 *
 * Der Weg, der mit serverseitigem Rendering funktioniert: Wir schicken den
 * `hashed_token` aus derselben Antwort an diese Route. `verifyOtp` löst ihn
 * serverseitig ein und schreibt die Sitzung in die Cookies — dort, wo sie
 * hingehört. Gebaut werden diese Links ausschließlich in
 * `lib/auth/password-link.ts`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "recovery") as EmailOtpType;
  const next = url.searchParams.get("next") ?? "/set-password";

  const appUrl = getAppUrl();

  if (!tokenHash) {
    return NextResponse.redirect(new URL("/login?fehler=link_ungueltig", appUrl));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    // Häufigster Fall: Link abgelaufen oder bereits benutzt (Einmal-Token).
    // Der Nutzer landet dort, wo er sich selbst einen neuen holen kann.
    console.warn("[auth/confirm] verifyOtp fehlgeschlagen:", error.message);
    return NextResponse.redirect(new URL("/login?fehler=link_abgelaufen", appUrl));
  }

  // Nur interne Ziele zulassen — sonst wäre die Route eine offene Weiterleitung,
  // mit der sich frisch eingeloggte Nutzer auf fremde Seiten schicken ließen.
  const ziel = next.startsWith("/") && !next.startsWith("//") ? next : "/set-password";
  return NextResponse.redirect(new URL(ziel, appUrl));
}
