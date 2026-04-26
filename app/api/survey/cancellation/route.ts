import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifySurveyToken } from "@/lib/email/unsubscribe-token";

export const runtime = "nodejs";

/**
 * POST /api/survey/cancellation
 *
 * Body: {
 *   token: string,                  // HMAC-Token aus cancellation-survey.tsx
 *   reason: string,                 // Was hat gefehlt?
 *   structured_reason?: 'too_expensive'|'not_enough_value'|'tech_issues'|'other',
 *   feedback?: string|null          // Was hätte besser sein können?
 * }
 *
 * Auth-Modell: Token-only (kein Login erforderlich — der User hat
 * typischerweise nach Cancel keine aktive Session mehr).
 *
 * Schreibt: UPDATE der zuletzt erstellten `cancellations`-Row für diese
 * userId. Falls (noch) keine Row existiert (z. B. lokale Tests ohne Stripe-
 * Webhook-Event), wird ein neuer Eintrag angelegt.
 */

const ALLOWED_STRUCTURED = new Set([
  "too_expensive",
  "not_enough_value",
  "tech_issues",
  "other",
]);

interface Body {
  token?: unknown;
  reason?: unknown;
  structured_reason?: unknown;
  feedback?: unknown;
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ungültige Anfrage." },
      { status: 400 },
    );
  }

  const token = typeof body.token === "string" ? body.token : null;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Token fehlt." },
      { status: 400 },
    );
  }

  const userId = verifySurveyToken(token);
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Token ungültig oder abgelaufen." },
      { status: 401 },
    );
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const structured =
    typeof body.structured_reason === "string"
      ? body.structured_reason
      : "other";
  const feedback =
    typeof body.feedback === "string" && body.feedback.trim().length > 0
      ? body.feedback.trim()
      : null;

  if (reason.length < 10) {
    return NextResponse.json(
      { ok: false, error: "Bitte beschreibe kurz, was dir gefehlt hat." },
      { status: 400 },
    );
  }
  if (!ALLOWED_STRUCTURED.has(structured)) {
    return NextResponse.json(
      { ok: false, error: "Ungültige Auswahl." },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  // Letzte Cancellation-Row dieses Users finden (vom Stripe-Webhook angelegt).
  const { data: latest } = await service
    .from("cancellations")
    .select("id")
    .eq("user_id", userId)
    .order("canceled_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const updatePayload = {
    reason,
    structured_reason: structured,
    feedback,
  };

  if (latest) {
    const { error } = await service
      .from("cancellations")
      .update(updatePayload)
      .eq("id", (latest as { id: string }).id);
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
  } else {
    // Kein Webhook-Eintrag (z. B. manueller Cancel ohne Stripe-Event) → neuen
    // Datensatz anlegen, damit die Survey-Antwort nicht verloren geht.
    const { error } = await service.from("cancellations").insert({
      user_id: userId,
      ...updatePayload,
    });
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
