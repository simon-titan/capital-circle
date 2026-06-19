import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { SOURCE_ORIGINS, CLOSERS } from "@/lib/discord-funnel/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/discord-funnel/leads?search=&status=&range=&from=&to=
 *
 * Liefert die Lead-Zeilen für die Tabelle.
 *  - `search` filtert (case-insensitive) auf name ODER email.
 *  - `status` optionaler Filter: qualified | open | calls | won | lost.
 *  - `range`/`from`/`to` filtern auf created_at (gleiche Logik wie analytics).
 */

type RangeId = "today" | "week" | "month" | "last_month" | "custom";

function resolveRange(
  range: RangeId,
  fromParam: string | null,
  toParam: string | null,
): { from: string | null; to: string | null } {
  const now = new Date();
  if (range === "custom") {
    return {
      from: fromParam ? new Date(fromParam).toISOString() : null,
      to: toParam ? new Date(toParam).toISOString() : null,
    };
  }
  if (range === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return { from: d.toISOString(), to: null };
  }
  if (range === "week") {
    const d = new Date(now);
    const day = (d.getDay() + 6) % 7;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    return { from: d.toISOString(), to: null };
  }
  if (range === "month") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { from: d.toISOString(), to: null };
  }
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return { from: start.toISOString(), to: end.toISOString() };
}

export async function GET(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const sp = new URL(request.url).searchParams;
  const search = (sp.get("search") ?? "").trim();
  const status = sp.get("status");
  const rangeRaw = sp.get("range");
  const sourceOriginRaw = sp.get("source_origin");
  const closerRaw = sp.get("closer");

  const service = createServiceClient();

  let query = service
    .from("discord_leads")
    .select(
      "id,token,name,email,phone,utm_source,utm_medium,utm_campaign,referrer,source_origin,discord_invite_sent_at,discord_joined_at,discord_user_id,discord_username,answers,questions_completed_at,video_watch_seconds,video_max_percent,video_completed_at,video_view_count,video_last_watched_at,calendly_booked_at,calendly_event_uri,qualified,no_show,closed,closer,close_type,membership_installments,closed_at,product,revenue_cents,internal_notes,created_at,updated_at",
    )
    .order("created_at", { ascending: false });

  // Zeitfilter (optional)
  if (rangeRaw) {
    const range: RangeId = (["today", "week", "month", "last_month", "custom"] as const).includes(
      rangeRaw as RangeId,
    )
      ? (rangeRaw as RangeId)
      : "month";
    const { from, to } = resolveRange(range, sp.get("from"), sp.get("to"));
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lt("created_at", to);
  }

  // Herkunfts-Filter (source_origin)
  if (sourceOriginRaw && (SOURCE_ORIGINS as readonly string[]).includes(sourceOriginRaw)) {
    query = query.eq("source_origin", sourceOriginRaw);
  }

  // Closer-Filter
  if (closerRaw && (CLOSERS as readonly string[]).includes(closerRaw)) {
    query = query.eq("closer", closerRaw);
  }

  // Status-Filter
  if (status === "qualified") query = query.eq("qualified", true);
  else if (status === "open") query = query.is("qualified", null);
  else if (status === "calls") query = query.not("calendly_booked_at", "is", null);
  else if (status === "won") query = query.eq("closed", "closed_won");
  else if (status === "lost") query = query.eq("closed", "closed_lost");
  // Closing-ready: Discord beigetreten + Termin gebucht + noch offen.
  else if (status === "closing") {
    query = query
      .not("discord_joined_at", "is", null)
      .not("calendly_booked_at", "is", null)
      .eq("closed", "pending");
  }

  // Suche (name oder email)
  if (search) {
    const safe = search.replace(/[%,]/g, " ");
    query = query.or(`name.ilike.%${safe}%,email.ilike.%${safe}%`);
  }

  const { data, error } = await query.limit(1000);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}
