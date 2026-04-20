import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSSRClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

export const runtime = "nodejs";

const MIN_EXPERIENCE = 30;
const MIN_PROBLEM = 50;
const MIN_GOAL = 50;

function clientIpFrom(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

/**
 * POST /api/applications/create
 *
 * Body: {
 *   experience: string,
 *   biggest_problem: string,
 *   goal_6_months: string,
 *   turnstileToken?: string
 * }
 *
 * Auth: eingeloggter User (Session-Cookie via @supabase/ssr).
 * Schreibt:
 *   - INSERT in public.applications (status='pending')
 *   - UPDATE profiles.application_status='pending'
 *
 * Sendet KEINE Email — das macht erst der Admin-Approve.
 */
export async function POST(request: NextRequest) {
  // 1. Auth-Check (User-Session aus Cookies)
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Bitte logge dich erst ein." },
      { status: 401 },
    );
  }

  // 2. Body parsen + validieren
  let body: {
    experience?: unknown;
    biggest_problem?: unknown;
    goal_6_months?: unknown;
    turnstileToken?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }

  const experience = typeof body.experience === "string" ? body.experience.trim() : "";
  const biggestProblem = typeof body.biggest_problem === "string" ? body.biggest_problem.trim() : "";
  const goal6Months = typeof body.goal_6_months === "string" ? body.goal_6_months.trim() : "";
  const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : null;

  if (experience.length < MIN_EXPERIENCE) {
    return NextResponse.json(
      { ok: false, error: `Bitte mindestens ${MIN_EXPERIENCE} Zeichen zur Erfahrung.` },
      { status: 400 },
    );
  }
  if (biggestProblem.length < MIN_PROBLEM) {
    return NextResponse.json(
      { ok: false, error: `Bitte mindestens ${MIN_PROBLEM} Zeichen zum Problem.` },
      { status: 400 },
    );
  }
  if (goal6Months.length < MIN_GOAL) {
    return NextResponse.json(
      { ok: false, error: `Bitte mindestens ${MIN_GOAL} Zeichen zum Ziel.` },
      { status: 400 },
    );
  }

  // 3. Turnstile verifizieren
  const ip = clientIpFrom(request);
  const turnstile = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstile.ok) {
    return NextResponse.json(
      { ok: false, error: "Captcha-Verifikation fehlgeschlagen.", details: turnstile.errorCodes },
      { status: 403 },
    );
  }

  // 4. Rate-Limit: ein User darf nur EINE Bewerbung haben
  const service = createServiceClient();
  const { data: existing } = await service
    .from("applications")
    .select("id,status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { ok: false, error: "Du hast bereits eine Bewerbung eingereicht." },
      { status: 409 },
    );
  }

  // 5. Profil-Daten für name/email-Snapshot
  const { data: profile } = await service
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const fullName = (profile?.full_name as string | null) ?? null;

  // 6. INSERT applications
  const userAgent = request.headers.get("user-agent") ?? null;
  const { data: inserted, error: insertErr } = await service
    .from("applications")
    .insert({
      user_id: user.id,
      email: user.email ?? "",
      name: fullName,
      experience,
      biggest_problem: biggestProblem,
      goal_6_months: goal6Months,
      status: "pending",
      ip_address: ip,
      user_agent: userAgent,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json(
      { ok: false, error: insertErr?.message ?? "Bewerbung konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }

  // 7. profiles.application_status synchron halten
  const { error: profileErr } = await service
    .from("profiles")
    .update({ application_status: "pending" })
    .eq("id", user.id);

  if (profileErr) {
    // Insert ist durch — wir loggen, scheitern aber nicht hart, damit der
    // User nicht im Limbo landet. Admin sieht trotzdem die Application.
    console.error("[applications/create] profile sync failed:", profileErr);
  }

  return NextResponse.json({ ok: true, applicationId: inserted.id as string });
}
