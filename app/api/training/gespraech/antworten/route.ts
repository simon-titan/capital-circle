import { NextResponse } from "next/server";
import { DISCORD_FUNNEL_QUESTIONS } from "@/config/discord-funnel-questions";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * POST /api/training/gespraech/antworten — Antworten des Fragebogens.
 * Body: `{ token, answers }`. Dieselben Fragen wie auf `/call`
 * (`config/discord-funnel-questions.ts`), geprüft gegen deren Optionen.
 * Nur das Konto, dem der Lead gehört, darf ihn ändern.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { token?: unknown; answers?: unknown };
  const token = typeof body.token === "string" ? body.token : "";
  const roh = (body.answers && typeof body.answers === "object" ? body.answers : {}) as Record<string, unknown>;

  const answers: Record<string, string> = {};
  for (const q of DISCORD_FUNNEL_QUESTIONS) {
    const a = roh[q.id];
    if (typeof a !== "string" || !q.options.includes(a)) {
      return NextResponse.json({ ok: false, error: "antworten" }, { status: 400 });
    }
    answers[q.id] = a;
  }

  const { data, error } = await createServiceClient()
    .from("training_leads")
    .update({ answers, updated_at: new Date().toISOString() })
    .eq("token", token)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return NextResponse.json({ ok: false, error: "nicht_gefunden" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
