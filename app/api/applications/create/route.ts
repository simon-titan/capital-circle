import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSSRClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { sendApplicationReceived } from "@/lib/email/templates/application-received";

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
 * Öffentlicher Endpoint (kein Auth-Cookie nötig). Legt Account + Bewerbung
 * in einem Rutsch an:
 *
 * Body: {
 *   full_name: string,
 *   email: string,
 *   password: string,
 *   experience: string,
 *   biggest_problem: string,
 *   goal_6_months: string,
 *   turnstileToken?: string
 * }
 *
 * Ablauf:
 *   1. Validierung aller Felder
 *   2. Turnstile verifizieren
 *   3. Supabase-User per Service-Role anlegen (email_confirm=true → keine Supabase-Mail)
 *   4. INSERT applications + UPDATE profiles.application_status='pending'
 *   5. Sofort-Bestätigungs-Mail via Resend
 *   6. User einloggen (Session-Cookies in Response)
 *   7. Return { ok: true, redirectTo: '/pending-review' }
 */
export async function POST(request: NextRequest) {
  // 1. Body parsen
  let body: {
    full_name?: unknown;
    email?: unknown;
    password?: unknown;
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

  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const experience = typeof body.experience === "string" ? body.experience.trim() : "";
  const biggestProblem = typeof body.biggest_problem === "string" ? body.biggest_problem.trim() : "";
  const goal6Months = typeof body.goal_6_months === "string" ? body.goal_6_months.trim() : "";
  const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : null;

  // 2. Validierung
  if (fullName.length < 2) {
    return NextResponse.json({ ok: false, error: "Bitte vollständigen Namen angeben." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Bitte eine gültige E-Mail-Adresse angeben." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "Das Passwort muss mindestens 8 Zeichen haben." }, { status: 400 });
  }
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

  const service = createServiceClient();

  // 4. Supabase-User per Service-Role anlegen (email_confirm=true → keine Bestätigungsmail von Supabase)
  const { data: createdAuth, error: createUserErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createUserErr) {
    // 422 = User existiert bereits
    if (
      createUserErr.message?.toLowerCase().includes("already") ||
      createUserErr.message?.toLowerCase().includes("exists") ||
      createUserErr.code === "email_exists"
    ) {
      return NextResponse.json(
        { ok: false, error: "Diese E-Mail-Adresse ist bereits registriert. Bitte logge dich ein." },
        { status: 409 },
      );
    }
    console.error("[applications/create] createUser failed:", createUserErr);
    return NextResponse.json(
      { ok: false, error: "Konto konnte nicht angelegt werden. Bitte versuche es erneut." },
      { status: 500 },
    );
  }

  const userId = createdAuth.user.id;

  // 5. Doppelbewerbung verhindern (Race-Condition-Schutz)
  const { data: existingApp } = await service
    .from("applications")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingApp) {
    return NextResponse.json(
      { ok: false, error: "Für diesen Account existiert bereits eine Bewerbung." },
      { status: 409 },
    );
  }

  // 6. INSERT applications
  const userAgent = request.headers.get("user-agent") ?? null;
  const { data: inserted, error: insertErr } = await service
    .from("applications")
    .insert({
      user_id: userId,
      email,
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
    console.error("[applications/create] insert failed:", insertErr);
    return NextResponse.json(
      { ok: false, error: insertErr?.message ?? "Bewerbung konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }

  // 7. profiles.application_status + full_name synchron halten
  const { error: profileErr } = await service
    .from("profiles")
    .update({ application_status: "pending", full_name: fullName })
    .eq("id", userId);

  if (profileErr) {
    console.error("[applications/create] profile sync failed:", profileErr);
  }

  // 8. Sofort-Bestätigungs-Mail — Fehler schlucken damit User nicht im Limbo landet
  const firstName = fullName.split(" ")[0] ?? fullName;
  try {
    await sendApplicationReceived({
      firstName,
      email,
      userId,
      applicationId: inserted.id as string,
    });
  } catch (mailErr) {
    console.error("[applications/create] confirmation mail failed:", mailErr);
  }

  // 9. User einloggen — SSR-Client setzt die Session-Cookies in den Response-Headers
  const ssrClient = await createSSRClient();
  const { error: signInErr } = await ssrClient.auth.signInWithPassword({ email, password });
  if (signInErr) {
    // Einloggen scheitert selten (nur wenn Supabase-Auth-Service kurz down) —
    // Bewerbung ist aber schon gespeichert, daher kein Fehler zurückgeben.
    // User landet auf /pending-review ohne aktive Session → proxy.ts leitet auf /login.
    console.error("[applications/create] auto-login failed:", signInErr);
  }

  return NextResponse.json({ ok: true, redirectTo: "/pending-review", applicationId: inserted.id as string });
}
