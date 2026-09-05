import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type PatchBody = { status?: unknown; isPublic?: unknown };

/**
 * PATCH /api/admin/certificates/[id] { status?, isPublic? }
 * status="approved" setzt zugleich is_public=true, status="rejected" setzt is_public=false
 * (kann per isPublic danach noch einzeln umgeschaltet werden).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.status === "string") {
    if (!["pending", "approved", "rejected"].includes(body.status)) {
      return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
    }
    updates.status = body.status;
    updates.reviewed_at = new Date().toISOString();
    updates.reviewed_by = user?.id ?? null;
    if (body.status === "approved") {
      updates.is_public = true;
    } else if (body.status === "rejected") {
      updates.is_public = false;
    }
  }

  if (typeof body.isPublic === "boolean") {
    updates.is_public = body.isPublic;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "no_fields" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("certificates")
    .update(updates)
    .eq("id", id)
    .select("id, user_id, storage_key, caption, status, is_public, submitted_at, reviewed_at, reviewed_by")
    .single();

  if (dbErr) {
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}
