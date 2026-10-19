import { NextResponse } from "next/server";
import { PRODUKTE } from "@/config/mentoring";
import { starteKasse } from "@/lib/mentoring/kasse";
import { getAppUrl } from "@/lib/site-url";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/live-abo — Live-Trading-Abo (99 €/Monat) aus dem Mitgliederbereich.
 *
 * Der Knopf steht auf den Live-Seiten, sobald der Live-Zeitraum eines
 * Mentoring-Programms abgelaufen ist (`components/platform/LiveZugangAbgelaufen.tsx`).
 * Dieselbe Kasse wie der Kassenlink mit Produkt `live` (`lib/mentoring/kasse.ts`),
 * nur dass hier das angemeldete Konto den Kunden bestimmt.
 *
 * Antwortet immer mit einer Weiterleitung (das Formular ist ein einfaches
 * POST ohne JavaScript): in die Stripe-Kasse oder zurück mit `?live_fehler=`.
 */
export async function POST() {
  const appUrl = getAppUrl();
  const zurueck = (grund: string) =>
    NextResponse.redirect(new URL(`/live-session?live_fehler=${encodeURIComponent(grund)}`, appUrl), { status: 303 });

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email) {
    return NextResponse.redirect(new URL("/login?next=/live-session", appUrl), { status: 303 });
  }

  const start = await starteKasse(createServiceClient(), appUrl, {
    produkt: "live",
    raten: 1,
    betragCents: PRODUKTE.live.preisCents,
    email: user.email,
    userId: user.id,
  });

  if (!start.ok) return zurueck(start.grund);
  return NextResponse.redirect(start.url, { status: 303 });
}
