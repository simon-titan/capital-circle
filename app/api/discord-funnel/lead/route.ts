import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAppUrl } from "@/lib/email/resend";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/discord-funnel/lead
 * Legt einen standalone Discord-Funnel-Lead an (kein Auth-Account).
 * Öffentlich zugänglich — Auth ist bewusst nicht erforderlich.
 *
 * Body: { name, email, phone, session_id?, utm_source?, utm_medium?, utm_campaign?, utm_content?, utm_term?, referrer? }
 *
 * Idempotenz: existiert bereits ein Lead mit gleicher email + session_id,
 * wird dessen bestehender Token zurückgegeben (kein Duplikat, kein erneuter Invite).
 *
 * Response: { ok: true, token } | { ok: false, error } (400 bei Validierungsfehler)
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const {
    name,
    email,
    phone,
    session_id,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    referrer,
  } = body as Record<string, unknown>;

  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const nameVal = str(name);
  const emailVal = str(email);
  const phoneVal = str(phone);

  if (!nameVal) {
    return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
  }
  if (!emailVal || !EMAIL_RE.test(emailVal)) {
    return NextResponse.json({ ok: false, error: "valid email required" }, { status: 400 });
  }
  if (!phoneVal) {
    return NextResponse.json({ ok: false, error: "phone required" }, { status: 400 });
  }

  const service = createServiceClient();
  const sessionId = str(session_id);

  // Idempotenz: gleicher Lead (email + session_id) → bestehenden Token zurückgeben.
  if (sessionId) {
    const { data: existing } = await service
      .from("discord_leads")
      .select("token")
      .eq("email", emailVal)
      .eq("session_id", sessionId)
      .maybeSingle();

    if (existing && typeof existing.token === "string") {
      return NextResponse.json({ ok: true, token: existing.token });
    }
  }

  const token = crypto.randomUUID();
  const ipAddress = request.headers.get("x-forwarded-for");
  const userAgent = request.headers.get("user-agent");

  const { error: insertError } = await service.from("discord_leads").insert({
    token,
    name: nameVal,
    email: emailVal,
    phone: phoneVal,
    session_id: sessionId,
    utm_source: str(utm_source),
    utm_medium: str(utm_medium),
    utm_campaign: str(utm_campaign),
    utm_content: str(utm_content),
    utm_term: str(utm_term),
    referrer: str(referrer),
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  // Discord-Beitritt per Mail anstoßen.
  //
  // Der „Discord beitreten"-Link zeigt auf den Funnel-OAuth-Flow
  // (`/api/discord-funnel/join`), NICHT auf einen rohen discord.gg-Invite.
  // Erst dadurch lässt sich beim Beitritt die feste Funnel-Rolle zuweisen und
  // der Join exakt pro Lead tracken (siehe discord-callback-Route).
  // Der Mailversand ist von keiner Discord-Invite-Config mehr abhängig.
  try {
    const firstName = nameVal.split(/\s+/)[0] ?? nameVal;
    const joinUrl = `${getAppUrl()}/api/discord-funnel/join?lid=${encodeURIComponent(token)}`;

    await service
      .from("discord_leads")
      .update({ discord_invite_url: joinUrl })
      .eq("token", token);

    const { sendDiscordInvite } = await import("@/lib/email/templates/discord-invite");
    await sendDiscordInvite({ email: emailVal, firstName, inviteUrl: joinUrl });

    await service
      .from("discord_leads")
      .update({ discord_invite_sent_at: new Date().toISOString() })
      .eq("token", token);
  } catch (e) {
    console.error("[discord-funnel/lead] invite/email skipped", e);
  }

  return NextResponse.json({ ok: true, token });
}
