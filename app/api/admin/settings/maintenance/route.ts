import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const SETTINGS_KEY = "maintenance_mode";

type MaintenanceValue = { enabled: boolean; message: string };

function parseValue(raw: unknown): MaintenanceValue {
  const v = (raw ?? {}) as { enabled?: unknown; message?: unknown };
  return {
    enabled: Boolean(v.enabled),
    message: typeof v.message === "string" ? v.message : "",
  };
}

/** GET /api/admin/settings/maintenance */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();

  if (dbErr) {
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    ...parseValue(data?.value),
    updatedAt: (data?.updated_at as string | null) ?? null,
  });
}

/** PUT /api/admin/settings/maintenance { enabled, message? } */
export async function PUT(request: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  let body: { enabled?: unknown; message?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "enabled_must_be_boolean" }, { status: 400 });
  }

  const value: MaintenanceValue = {
    enabled: body.enabled,
    message: typeof body.message === "string" ? body.message.trim().slice(0, 1000) : "",
  };

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("app_settings")
    .update({ value, updated_by: user?.id ?? null })
    .eq("key", SETTINGS_KEY)
    .select("value, updated_at")
    .single();

  if (dbErr) {
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    ...parseValue(data?.value),
    updatedAt: (data?.updated_at as string | null) ?? null,
  });
}
