import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * GET /api/admin/tracking
 * Gibt alle Tracking-Links inkl. aggregierter Visit- und Application-Counts zurück.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const service = createServiceClient();

  const { data: links, error: linksErr } = await service
    .from("insight_tracking_links")
    .select("id, label, slug, created_at")
    .order("created_at", { ascending: false });

  if (linksErr) {
    return NextResponse.json({ ok: false, error: linksErr.message }, { status: 500 });
  }

  if (!links || links.length === 0) {
    return NextResponse.json({ ok: true, items: [] });
  }

  // Counts für alle Links in einer Query
  const { data: events, error: eventsErr } = await service
    .from("insight_tracking_events")
    .select("link_slug, event_type")
    .in(
      "link_slug",
      links.map((l) => l.slug),
    );

  if (eventsErr) {
    return NextResponse.json({ ok: false, error: eventsErr.message }, { status: 500 });
  }

  // Aggregieren
  const counts: Record<string, { visits: number; applications: number }> = {};
  for (const link of links) {
    counts[link.slug] = { visits: 0, applications: 0 };
  }
  for (const ev of events ?? []) {
    if (!counts[ev.link_slug]) continue;
    if (ev.event_type === "visit") counts[ev.link_slug].visits += 1;
    if (ev.event_type === "application") counts[ev.link_slug].applications += 1;
  }

  const items = links.map((link) => ({
    ...link,
    visits: counts[link.slug]?.visits ?? 0,
    applications: counts[link.slug]?.applications ?? 0,
  }));

  return NextResponse.json({ ok: true, items });
}

/**
 * POST /api/admin/tracking
 * Erstellt einen neuen Tracking-Link.
 * Body: { label: string; slug: string }
 */
export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as Record<string, unknown>;
  const { label, slug } = body;

  if (typeof label !== "string" || !label.trim()) {
    return NextResponse.json({ ok: false, error: "label ist erforderlich" }, { status: 400 });
  }
  if (typeof slug !== "string" || !slug.trim()) {
    return NextResponse.json({ ok: false, error: "slug ist erforderlich" }, { status: 400 });
  }

  // Slug normalisieren: nur Kleinbuchstaben, Zahlen, Bindestriche
  const normalizedSlug = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!normalizedSlug) {
    return NextResponse.json({ ok: false, error: "Ungültiger Slug" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error: dbErr } = await service
    .from("insight_tracking_links")
    .insert({ label: label.trim(), slug: normalizedSlug })
    .select()
    .single();

  if (dbErr) {
    if (dbErr.code === "23505") {
      return NextResponse.json(
        { ok: false, error: "Dieser Slug ist bereits vergeben." },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: { ...data, visits: 0, applications: 0 } });
}

/**
 * DELETE /api/admin/tracking?slug=...
 * Löscht einen Tracking-Link und alle zugehörigen Events (CASCADE).
 */
export async function DELETE(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ ok: false, error: "slug ist erforderlich" }, { status: 400 });
  }

  const service = createServiceClient();
  const { error: dbErr } = await service
    .from("insight_tracking_links")
    .delete()
    .eq("slug", slug);

  if (dbErr) {
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
