import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { DISCORD_QUESTION_IDS } from "@/config/discord-funnel-questions";
import {
  computeFunnelByOrigin,
  computeFunnel,
  computePerCloser,
  computePerChannel,
  type AggLeadRow,
  type AggVisitRow,
  type AggChannelRow,
} from "@/lib/discord-funnel/analytics-aggregate";
import { CLOSER_LABELS } from "@/lib/discord-funnel/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/discord-funnel/export?type=leads|per_closer|per_channel|funnel_summary
 *   &scope=all|qualified|calls&range=&from=&to=
 *
 * type=leads (Default): eine Zeile pro Lead, ALLE Spalten — die 6 answers werden
 * in eigene Spalten (answer_<id>) entpackt.
 * type=per_closer | per_channel | funnel_summary: aggregierte CSVs via die geteilten
 * Analytics-Helper.
 *
 * CSV-Felder werden RFC-4180-konform escaped (doppelte Anführungszeichen, Quoting
 * bei Komma/Quote/Newline), UTF-8 BOM für Excel.
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
  "source_origin",
  "closer",
  "close_type",
  "membership_installments",
  "closed_at",
  "video_view_count",
  "video_last_watched_at",
  "created_at",
  "updated_at",
] as const;

/** Lead-SELECT für die Aggregats-Exporte (per_closer/per_channel/funnel_summary). */
const AGG_LEAD_COLUMNS =
  "utm_source,source_origin,answers,questions_completed_at,video_completed_at,video_view_count,qualified,no_show,closed,closer,close_type,membership_installments,closed_at,revenue_cents,calendly_booked_at,discord_joined_at";

const EXPORT_TYPES = ["leads", "per_closer", "per_channel", "funnel_summary"] as const;
type ExportType = (typeof EXPORT_TYPES)[number];

