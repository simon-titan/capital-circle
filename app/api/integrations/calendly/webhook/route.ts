import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
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

  const userId = p.tracking?.utm_content?.trim() || null;
  const inviteeEmail = p.email?.trim().toLowerCase() || null;
  const eventUri = p.event ?? null;
  const inviteeUri = p.uri ?? null;
  const scheduledAt = p.scheduled_event?.start_time ?? null;

  const service = createServiceClient();

  let targetUserId = userId;

  if (!targetUserId && inviteeEmail) {
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("email", inviteeEmail)
      .maybeSingle();
    targetUserId = (profile?.id as string) ?? null;
  }

  if (!targetUserId) {
    console.warn("[calendly/webhook] could not resolve user_id", {
      utm_content: userId,
      email: inviteeEmail,
    });
    return;
  }

  const { error } = await service
    .from("step2_applications")
    .update({
      calendly_event_uri: eventUri,
      calendly_invitee_uri: inviteeUri,
      calendly_booked_at: scheduledAt ?? new Date().toISOString(),
    })
    .eq("user_id", targetUserId);

  if (error) {
    console.error("[calendly/webhook] update failed:", error);
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
