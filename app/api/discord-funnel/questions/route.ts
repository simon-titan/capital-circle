import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DISCORD_QUESTION_IDS } from "@/config/discord-funnel-questions";

export const runtime = "nodejs";

/**
 * POST /api/discord-funnel/questions
 * Speichert die Antworten der 6 Single-Select-Fragen eines Discord-Funnel-Leads.
 * Öffentlich zugänglich — Auth ist bewusst nicht erforderlich.
 *
 * Body: { token, answers } — answers ist ein Objekt mit allen 6 Fragen-ids als Keys
 * (siehe DISCORD_QUESTION_IDS).
 *
 * Response: { ok: true } | { ok: false, error } (400 bei Validierungsfehler)
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { token, answers } = body as Record<string, unknown>;

  if (typeof token !== "string" || !token.trim()) {
    return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
  }

  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) {
    return NextResponse.json({ ok: false, error: "answers must be an object" }, { status: 400 });
  }

  const answersObj = answers as Record<string, unknown>;
  const missing = DISCORD_QUESTION_IDS.filter(
    (id) => answersObj[id] === undefined || answersObj[id] === null || answersObj[id] === "",
  );
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: `missing answers: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  const { data: lead } = await service
    .from("discord_leads")
    .select("id")
    .eq("token", token.trim())
    .maybeSingle();

  if (!lead) {
    return NextResponse.json({ ok: false, error: "unknown token" }, { status: 400 });
  }

  const { error: updateError } = await service
    .from("discord_leads")
    .update({
      answers: answersObj,
      questions_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("token", token.trim());

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
