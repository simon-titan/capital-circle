import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { runModuleScan } from "@/lib/scan-modules";

export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as { prefix?: string };
  const prefix = (body.prefix?.trim() || "modules").replace(/^\/+/, "");

  try {
    const result = await runModuleScan(supabase, prefix);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
