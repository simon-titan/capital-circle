import { NextResponse } from "next/server";
import { PRODUKTE, erlaubteRaten } from "@/config/mentoring";
import { PROGRAMME_PFAD } from "@/config/training";
import { starteKasse } from "@/lib/mentoring/kasse";
import { getAppUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * POST /api/programme/ausbildung — Ausbildung (599 €) selbst kaufen, aus
 * „Ausbildung & Mentoring" (`/programme`). Formularfeld `raten` = 1 oder 2.
 *
 * Dieselbe Kasse wie Kassenlink und Live-Abo (`starteKasse`, Produkt
 * `ausbildung`); der Webhook (`lib/stripe/webhooks/mentoring.ts`) schaltet
 * frei: Stufe `mentoring`, Live 3 Monate, ein laufendes Abo endet zum
 * Periodenende. Bewusst **nicht** hinter dem Verkaufsschalter — der schließt
 * den alten Weg, das hier ist der neue.
 *
 * Antwortet immer mit einer Weiterleitung (einfaches POST-Formular ohne JS):
 * in die Stripe-Kasse oder zurück mit `?fehler=`.
 */
const DAUERZUGANG = new Set(["mentoring", "lifetime", "ht_1on1"]);

export async function POST(request: Request) {
  const appUrl = getAppUrl();
  const zurueck = (grund: string) =>
    NextResponse.redirect(new URL(`${PROGRAMME_PFAD}?fehler=${encodeURIComponent(grund)}`, appUrl), { status: 303 });

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email) return NextResponse.redirect(new URL(`/login?next=${PROGRAMME_PFAD}`, appUrl), { status: 303 });

  const form = await request.formData().catch(() => null);
  const raten = Number(form?.get("raten") ?? 1);
  if (!erlaubteRaten("ausbildung").includes(raten)) return zurueck("raten");

  // Wer die Inhalte schon dauerhaft hat, kauft sie nicht ein zweites Mal.
  const { data: profil } = await supabase.from("profiles").select("membership_tier").eq("id", user.id).maybeSingle();
  if (DAUERZUGANG.has(String(profil?.membership_tier ?? ""))) return zurueck("schon_enthalten");

  const start = await starteKasse(createServiceClient(), appUrl, {
    produkt: "ausbildung",
    raten,
    betragCents: PRODUKTE.ausbildung.preisCents,
    email: user.email,
    userId: user.id,
    abbruchPfad: PROGRAMME_PFAD,
    quelle: "programme",
  });

  if (!start.ok) return zurueck(start.grund);
  return NextResponse.redirect(start.url, { status: 303 });
}
