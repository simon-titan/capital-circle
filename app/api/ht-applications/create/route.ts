import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSSRClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { sendSlackNotification } from "@/lib/notifications/slack";
import {
  HT_QUESTIONS,
  BUDGET_LABELS,
  isBudgetTier,
} from "@/config/ht-questions";

export const runtime = "nodejs";

/**
 * POST /api/ht-applications/create
 *
 * Body: {
 *   answers: Record<string, string>,   // ID-zu-Antwort-Map (siehe HT_QUESTIONS)
 *   email?:  string,                   // Pflicht, wenn nicht eingeloggt
 *   name?:   string,                   // optional
 *   turnstileToken?: string
 * }
 *
 * Auth: optional. Eingeloggte User werden automatisch verknüpft (`user_id`)
 * und ihre `email`/`full_name` aus dem Profil übernommen.
 *
 * Schreibt:
 *   - INSERT in public.high_ticket_applications
 *   - Bei `over_2000`: Slack-Notification (silent skip ohne SLACK_WEBHOOK_URL)
 *
 * Rate-Limit: max 3 Bewerbungen pro IP / 24 h (in-memory, MVP).
 */

// MVP: in-memory Rate-Limit pro IP. Nicht prozessübergreifend (Vercel-Lambda-
// Instanzen haben jeweils ihren eigenen Map-State) — gut genug zusammen mit
// Turnstile als erster Verteidigungslinie.
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const ipHits = new Map<string, number[]>();

function checkAndRecordIp(ip: string | null): { allowed: boolean; resetIn?: number } {
  if (!ip) return { allowed: true };
  const now = Date.now();
  const recent = (ipHits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    const oldest = recent[0];
    return {
      allowed: false,
      resetIn: oldest !== undefined ? RATE_LIMIT_WINDOW_MS - (now - oldest) : undefined,
    };
  }
  recent.push(now);
  ipHits.set(ip, recent);
  return { allowed: true };
}

function clientIpFrom(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

function emailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  // 1. Body parsen
  let body: {
    answers?: unknown;
    email?: unknown;
    name?: unknown;
    turnstileToken?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ungültige Anfrage." },
      { status: 400 },
    );
  }

  if (!body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) {
    return NextResponse.json(
      { ok: false, error: "Antworten fehlen." },
      { status: 400 },
    );
  }

  const rawAnswers = body.answers as Record<string, unknown>;
  const turnstileToken =
    typeof body.turnstileToken === "string" ? body.turnstileToken : null;

  // 2. Antworten gegen HT_QUESTIONS validieren
  const cleanAnswers: Record<string, string> = {};
  for (const q of HT_QUESTIONS) {
    const raw = rawAnswers[q.id];
    const value = typeof raw === "string" ? raw.trim() : "";

    if (q.type === "select") {
      if (q.required && (!value || !(q.options ?? []).includes(value))) {
        return NextResponse.json(
          { ok: false, error: `Frage „${q.question}" wurde nicht gültig beantwortet.` },
          { status: 400 },
        );
      }
    } else if (q.required) {
      if (!value) {
        return NextResponse.json(
          { ok: false, error: `Frage „${q.question}" ist Pflicht.` },
          { status: 400 },
        );
      }
      if (q.minLength && value.length < q.minLength) {
        return NextResponse.json(
          {
            ok: false,
            error: `Bitte mindestens ${q.minLength} Zeichen zu „${q.question}".`,
          },
          { status: 400 },
        );
      }
    }

    cleanAnswers[q.id] = value;
  }

  const budget = cleanAnswers["budget"];
  if (!isBudgetTier(budget)) {
    return NextResponse.json(
      { ok: false, error: 'Budget muss "under_2000" oder "over_2000" sein.' },
      { status: 400 },
    );
  }

  const whatsappNumber = cleanAnswers["whatsapp_number"] || null;

  // 3. Turnstile verifizieren
  const ip = clientIpFrom(request);
  const turnstile = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstile.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Captcha-Verifikation fehlgeschlagen.",
        details: turnstile.errorCodes,
      },
      { status: 403 },
    );
  }

  // 4. Rate-Limit (IP)
  const rate = checkAndRecordIp(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Zu viele Bewerbungen von dieser IP. Bitte später erneut versuchen.",
      },
      { status: 429 },
    );
  }

  // 5. User-Kontext (optional)
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData.user;

  let email: string | null = null;
  let name: string | null = null;
  let userId: string | null = null;

  if (authUser) {
    userId = authUser.id;
    email = authUser.email ?? null;
    const service0 = createServiceClient();
    const { data: profile } = await service0
      .from("profiles")
      .select("full_name")
      .eq("id", authUser.id)
      .maybeSingle();
    name = (profile?.full_name as string | null) ?? null;
  }

  // Body-Felder können Auth-Daten überschreiben (z. B. abweichende Kontakt-
  // Email für die Bewerbung), bei nicht-eingeloggten Usern sind sie Pflicht.
  if (typeof body.email === "string" && body.email.trim()) {
    email = body.email.trim();
  }
  if (typeof body.name === "string" && body.name.trim()) {
    name = body.name.trim();
  }

  if (!email || !emailValid(email)) {
    return NextResponse.json(
      { ok: false, error: "Bitte gib eine gültige E-Mail-Adresse an." },
      { status: 400 },
    );
  }

  // 6. INSERT high_ticket_applications
  const service = createServiceClient();
  const { data: inserted, error: insertErr } = await service
    .from("high_ticket_applications")
    .insert({
      user_id: userId,
      email,
      name,
      whatsapp_number: whatsappNumber,
      answers: cleanAnswers,
      budget_tier: budget,
    })
    .select("id,budget_tier")
    .single();

  if (insertErr || !inserted) {
    console.error("[ht-applications/create] insert failed:", insertErr);
    return NextResponse.json(
      {
        ok: false,
        error: insertErr?.message ?? "Bewerbung konnte nicht gespeichert werden.",
      },
      { status: 500 },
    );
  }

  // 7. Slack-Notification (nur bei over_2000 — Priority-Lead)
  if (budget === "over_2000") {
    const lines = [
      `🔥 *Neue HT-Bewerbung (${BUDGET_LABELS.over_2000})*`,
      `*Name:* ${name ?? "—"}`,
      `*Email:* ${email}`,
      whatsappNumber ? `*WhatsApp:* ${whatsappNumber}` : null,
      `*Bewerbung:* ${inserted.id as string}`,
    ].filter(Boolean) as string[];

    void sendSlackNotification(lines.join("\n"));
  }

  return NextResponse.json({
    ok: true,
    budget_tier: budget,
    applicationId: inserted.id as string,
  });
}
