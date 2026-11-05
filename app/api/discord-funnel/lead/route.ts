import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAppUrl } from "@/lib/email/resend";
import { SOURCE_ORIGINS, type SourceOrigin } from "@/lib/discord-funnel/types";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Verknüpft alle losen (lead_id IS NULL) discord_video_views der Session mit dem
 * frisch angelegten/aufgelösten Lead und schreibt das Aggregat auf den Lead, damit
 * /termin- & /video-Watches VOR der Lead-Anlage rückwirkend am Lead landen.
 */
async function linkSessionViewsToLead(
  service: ReturnType<typeof createServiceClient>,
  params: { leadId: string; token: string; sessionId: string | null },
): Promise<void> {
  const { leadId, token, sessionId } = params;

  // 1) Lose Views der Session diesem Lead zuordnen.
  if (sessionId) {
    await service
      .from("discord_video_views")
      .update({ lead_id: leadId, token })
      .eq("session_id", sessionId)
      .is("lead_id", null);
  }

  // 2) Alle nun verknüpften Views (per lead_id ODER token) aggregieren.
  const { data: views } = await service
    .from("discord_video_views")
    .select("watched_seconds, max_percent, completed, updated_at")
    .or(`lead_id.eq.${leadId},token.eq.${token}`);

  if (!views || views.length === 0) return;

  let maxSeconds = 0;
  let maxPercent = 0;
  let anyCompleted = false;
  let lastWatchedAt: string | null = null;

  for (const v of views) {
    const s = typeof v.watched_seconds === "number" ? v.watched_seconds : 0;
    const p = typeof v.max_percent === "number" ? v.max_percent : 0;
    if (s > maxSeconds) maxSeconds = s;
    if (p > maxPercent) maxPercent = p;
    if (v.completed === true) anyCompleted = true;
    const ts = typeof v.updated_at === "string" ? v.updated_at : null;
    if (ts && (!lastWatchedAt || ts > lastWatchedAt)) lastWatchedAt = ts;
  }

  // Bestehende Lead-Werte laden, damit Denormalisierung monoton bleibt.
  const { data: lead } = await service
    .from("discord_leads")
    .select("video_watch_seconds, video_max_percent, video_completed_at")
    .eq("id", leadId)
    .maybeSingle();

  const existingSeconds =
    typeof lead?.video_watch_seconds === "number" ? lead.video_watch_seconds : 0;
  const existingPercent =
    typeof lead?.video_max_percent === "number" ? lead.video_max_percent : 0;
  const existingCompletedAt =
    typeof lead?.video_completed_at === "string" ? lead.video_completed_at : null;

  const leadUpdate: Record<string, unknown> = {
    video_view_count: views.length,
    video_watch_seconds: Math.max(existingSeconds, maxSeconds),
    video_max_percent: Math.max(existingPercent, maxPercent),
    updated_at: new Date().toISOString(),
  };
  if (lastWatchedAt) leadUpdate.video_last_watched_at = lastWatchedAt;
  if (anyCompleted && !existingCompletedAt) {
    leadUpdate.video_completed_at = new Date().toISOString();
  }

  await service.from("discord_leads").update(leadUpdate).eq("id", leadId);
}

/**
 * POST /api/discord-funnel/lead
 * Legt einen standalone Discord-Funnel-Lead an (kein Auth-Account).
 * Öffentlich zugänglich — Auth ist bewusst nicht erforderlich.
 *
 * Body: { name, email, phone, session_id?, utm_source?, utm_medium?, utm_campaign?, utm_content?, utm_term?, referrer?, skip_invite? }
 *
 * skip_invite=true: kein Discord-Invite-Versand (z. B. /termin — Cold-Traffic ohne
 * Discord-Bezug). Der Lead wird nur erfasst und bucht direkt einen Calendly-Termin.
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
    skip_invite,
    source_origin,
  } = body as Record<string, unknown>;

  const skipInvite = skip_invite === true;

  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const utmSourceVal = str(utm_source);

  // Herkunft: explizit übergebener (validierter) Wert hat Vorrang, sonst Fallback
  // utm_source === 'termin-direkt' → 'termin_direct', sonst 'discord_funnel'.
  const sourceOrigin: SourceOrigin = SOURCE_ORIGINS.includes(source_origin as SourceOrigin)
    ? (source_origin as SourceOrigin)
    : utmSourceVal === "termin-direkt"
      ? "termin_direct"
      : "discord_funnel";

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
      .select("id, token")
      .eq("email", emailVal)
      .eq("session_id", sessionId)
      .maybeSingle();

    if (existing && typeof existing.token === "string" && typeof existing.id === "string") {
      // Auch im Idempotenz-Pfad: lose Session-Views rückwirkend verknüpfen.
      await linkSessionViewsToLead(service, {
        leadId: existing.id,
        token: existing.token,
        sessionId,
      });
      return NextResponse.json({ ok: true, token: existing.token });
    }
  }

  const token = crypto.randomUUID();
  const ipAddress = request.headers.get("x-forwarded-for");
  const userAgent = request.headers.get("user-agent");

  const { data: inserted, error: insertError } = await service
    .from("discord_leads")
    .insert({
      token,
      name: nameVal,
      email: emailVal,
      phone: phoneVal,
      session_id: sessionId,
      utm_source: utmSourceVal,
      utm_medium: str(utm_medium),
      utm_campaign: str(utm_campaign),
      utm_content: str(utm_content),
      utm_term: str(utm_term),
      referrer: str(referrer),
      source_origin: sourceOrigin,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  // Lose Session-Views (/termin, /video) rückwirkend an den neuen Lead hängen.
  if (inserted && typeof inserted.id === "string") {
    await linkSessionViewsToLead(service, {
      leadId: inserted.id,
      token,
      sessionId,
    });
  }

  // Discord-Beitritt per Mail anstoßen.
  //
  // Der „Discord beitreten"-Link zeigt auf den Funnel-OAuth-Flow
  // (`/api/discord-funnel/join`), NICHT auf einen rohen discord.gg-Invite.
  // Erst dadurch lässt sich beim Beitritt die feste Funnel-Rolle zuweisen und
  // der Join exakt pro Lead tracken (siehe discord-callback-Route).
  // Der Mailversand ist von keiner Discord-Invite-Config mehr abhängig.
  //
  // skip_invite=true (z. B. /termin) überspringt diesen Block komplett.
  if (!skipInvite) {
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
  }

  return NextResponse.json({ ok: true, token });
}