/** revenue_eur = cents/100, mit zwei Nachkommastellen (Punkt als Dezimaltrenner). */
function eur(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Baut eine CSV-Response (BOM + RFC-4180-Zeilen) mit sprechendem Dateinamen. */
function csvResponse(lines: string[], type: ExportType): NextResponse {
  const csv = "﻿" + lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  const filename = `capitalcircle_${type}_${date}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const sp = new URL(request.url).searchParams;
  const scope = sp.get("scope") ?? "all";
  const rangeRaw = sp.get("range");

  const typeRaw = sp.get("type");
  const type: ExportType = (EXPORT_TYPES as readonly string[]).includes(typeRaw ?? "")
    ? (typeRaw as ExportType)
    : "leads";

  // Zeitfilter (gemeinsam für alle Typen).
  let from: string | null = null;
  let to: string | null = null;
  if (rangeRaw) {
    const range: RangeId = (["today", "week", "month", "last_month", "custom"] as const).includes(
      rangeRaw as RangeId,
    )
      ? (rangeRaw as RangeId)
      : "month";
    ({ from, to } = resolveRange(range, sp.get("from"), sp.get("to")));
  }

  const service = createServiceClient();

  // ── type=leads (Default): eine Zeile pro Lead ────────────────────────────────
  if (type === "leads") {
    let query = service
      .from("discord_leads")
      .select(`${BASE_COLUMNS.join(",")},answers`)
      .order("created_at", { ascending: false });

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lt("created_at", to);

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

    return csvResponse(lines, "leads");
  }

  // ── Aggregats-Exporte: Leads (+ ggf. Visits/Channels) laden ──────────────────
  let leadsQuery = service.from("discord_leads").select(AGG_LEAD_COLUMNS);
  if (from) leadsQuery = leadsQuery.gte("created_at", from);
  if (to) leadsQuery = leadsQuery.lt("created_at", to);

  const needsVisits = type === "per_channel";
  let visitsQuery = service.from("discord_page_visits").select("utm_source");
  if (from) visitsQuery = visitsQuery.gte("created_at", from);
  if (to) visitsQuery = visitsQuery.lt("created_at", to);

  const channelsQuery = service
    .from("discord_channels")
    .select("label, utm_source")
    .order("created_at", { ascending: false });

  const [leadsRes, visitsRes, channelsRes] = await Promise.all([
    leadsQuery.limit(100000),
    needsVisits ? visitsQuery.limit(1000000) : Promise.resolve({ data: [], error: null }),
    needsVisits ? channelsQuery : Promise.resolve({ data: [], error: null }),
  ]);

  if (leadsRes.error) {
    return NextResponse.json({ ok: false, error: leadsRes.error.message }, { status: 500 });
  }
  if (visitsRes.error) {
    return NextResponse.json({ ok: false, error: visitsRes.error.message }, { status: 500 });
  }
  if (channelsRes.error) {
    return NextResponse.json({ ok: false, error: channelsRes.error.message }, { status: 500 });
  }

  const leads = ((leadsRes.data as unknown) as AggLeadRow[] | null) ?? [];
  const visits = ((visitsRes.data as unknown) as AggVisitRow[] | null) ?? [];
  const channels =
    ((channelsRes.data as unknown) as { utm_source: string; label: string }[] | null) ?? [];

  // ── type=per_closer ──────────────────────────────────────────────────────────
  if (type === "per_closer") {
    const header = [
      "closer",
      "calls",
      "show_ups",
      "show_up_rate_pct",
      "close_rate_pct",
      "closed_won",
      "closed_lost",
      "revenue_eur",
      "avg_deal_size_eur",
      "close_type_one_to_one",
      "close_type_membership",
      "installments_1",
      "installments_2",
      "installments_4",
      "time_to_close_avg_days",
    ];
    const lines: string[] = [header.map(csvField).join(",")];
    for (const s of computePerCloser(leads)) {
      lines.push(
        [
          CLOSER_LABELS[s.closer],
          s.calls,
          s.showUps,
          s.showUpRatePct.toFixed(1),
          s.closeRatePct.toFixed(1),
          s.closedWon,
          s.closedLost,
          eur(s.revenueCents),
          eur(s.avgDealSizeCents),
          s.closeTypeSplit.one_to_one,
          s.closeTypeSplit.membership,
          s.installmentSplit["1"],
          s.installmentSplit["2"],
          s.installmentSplit["4"],
          s.timeToCloseAvgDays === null ? "" : s.timeToCloseAvgDays.toFixed(1),
        ]
          .map(csvField)
          .join(","),
      );
    }
    return csvResponse(lines, "per_closer");
  }

  // ── type=per_channel ─────────────────────────────────────────────────────────
  if (type === "per_channel") {
    const header = [
      "utm_source",
      "label",
      "source_origin",
      "visits",
      "leads",
      "joins",
      "bookings",
      "closed_won",
      "revenue_eur",
    ];
    const lines: string[] = [header.map(csvField).join(",")];
    for (const r of computePerChannel(leads, visits, channels as AggChannelRow[])) {
      lines.push(
        [
          r.utm_source,
          r.label,
          r.source_origin ?? "",
          r.visits,
          r.leads,
          r.joins,
          r.bookings,
          r.closedWon ?? 0,
          eur(r.revenueCents ?? 0),
        ]
          .map(csvField)
          .join(","),
      );
    }
    return csvResponse(lines, "per_channel");
  }

  // ── type=funnel_summary ──────────────────────────────────────────────────────
  const overall = computeFunnel(leads, 0);
  const byOrigin = computeFunnelByOrigin(leads);
  const discordMap = new Map(byOrigin.discord_funnel.map((s) => [s.key, s.value]));
  const terminMap = new Map(byOrigin.termin_direct.map((s) => [s.key, s.value]));

  const header = ["stage_key", "stage_label", "total", "discord_funnel", "termin_direct"];
  const lines: string[] = [header.map(csvField).join(",")];
  for (const stage of overall) {
    lines.push(
      [
        stage.key,
        stage.label,
        stage.value,
        discordMap.get(stage.key) ?? 0,
        terminMap.get(stage.key) ?? 0,
      ]
        .map(csvField)
        .join(","),
    );
  }
  return csvResponse(lines, "funnel_summary");
}
