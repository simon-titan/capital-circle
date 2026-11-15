import { NextResponse } from "next/server";
import { nachtrag } from "@/lib/finanzen/backfill";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/admin/auswertung/backfill — Nachtrag der Bestandsdaten ins Ledger
 * (`lib/finanzen/backfill.ts`): Credit, Zahlungen, Live-Abos, Erstattungen,
 * Chargebacks. Idempotent; nur lesende Stripe-Aufrufe.
 */
export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const ergebnis = await nachtrag(createServiceClient());
    return NextResponse.json({ ok: true, ergebnis });
  } catch (err) {
    console.error("[admin/auswertung/backfill]", err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
