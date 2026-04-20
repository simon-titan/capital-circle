import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { handleStripeEvent } from "@/lib/stripe/webhooks/handler";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * PFLICHT: nodejs-Runtime — wir brauchen den unveränderten Raw-Body für die
 * Signatur-Verifikation. Edge-Runtime würde ihn evtl. parsen / re-encoden.
 *
 * `force-dynamic` verhindert, dass Vercel die Route cached oder pre-rendert.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { ok: false, error: "missing_signature" },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { ok: false, error: "STRIPE_WEBHOOK_SECRET missing" },
      { status: 500 },
    );
  }

  // RAW Body — niemals .json() davor aufrufen, sonst bricht die Signatur.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "verify_failed";
    return NextResponse.json(
      { ok: false, error: "invalid_signature", detail: msg },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // Idempotenz-Check: Wir lesen vor dem Insert. Der UNIQUE-PK auf der
  // `id`-Spalte (Stripe-Event-ID) macht den finalen Insert race-safe.
  const { data: existing } = await supabase
    .from("stripe_webhook_events")
    .select("id,processed_at")
    .eq("id", event.id)
    .maybeSingle();

  const existingRow = existing as
    | { id: string; processed_at: string | null }
    | null;
  if (existingRow?.processed_at) {
    return NextResponse.json({ ok: true, status: "already_processed" });
  }

  if (!existingRow) {
    const { error: insertError } = await supabase
      .from("stripe_webhook_events")
      .insert({
        id: event.id,
        type: event.type,
        payload: event as unknown as Record<string, unknown>,
      });

    // 23505 = unique_violation → anderer Webhook-Worker hat parallel
    // eingefügt. Das ist okay, wir gehen trotzdem in den Handler — aber nur
    // wenn `processed_at` noch leer ist (re-fetch wäre paranoid; der Handler
    // selbst muss idempotent sein, was er über Upsert/Email-Log auch ist).
    if (insertError && insertError.code !== "23505") {
      return NextResponse.json(
        {
          ok: false,
          error: "webhook_log_insert_failed",
          detail: insertError.message,
        },
        { status: 500 },
      );
    }
  }

  try {
    await handleStripeEvent(event, supabase);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase
      .from("stripe_webhook_events")
      .update({ error: msg })
      .eq("id", event.id);

    console.error(
      `[stripe-webhook] handler failed (event=${event.id}, type=${event.type}):`,
      err,
    );

    // 500 → Stripe retried automatisch (exponentielles Backoff bis 3 Tage).
    return NextResponse.json(
      { ok: false, error: "handler_failed", detail: msg },
      { status: 500 },
    );
  }

  await supabase
    .from("stripe_webhook_events")
    .update({
      processed_at: new Date().toISOString(),
      error: null,
    })
    .eq("id", event.id);

  return NextResponse.json({ ok: true, type: event.type });
}
