import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { DISCORD_QUESTION_IDS } from "@/config/discord-funnel-questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/discord-funnel/export?scope=all|qualified|calls&range=&from=&to=
 *
 * Liefert text/csv mit einer Zeile pro Lead, ALLE Spalten — die 6 answers werden
 * in eigene Spalten (answer_<id>) entpackt. CSV-Felder werden RFC-4180-konform
 * escaped (doppelte Anführungszeichen, Quoting bei Komma/Quote/Newline).
 */

type RangeId = "week" | "month" | "last_month" | "custom";

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

/** RFC-4180-konformes Escaping eines einzelnen Feldes. */
function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Reihenfolge der "festen" Spalten (answers werden danach eingefügt).
const BASE_COLUMNS = [
  "id",
  "token",
  "name",
  "email",
  "phone",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "referrer",
  "session_id",
  "ip_address",
  "user_agent",
  "discord_invite_code",
  "discord_invite_url",
  "discord_invite_sent_at",
  "discord_joined_at",
  "discord_user_id",
  "discord_username",
  "questions_completed_at",
  "video_watch_seconds",
  "video_max_percent",
  "video_completed_at",
  "calendly_event_uri",
  "calendly_invitee_uri",
  "calendly_booked_at",
  "qualified",
  "no_show",
  "closed",
  "product",
  "revenue_cents",
  "internal_notes",
  "created_at",
  "updated_at",
] as const;

export async function GET(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const sp = new URL(request.url).searchParams;
  const scope = sp.get("scope") ?? "all";
  const rangeRaw = sp.get("range");

  const service = createServiceClient();

  // Alle benötigten Spalten + answers
  let query = service
    .from("discord_leads")
    .select(`${BASE_COLUMNS.join(",")},answers`)
    .order("created_at", { ascending: false });

  if (rangeRaw) {
    const range: RangeId = (["week", "month", "last_month", "custom"] as const).includes(
      rangeRaw as RangeId,
    )
      ? (rangeRaw as RangeId)
      : "month";
    const { from, to } = resolveRange(range, sp.get("from"), sp.get("to"));
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lt("created_at", to);
  }

  if (scope === "qualified") query = query.eq("qualified", true);
  else if (scope === "calls") query = query.not("calendly_booked_at", "is", null);

  const { data, error } = await query.limit(100000);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = ((data as unknown) as Record<string, unknown>[] | null) ?? [];
  const answerCols = DISCORD_QUESTION_IDS.map((qid) => `answer_${qid}`);
  const header = [...BASE_COLUMNS, ...answerCols];

  const lines: string[] = [header.map(csvField).join(",")];
  for (const row of rows) {
    const answers = (row.answers as Record<string, string> | null) ?? {};
    const cells: string[] = [];
    for (const col of BASE_COLUMNS) cells.push(csvField(row[col]));
    for (const qid of DISCORD_QUESTION_IDS) cells.push(csvField(answers[qid] ?? ""));
    lines.push(cells.join(","));
  }

  // BOM für Excel-kompatible Umlaute
  const csv = "﻿" + lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  const filename = `capitalcircle_leads_${date}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
