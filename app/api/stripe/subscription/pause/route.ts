import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ladeAboKontext } from "@/lib/stripe/abo-kontext";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Eine bis drei Monate — länger ist keine Pause mehr, sondern eine Kündigung. */
const ERLAUBTE_MONATE = [1, 2, 3] as const;

interface Body {
  months?: number;
  reason?: string;
}

/**
 * POST /api/stripe/subscription/pause
 *
 * Halte-Angebot aus dem Kündigungs-Flow: Abrechnung für ein bis drei Monate
 * einfrieren, statt das Abo zu beenden.
 *
 * `behavior: "void"` verwirft die Rechnungen des Pausenzeitraums, statt sie
 * anzusammeln. Die Alternative `keep_as_draft` würde dem Mitglied nach der
 * Pause drei Monatsbeiträge auf einmal präsentieren — das wäre keine Pause,
 * sondern ein Aufschub, und der nächste Kündigungsversuch käme sofort.
 *
 * Der Zugang endet für die Dauer der Pause; `pause_collection` lässt den
 * Stripe-Status auf `active`, deshalb zieht `subscription-updated.ts` das
 * `access_until` zurück (siehe `pausiereProfil`).
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

  const monate = (ERLAUBTE_MONATE as readonly number[]).includes(Number(body.months))
    ? Number(body.months)
    : 1;

  const kontext = await ladeAboKontext(user.id);
  if (!kontext?.abo) {
    return NextResponse.json({ ok: false, error: "kein_abo" }, { status: 400 });
  }
  if (kontext.abo.cancelAtPeriodEnd) {
    return NextResponse.json({ ok: false, error: "bereits_gekuendigt" }, { status: 400 });
  }

  /*
    Die Pause beginnt nicht heute, sondern am Ende der bezahlten Periode: Der
    laufende Monat ist bezahlt, und ihn sofort zu sperren, waere eine
    Teilenteignung. Gerechnet wird ab dem Periodenende.
  */
  const start = new Date(kontext.abo.currentPeriodEnd);
  const bis = new Date(start);
  bis.setMonth(bis.getMonth() + monate);

  try {
    await getStripe().subscriptions.update(kontext.abo.stripeSubscriptionId, {
      pause_collection: {
        behavior: "void",
        resumes_at: Math.floor(bis.getTime() / 1000),
      },
      metadata: { pause_monate: String(monate), pause_grund: body.reason?.slice(0, 80) ?? "" },
    });
  } catch (err) {
    console.error("[stripe/subscription/pause] fehlgeschlagen:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "stripe_fehler",
        detail: err instanceof Error ? err.message : "Unbekannter Fehler",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    months: monate,
    resumesAt: bis.toISOString(),
    accessUntil: kontext.abo.currentPeriodEnd,
  });
}

/**
 * DELETE /api/stripe/subscription/pause — Pause vorzeitig beenden.
 *
 * Stripe schickt daraufhin `customer.subscription.resumed`; erst dieser
 * Handler schaltet den Zugang wieder frei. Wir schreiben hier bewusst nichts
 * ins Profil, sonst gäbe es zwei Schreibpfade auf dieselbe Zeile.
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
      pause_collection: "",
    });
  } catch (err) {
    console.error("[stripe/subscription/pause] Fortsetzen fehlgeschlagen:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "stripe_fehler",
        detail: err instanceof Error ? err.message : "Unbekannter Fehler",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
