import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { STEP2_QUESTIONS } from "@/config/insight-step2-questions";
import { sendStep2Invite } from "@/lib/email/templates/step2-invite";

export const runtime = "nodejs";

/**
 * POST /api/applications/step2/create
 *
 * Geschützter Endpoint: Nur eingeloggte Nutzer mit application_status='approved'
 * und membership_tier='free' dürfen die Step-2-Bewerbung einreichen.
 *
 * Body: { answers: Record<string, string> }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return NextResponse.json({ ok: false, error: "Nicht eingeloggt." }, { status: 401 });
  }

  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("application_status, membership_tier, is_paid, step2_application_status, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ ok: false, error: "Profil nicht gefunden." }, { status: 404 });
  }

  const p = profile as {
    application_status?: string | null;
    membership_tier?: string | null;
    is_paid?: boolean;
    step2_application_status?: string | null;
    full_name?: string | null;
    email?: string | null;
  };

  if (p.application_status !== "approved") {
    return NextResponse.json({ ok: false, error: "Deine Bewerbung wurde noch nicht genehmigt." }, { status: 403 });
  }

  if (p.step2_application_status != null) {
    return NextResponse.json({ ok: false, error: "Du hast bereits eine erweiterte Bewerbung eingereicht." }, { status: 409 });
  }

  let body: { answers?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }

  const answers = body.answers as Record<string, string> | undefined;
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ ok: false, error: "Antworten fehlen." }, { status: 400 });
  }

  for (const q of STEP2_QUESTIONS) {
    const val = typeof answers[q.id] === "string" ? answers[q.id].trim() : "";
    if (q.required && !val) {
      return NextResponse.json(
        { ok: false, error: `Bitte beantworte die Frage: "${q.question}"` },
        { status: 400 },
      );
    }
    if (q.minLength && val.length < q.minLength) {
      return NextResponse.json(
        { ok: false, error: `Mindestens ${q.minLength} Zeichen für: "${q.question}"` },
        { status: 400 },
      );
    }
    if (q.type === "select" && q.options && val && !q.options.includes(val)) {
      return NextResponse.json(
        { ok: false, error: `Ungültige Auswahl für: "${q.question}"` },
        { status: 400 },
      );
    }
  }

  const { error: insertErr } = await service
    .from("step2_applications")
    .insert({
      user_id: user.id,
      answers,
      status: "pending",
    });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json(
        { ok: false, error: "Du hast bereits eine erweiterte Bewerbung eingereicht." },
        { status: 409 },
      );
    }
    console.error("[step2/create] insert failed:", insertErr);
    return NextResponse.json(
      { ok: false, error: "Bewerbung konnte nicht gespeichert werden." },
      { status: 500 },
    );
  }

  const { error: profileErr } = await service
    .from("profiles")
    .update({ step2_application_status: "pending" })
    .eq("id", user.id);

  if (profileErr) {
    console.error("[step2/create] profile sync failed:", profileErr);
  }

  const recipientEmail = (p.email ?? user.email ?? "").trim();
  const fullName = (p.full_name ?? "").trim();
  const firstName = fullName.split(/\s+/)[0] ?? "";

  if (recipientEmail) {
    try {
      const result = await sendStep2Invite({
        email: recipientEmail,
        userId: user.id,
        firstName: firstName || "Bewerber",
        calendlyUrl: null,
      });
      if (!result.skipped) {
        await service
          .from("step2_applications")
          .update({ calendly_email_sent_at: new Date().toISOString() })
          .eq("user_id", user.id);
      }
    } catch (mailErr) {
      console.error("[step2/create] invite email failed:", mailErr);
    }
  }

  return NextResponse.json({ ok: true, redirectTo: "/bewerbung/danke" });
}
