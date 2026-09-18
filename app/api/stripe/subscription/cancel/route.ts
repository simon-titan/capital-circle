import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ladeAboKontext } from "@/lib/stripe/abo-kontext";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Die vier Gründe aus `cancellations.structured_reason` (044). Der
 * Check-Constraint dort kennt genau diese — ein fünfter Wert liesse den
 * Insert scheitern, nachdem das Abo bei Stripe bereits gekündigt wäre.
 */
const GRUENDE = ["too_expensive", "not_enough_value", "tech_issues", "other"] as const;
type Grund = (typeof GRUENDE)[number];

/**
 * Stripes eigene Rückmeldungs-Kategorien. Sie landen in
 * `cancellation_details.feedback` und tauchen in den Stripe-Auswertungen auf —
 * unsere vier Gründe lassen sich nicht 1:1 abbilden, deshalb die Zuordnung.
 */
const STRIPE_FEEDBACK: Record<Grund, "too_expensive" | "missing_features" | "unused" | "other"> = {
  too_expensive: "too_expensive",
  not_enough_value: "missing_features",
  tech_issues: "other",
  other: "other",
};

interface Body {
  reason?: string;
  feedback?: string;
}

/**
 * POST /api/stripe/subscription/cancel
 *
 * Kündigung **zum Periodenende**, nicht sofort. Der Zugang ist bezahlt und
 * läuft bis `current_period_end` weiter — eine sofortige Sperre wäre eine
 * Teilenteignung und würde jede Rückkehr verbauen.
 *
 * Reihenfolge mit Absicht: erst Stripe, dann die eigene Zeile. Scheitert
 * Stripe, steht bei uns keine Kündigung, die es dort nicht gibt. Scheitert
 * danach der Insert, fehlt nur die Statistikzeile — protokolliert, aber kein
 * Grund, dem Nutzer einen Fehler zu zeigen, dessen Kündigung längst steht.
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

  const grund: Grund = (GRUENDE as readonly string[]).includes(body.reason ?? "")
    ? (body.reason as Grund)
    : "other";
  const freitext = body.feedback?.trim().slice(0, 2000) || null;

  const kontext = await ladeAboKontext(user.id);
  if (!kontext?.abo) {
    return NextResponse.json({ ok: false, error: "kein_abo" }, { status: 400 });
  }
  if (kontext.abo.cancelAtPeriodEnd) {
    return NextResponse.json({ ok: false, error: "bereits_gekuendigt" }, { status: 400 });
  }

  let endeISO = kontext.abo.currentPeriodEnd;

  try {
    const aktualisiert = await getStripe().subscriptions.update(kontext.abo.stripeSubscriptionId, {
      cancel_at_period_end: true,
      cancellation_details: {
        feedback: STRIPE_FEEDBACK[grund],
        comment: freitext ?? undefined,
      },
    });
    const ende = aktualisiert.items?.data?.[0] as { current_period_end?: number } | undefined;
    if (typeof ende?.current_period_end === "number") {
      endeISO = new Date(ende.current_period_end * 1000).toISOString();
    }
  } catch (err) {
    console.error("[stripe/subscription/cancel] Stripe-Update fehlgeschlagen:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "stripe_fehler",
        detail: err instanceof Error ? err.message : "Unbekannter Fehler",
      },
      { status: 502 },
    );
  }

  const service = createServiceClient();

  const { error: insertFehler } = await service.from("cancellations").insert({
    user_id: user.id,
    subscription_id: kontext.abo.id,
    structured_reason: grund,
    reason: grund,
    feedback: freitext,
  });
  if (insertFehler) {
    console.error("[stripe/subscription/cancel] cancellations-Insert fehlgeschlagen:", insertFehler.message);
  }

  // Die `subscriptions`-Zeile pflegt sonst der Webhook. Wir setzen das Flag
  // trotzdem sofort, damit die Seite nach dem Neuladen nicht noch „aktiv"
  // zeigt, falls der Webhook ein paar Sekunden braucht.
  const { error: syncFehler } = await service
    .from("subscriptions")
    .update({ cancel_at_period_end: true })
    .eq("id", kontext.abo.id);
  if (syncFehler) {
    console.error("[stripe/subscription/cancel] lokales Flag nicht gesetzt:", syncFehler.message);
  }

  return NextResponse.json({ ok: true, accessUntil: endeISO });
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
