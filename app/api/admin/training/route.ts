import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { ladeTrainingBoard } from "@/lib/training/board";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/training — Registrierungen und Analysegespräche des Free Trainings. */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    return NextResponse.json({ ok: true, ...(await ladeTrainingBoard(createServiceClient())) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
