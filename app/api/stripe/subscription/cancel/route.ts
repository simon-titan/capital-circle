import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ladeAboKontext } from "@/lib/stripe/abo-kontext";
import {
  KUENDIGUNGS_GRUENDE,
  kuendigeAboZumPeriodenende,
  type KuendigungsGrund,
} from "@/lib/stripe/kuendigung";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  reason?: string;
  feedback?: string;
}

/**
 * POST /api/stripe/subscription/cancel
 *
 * Kündigung **zum Periodenende**, nicht sofort — der Komfortweg aus
 * `/einstellungen/abonnement` (mit Grund und Halte-Angebot davor). Die
 * eigentliche Ausführung (Stripe, `cancellations`, lokales Flag) steht in
 * `lib/stripe/kuendigung.ts`; der gesetzliche Kündigungsbutton `/kuendigen`
 * nutzt dieselbe Funktion.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const grund: KuendigungsGrund = (KUENDIGUNGS_GRUENDE as readonly string[]).includes(body.reason ?? "")
    ? (body.reason as KuendigungsGrund)
    : "other";
  const freitext = body.feedback?.trim().slice(0, 2000) || null;

  const kontext = await ladeAboKontext(user.id);
  if (!kontext?.abo) {
    return NextResponse.json({ ok: false, error: "kein_abo" }, { status: 400 });
  }
  if (kontext.abo.cancelAtPeriodEnd) {
    return NextResponse.json({ ok: false, error: "bereits_gekuendigt" }, { status: 400 });
  }

  const ergebnis = await kuendigeAboZumPeriodenende({
    userId: user.id,
    abo: kontext.abo,
    grund,
    freitext,
  });
  if (!ergebnis.ok) {
    return NextResponse.json({ ok: false, error: ergebnis.fehler, detail: ergebnis.detail }, { status: 502 });
  }

  return NextResponse.json({ ok: true, accessUntil: ergebnis.accessUntil });
}

/**
 * DELETE /api/stripe/subscription/cancel — Kündigung zurücknehmen.
 *
 * Solange die Periode läuft, ist das ein einziges Feld und kein neuer Kauf.
 * Danach gibt es nichts mehr zurückzunehmen; dann führt der Weg über die Kasse.
 */
export async function DELETE() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const kontext = await ladeAboKontext(user.id);
  if (!kontext?.abo) {
    return NextResponse.json({ ok: false, error: "kein_abo" }, { status: 400 });
  }

  try {
    await getStripe().subscriptions.update(kontext.abo.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
  } catch (err) {
    console.error("[stripe/subscription/cancel] Rücknahme fehlgeschlagen:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "stripe_fehler",
        detail: err instanceof Error ? err.message : "Unbekannter Fehler",
      },
      { status: 502 },
    );
  }

  const { error } = await createServiceClient()
    .from("subscriptions")
    .update({ cancel_at_period_end: false })
    .eq("id", kontext.abo.id);
  if (error) {
    console.error("[stripe/subscription/cancel] lokales Flag nicht zurückgesetzt:", error.message);
  }

  return NextResponse.json({ ok: true });
}
