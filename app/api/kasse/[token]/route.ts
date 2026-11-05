import { NextResponse, type NextRequest } from "next/server";
import { kassenlinkZustand, ladeKassenlink, starteKasse } from "@/lib/mentoring/kasse";
import { getAppUrl } from "@/lib/site-url";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * POST /api/kasse/<token> — vom Knopf auf der Kassenseite (`app/kasse/[token]`).
 *
 * Liegt unter `/api` und nicht als `app/kasse/[token]/route.ts`, weil an
 * derselben Adresse schon die Seite wohnt; Seite und Route Handler dürfen sich
 * kein Segment teilen.
 *
 * Nur POST: Ein GET legte bei jeder Link-Vorschau eine Stripe-Kasse an (siehe
 * `components/kasse/KassenKnopf.tsx`). Jeder Klick erzeugt eine frische
 * Session; der Link selbst bleibt gültig, bis bezahlt, storniert oder
 * abgelaufen ist. Antwort immer 303, damit der Browser dem Ziel per GET folgt.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const appUrl = getAppUrl();
  const zurueck = (fehler?: string) =>
    NextResponse.redirect(
      new URL(`/kasse/${encodeURIComponent(token)}${fehler ? `?fehler=${encodeURIComponent(fehler)}` : ""}`, appUrl),
      303,
    );

  const service = createServiceClient();
  const link = await ladeKassenlink(service, token);
  // Unbekannt, bezahlt, storniert oder abgelaufen: Die Seite sagt selbst, was los ist.
  if (!link || kassenlinkZustand(link) !== "offen") return zurueck();

  const start = await starteKasse(service, appUrl, {
    produkt: link.produkt,
    raten: link.raten,
    betragCents: link.betrag_cents,
    email: link.email,
    name: link.name,
    closer: link.closer,
    kassenlinkId: link.id,
    token: link.token,
  });

  if (!start.ok) return zurueck(start.grund);
  return NextResponse.redirect(start.url, 303);
}
