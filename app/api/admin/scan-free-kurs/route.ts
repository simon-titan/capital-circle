import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import {
  runFreeKursScan,
  runAufzeichnungenScan,
  FREE_KURS_ROOT_PREFIX,
  AUFZEICHNUNGEN_ROOT_PREFIX,
} from "@/lib/scan-modules";

type ScanTarget = "free-kurs" | "aufzeichnungen";

export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  let body: { target?: ScanTarget; prefix?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // leerer Body ist OK -> Defaults
  }

  const target: ScanTarget = body.target === "aufzeichnungen" ? "aufzeichnungen" : "free-kurs";
  const prefixOverride = body.prefix?.trim() ? body.prefix.replace(/^\/+/, "") : undefined;

  try {
    if (target === "aufzeichnungen") {
      const result = await runAufzeichnungenScan(supabase, prefixOverride ?? AUFZEICHNUNGEN_ROOT_PREFIX);
      return NextResponse.json({ ok: true, target, ...result });
    }
    const result = await runFreeKursScan(supabase, prefixOverride ?? FREE_KURS_ROOT_PREFIX);
    return NextResponse.json({ ok: true, target, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
