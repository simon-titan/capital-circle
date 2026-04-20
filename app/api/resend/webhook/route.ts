import { NextResponse, type NextRequest } from "next/server";
import { Webhook, type WebhookRequiredHeaders } from "svix";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Resend-Webhook (Svix-signiert).
 *
 * Setup:
 *   1. Resend-Dashboard → Webhooks → Endpoint hinzufügen:
 *      `https://<domain>/api/resend/webhook`
 *   2. Events aktivieren: `email.opened`, `email.clicked`
 *      (zusätzlich optional: `email.delivered`, `email.bounced`)
 *   3. Signing-Secret kopieren → ENV `RESEND_WEBHOOK_SECRET`
 *
 * Wichtig: Raw-Body wird zur Signaturprüfung benötigt → `runtime = "nodejs"`,
 * `request.text()` vor jeglichem JSON-Parsing aufrufen.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ResendEmailEvent {
  type:
    | "email.sent"
    | "email.delivered"
    | "email.opened"
    | "email.clicked"
    | "email.bounced"
    | "email.complained"
    | "email.delivery_delayed"
    | string;
  created_at: string;
  data: {
    email_id?: string;
    /** Resend nutzt teils `email_id`, teils `id` — beide abgreifen. */
    id?: string;
    to?: string | string[];
    from?: string;
    subject?: string;
    [key: string]: unknown;
  };
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "RESEND_WEBHOOK_SECRET missing" },
      { status: 500 },
    );
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { ok: false, error: "missing_svix_headers" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();

  const headers: WebhookRequiredHeaders = {
    "svix-id": svixId,
    "svix-timestamp": svixTimestamp,
    "svix-signature": svixSignature,
  };

  let event: ResendEmailEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(rawBody, headers) as ResendEmailEvent;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "verify_failed";
    return NextResponse.json(
      { ok: false, error: "invalid_signature", detail: msg },
      { status: 400 },
    );
  }

  const messageId = event.data.email_id ?? event.data.id;
  if (!messageId) {
    // Kein Message-ID-Feld → still OK quittieren, sonst retried Resend ewig.
    return NextResponse.json({ ok: true, skipped: "no_message_id" });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  try {
    if (event.type === "email.opened") {
      await supabase
        .from("email_sequence_log")
        .update({ opened_at: now })
        .eq("resend_message_id", messageId)
        .is("opened_at", null);
    } else if (event.type === "email.clicked") {
      await supabase
        .from("email_sequence_log")
        .update({ clicked_at: now })
        .eq("resend_message_id", messageId)
        .is("clicked_at", null);
    }
    // Andere Events (delivered, bounced, complained) werden aktuell nicht
    // separat persistiert — einfach 200 OK quittieren.
  } catch (err) {
    console.error("[resend/webhook] DB-Update fehlgeschlagen:", err);
    return NextResponse.json(
      { ok: false, error: "db_update_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
