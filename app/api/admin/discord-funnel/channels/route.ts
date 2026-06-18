import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * Kanal-Manager für das Channel-Tracking des Discord-Funnels.
 * Kanäle definieren utm_source-Werte; die Counts pro Kanal liefert die
 * analytics-Route aus discord_page_visits + discord_leads.
 */

/** GET /api/admin/discord-funnel/channels — alle Kanäle. */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("discord_channels")
    .select("id, label, utm_source, utm_campaign, created_at")
    .order("created_at", { ascending: false });

  if (dbErr) {
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, items: data ?? [] });
}

/**
 * POST /api/admin/discord-funnel/channels
 * Body: { label: string; utm_source: string; utm_campaign?: string }
 */
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const rawSource = typeof body?.utm_source === "string" ? body.utm_source : "";
  const utmCampaign =
    typeof body?.utm_campaign === "string" && body.utm_campaign.trim()
      ? body.utm_campaign.trim()
      : null;

  if (!label) {
    return NextResponse.json({ ok: false, error: "label ist erforderlich" }, { status: 400 });
  }

  // utm_source normalisieren: Kleinbuchstaben, Zahlen, Bindestriche.
  const utmSource = rawSource
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!utmSource) {
    return NextResponse.json({ ok: false, error: "Ungültige utm_source" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("discord_channels")
    .insert({ label, utm_source: utmSource, utm_campaign: utmCampaign })
    .select()
    .single();

  if (dbErr) {
    if (dbErr.code === "23505") {
      return NextResponse.json(
        { ok: false, error: "Diese utm_source ist bereits vergeben." },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data });
}

/** DELETE /api/admin/discord-funnel/channels?id=... */
export async function DELETE(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "id ist erforderlich" }, { status: 400 });
  }

  const service = createServiceClient();
  const { error: dbErr } = await service.from("discord_channels").delete().eq("id", id);
  if (dbErr) {
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
