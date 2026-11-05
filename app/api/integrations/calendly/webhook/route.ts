import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { benachrichtigeTeamTraining } from "@/lib/email/templates/training-team";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const SIGNING_KEY = process.env.CALENDLY_WEBHOOK_SIGNING_KEY ?? "";

/**
 * POST /api/integrations/calendly/webhook
 *
 * Empfängt Calendly-Events (invitee.created / invitee.canceled).
 * Verknüpft die Buchung via utm_content (= user_id) mit step2_applications.
 *
 * Signatur-Format: Header `Calendly-Webhook-Signature`
 *   t=<timestamp>,v1=<hmac-sha256-hex>
 * Payload = t + "." + rawBody
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  if (SIGNING_KEY) {
    const sigHeader = request.headers.get("Calendly-Webhook-Signature") ?? "";
    if (!verifySignature(sigHeader, rawBody)) {
      console.warn("[calendly/webhook] invalid signature");
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  let payload: CalendlyPayload;
  try {
    payload = JSON.parse(rawBody) as CalendlyPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const event = payload.event;

  if (event === "invitee.created") {
    await handleInviteeCreated(payload);
  }

  return NextResponse.json({ ok: true });
}

async function handleInviteeCreated(payload: CalendlyPayload) {
  const p = payload.payload;
  if (!p) return;

  // Discord-Funnel-Branch: standalone Leads (kein Auth-Account). `utm_content`
  // ist hier der `discord_leads.token`, `utm_medium === "discord"` markiert die
  // Herkunft. Wir aktualisieren NUR die discord_leads-Row und kehren danach
  // zurück — step2_applications/profiles bleiben unberührt.
  if (p.tracking?.utm_medium?.trim().toLowerCase() === "discord") {
    await handleDiscordBooking(p);
    return;
  }

  // Free-Training-Branch: Analysegespräch aus dem Mitgliederbereich
  // (`components/platform/training/AnalyseGespraech.tsx`). `utm_content` ist
  // der `training_leads.token`; nur das eigene CRM-Board wird angefasst.
  if (p.tracking?.utm_medium?.trim().toLowerCase() === "training") {
    await handleTrainingBooking(p);
    return;
  }

  const userId = p.tracking?.utm_content?.trim() || null;
  const inviteeEmail = p.email?.trim().toLowerCase() || null;
  const eventUri = p.event ?? null;
  const inviteeUri = p.uri ?? null;
  const scheduledAt = p.scheduled_event?.start_time ?? null;

  const service = createServiceClient();

  let targetUserId = userId;

  // Fallback: User-ID ueber auth.users E-Mail aufloesen (profiles hat keine email-Spalte)
  if (!targetUserId && inviteeEmail) {
    const { data: authData } = await service.auth.admin.listUsers({ perPage: 1 });
    const matchedUser = authData?.users?.find(
      (u) => u.email?.toLowerCase() === inviteeEmail,
    );
    targetUserId = matchedUser?.id ?? null;
  }

  if (!targetUserId) {
    console.warn("[calendly/webhook] could not resolve user_id", {
      utm_content: userId,
      email: inviteeEmail,
    });
    return;
  }

  const now = new Date().toISOString();

  const { error } = await service
    .from("step2_applications")
    .update({
      calendly_event_uri: eventUri,
      calendly_invitee_uri: inviteeUri,
      calendly_booked_at: scheduledAt ?? now,
      status: "approved",
      reviewed_at: now,
    })
    .eq("user_id", targetUserId);

  if (error) {
    console.error("[calendly/webhook] update failed:", error);
  }

  const { error: profileErr } = await service
    .from("profiles")
    .update({ step2_application_status: "approved" })
    .eq("id", targetUserId);

  if (profileErr) {
    console.error("[calendly/webhook] profile approve failed:", profileErr);
  }
}

/**
 * Discord-Funnel-Buchung: verknüpft die Calendly-Buchung mit dem standalone
 * Lead in `discord_leads` (Lookup via token == utm_content).
 */
