import { NextResponse, type NextRequest } from "next/server";
import { ladeKassenUebersicht } from "@/lib/mentoring/admin";
import { legeKassenlinkAn, type KassenlinkAnlage } from "@/lib/mentoring/kassenlink-anlage";
import { getAppUrl } from "@/lib/site-url";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * GET /api/admin/kassenlinks
 * Alle Kassenlinks (neueste zuerst) und die Mentoring-Käufe mit Ratenstand.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const uebersicht = await ladeKassenUebersicht(createServiceClient(), getAppUrl());
    return NextResponse.json({ ok: true, ...uebersicht });
  } catch (err) {
    console.error("[admin/kassenlinks] Übersicht nicht ladbar:", err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

/**
 * POST /api/admin/kassenlinks
 * Legt einen Kassenlink an (`legeKassenlinkAn`, dieselbe Regel wie im CRM).
 * Der Preis kommt fest aus `config/mentoring.ts` — es gibt absichtlich kein
 * Betragsfeld. Ein Rabatt wäre eine Entscheidung, die jemand treffen und
 * dokumentieren muss, kein Tippfeld im Closing-Call.
 */
export async function POST(request: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json().catch(() => null)) as KassenlinkAnlage | null;
  if (!body) return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  const r = await legeKassenlinkAn(createServiceClient(), body, user?.id ?? null, getAppUrl());
  return r.ok ? NextResponse.json({ ok: true, item: r.item }) : NextResponse.json({ ok: false, error: r.fehler }, { status: r.status });
}