async function handleDiscordBooking(p: NonNullable<CalendlyPayload["payload"]>) {
  const token = p.tracking?.utm_content?.trim() || null;
  const inviteeEmail = p.email?.trim().toLowerCase() || null;

  const eventUri = p.event ?? null;
  const inviteeUri = p.uri ?? null;
  const scheduledAt = p.scheduled_event?.start_time ?? null;
  const now = new Date().toISOString();

  const service = createServiceClient();

  // 1) Lead per Token (utm_content) auflösen.
  let leadId: string | null = null;
  let existingEmail: string | null = null;
  if (token) {
    const { data } = await service
      .from("discord_leads")
      .select("id, email")
      .eq("token", token)
      .maybeSingle();
    if (data) {
      leadId = data.id as string;
      existingEmail = (data.email as string | null) ?? null;
    }
  }

  // 2) Fallback: Lead per Invitee-E-Mail (z. B. Buchung über internen Discord-Link ohne Token).
  if (!leadId && inviteeEmail) {
    const { data } = await service
      .from("discord_leads")
      .select("id, email")
      .ilike("email", inviteeEmail)
      .maybeSingle();
    if (data) {
      leadId = data.id as string;
      existingEmail = (data.email as string | null) ?? null;
    }
  }

  if (!leadId) {
    console.warn("[calendly/webhook] discord booking: kein passender Lead", {
      token,
      email: inviteeEmail,
    });
    return;
  }

  const update: Record<string, unknown> = {
    calendly_event_uri: eventUri,
    calendly_invitee_uri: inviteeUri,
    calendly_booked_at: scheduledAt ?? now,
  };
  // E-Mail nachtragen, falls der Lead (z. B. via Identify angelegt) noch keine hatte.
  if (inviteeEmail && (!existingEmail || !existingEmail.trim())) {
    update.email = inviteeEmail;
  }

  const { error } = await service.from("discord_leads").update(update).eq("id", leadId);
  if (error) {
    console.error("[calendly/webhook] discord_leads update failed:", error);
  }
}

async function handleTrainingBooking(p: NonNullable<CalendlyPayload["payload"]>) {
  const token = p.tracking?.utm_content?.trim() || null;
  const inviteeEmail = p.email?.trim().toLowerCase() || null;
  const service = createServiceClient();

  type Lead = {
    id: string;
    status: string;
    name: string;
    email: string;
    phone: string | null;
    stelle: string;
    kanal: string | null;
    videos_gesehen: number;
    termin_am: string | null;
  };
  const SPALTEN = "id, status, name, email, phone, stelle, kanal, videos_gesehen, termin_am";
  let lead = null as Lead | null;
  if (token) {
    const { data } = await service.from("training_leads").select(SPALTEN).eq("token", token).maybeSingle();
    lead = (data as Lead | null) ?? null;
  }
  // Rückfall: jüngster Lead mit der Adresse (Buchung über einen Link ohne Token).
  if (!lead && inviteeEmail) {
    const { data } = await service
      .from("training_leads")
      .select(SPALTEN)
      .ilike("email", inviteeEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    lead = (data as Lead | null) ?? null;
  }
  if (!lead) {
    console.warn("[calendly/webhook] training booking: kein passender Lead", { token, email: inviteeEmail });
    return;
  }

  const update: Record<string, unknown> = {
    calendly_event_uri: p.event ?? null,
    calendly_invitee_uri: p.uri ?? null,
    termin_am: p.scheduled_event?.start_time ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // Ein schon entschiedener Lead (gewonnen/verloren) behält seinen Status.
  if (["neu", "nachfassen", "no_show"].includes(lead.status)) update.status = "termin";

  const { error } = await service.from("training_leads").update(update).eq("id", lead.id);
  if (error) console.error("[calendly/webhook] training_leads update failed:", error);

  // Calendly wiederholt Webhooks — nur beim ersten bzw. einem geänderten Termin melden.
  if (lead.termin_am !== update.termin_am) {
    await benachrichtigeTeamTraining("termin", {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      stelle: lead.stelle,
      kanal: lead.kanal,
      videosGesehen: lead.videos_gesehen,
      terminAm: update.termin_am as string,
    });
  }
}

function verifySignature(header: string, body: string): boolean {
  const parts = header.split(",");
  const tPart = parts.find((p) => p.startsWith("t="));
  const v1Part = parts.find((p) => p.startsWith("v1="));

  if (!tPart || !v1Part) return false;

  const timestamp = tPart.slice(2);
  const signature = v1Part.slice(3);

  const data = `${timestamp}.${body}`;
  const expected = createHmac("sha256", SIGNING_KEY).update(data, "utf8").digest("hex");

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

interface CalendlyPayload {
  event: string;
  payload?: {
    uri?: string;
    email?: string;
    event?: string;
    tracking?: {
      utm_source?: string;
      utm_medium?: string;
      utm_content?: string;
      utm_term?: string;
      utm_campaign?: string;
    };
    scheduled_event?: {
      uri?: string;
      start_time?: string;
      end_time?: string;
    };
  };
}
