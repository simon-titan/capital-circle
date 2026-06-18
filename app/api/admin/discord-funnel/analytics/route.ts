import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  DISCORD_FUNNEL_QUESTIONS,
  type DiscordFunnelQuestion,
} from "@/config/discord-funnel-questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/discord-funnel/analytics?range=week|month|last_month|custom&from=&to=
 *
 * Liefert alle KPIs, Funnel-Stufen, Content-Insight-Verteilungen und die
 * Closer-Performance für den gewählten Zeitraum als JSON.
 *
 * Zeitraum filtert `discord_leads.created_at` und `discord_page_visits.created_at`.
 */

type RangeId = "week" | "month" | "last_month" | "custom";

interface LeadRow {
  id: string;
  utm_source: string | null;
  answers: Record<string, string> | null;
  questions_completed_at: string | null;
  video_completed_at: string | null;
  qualified: boolean | null;
  no_show: boolean | null;
  closed: string | null;
  revenue_cents: number | null;
  calendly_booked_at: string | null;
  discord_joined_at: string | null;
  created_at: string;
}

/** Berechnet [from, to] ISO-Strings für den gewünschten Range. */
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
    // Beginn der aktuellen ISO-Woche (Montag 00:00).
    const d = new Date(now);
    const day = (d.getDay() + 6) % 7; // Montag = 0
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - day);
    return { from: d.toISOString(), to: null };
  }

  if (range === "month") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { from: d.toISOString(), to: null };
  }

  // last_month: kompletter Vormonat
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return { from: start.toISOString(), to: end.toISOString() };
}

function optionDistribution(
  question: DiscordFunnelQuestion,
  leads: LeadRow[],
  predicate?: (l: LeadRow) => boolean,
): { questionId: string; label: string; options: { option: string; count: number }[] } {
  const counts = new Map<string, number>();
  for (const opt of question.options) counts.set(opt, 0);
  let other = 0;
  for (const lead of leads) {
    if (predicate && !predicate(lead)) continue;
    const val = lead.answers?.[question.id];
    if (!val) continue;
    if (counts.has(val)) counts.set(val, (counts.get(val) ?? 0) + 1);
    else other += 1;
  }
  const options = question.options.map((opt) => ({
    option: opt,
    count: counts.get(opt) ?? 0,
  }));
  if (other > 0) options.push({ option: "Sonstige / unbekannt", count: other });
  return { questionId: question.id, label: question.question, options };
}

export async function GET(request: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const sp = new URL(request.url).searchParams;
  const rangeRaw = (sp.get("range") ?? "month") as RangeId;
  const range: RangeId = (["week", "month", "last_month", "custom"] as const).includes(
    rangeRaw,
  )
    ? rangeRaw
    : "month";
  const { from, to } = resolveRange(range, sp.get("from"), sp.get("to"));

  const service = createServiceClient();

  // ── Traffic (discord_page_visits) — utm_source für Per-Kanal-Aufschlüsselung ──
  let visitsQuery = service.from("discord_page_visits").select("utm_source");
  if (from) visitsQuery = visitsQuery.gte("created_at", from);
  if (to) visitsQuery = visitsQuery.lt("created_at", to);

  // ── Leads (discord_leads) ──────────────────────────────────────────────────
  let leadsQuery = service
    .from("discord_leads")
    .select(
      "id,utm_source,answers,questions_completed_at,video_completed_at,qualified,no_show,closed,revenue_cents,calendly_booked_at,discord_joined_at,created_at",
    );
  if (from) leadsQuery = leadsQuery.gte("created_at", from);
  if (to) leadsQuery = leadsQuery.lt("created_at", to);

  // ── Definierte Kanäle ───────────────────────────────────────────────────────
  const channelsQuery = service
    .from("discord_channels")
    .select("id, label, utm_source, utm_campaign")
    .order("created_at", { ascending: false });

  const [visitsRes, leadsRes, channelsRes] = await Promise.all([
    visitsQuery,
    leadsQuery,
    channelsQuery,
  ]);

  if (visitsRes.error) {
    return NextResponse.json({ ok: false, error: visitsRes.error.message }, { status: 500 });
  }
  if (leadsRes.error) {
    return NextResponse.json({ ok: false, error: leadsRes.error.message }, { status: 500 });
  }

  const visits = (visitsRes.data as { utm_source: string | null }[] | null) ?? [];
  const traffic = visits.length;
  const leads = (leadsRes.data as LeadRow[] | null) ?? [];
  const channels =
    (channelsRes.data as
      | { id: string; label: string; utm_source: string; utm_campaign: string | null }[]
      | null) ?? [];

  // ── Funnel-Stufen 1–9 ──────────────────────────────────────────────────────
  const leadsCount = leads.length;
  const videoCompleted = leads.filter((l) => l.video_completed_at).length;
  const applications = leads.filter((l) => l.questions_completed_at).length;
  const qualifiedCount = leads.filter((l) => l.qualified === true).length;
  const booked = leads.filter((l) => l.calendly_booked_at).length;
  const noShows = leads.filter((l) => l.no_show === true).length;
  const closedWon = leads.filter((l) => l.closed === "closed_won").length;
  const closedLost = leads.filter((l) => l.closed === "closed_lost").length;
  const joined = leads.filter((l) => l.discord_joined_at).length;
  const closingReady = leads.filter(
    (l) => l.discord_joined_at && l.calendly_booked_at && l.closed === "pending",
  ).length;
  const revenueCents = leads.reduce((acc, l) => acc + (l.revenue_cents ?? 0), 0);

  const pct = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);

  const kpis = {
    traffic,
    leads: leadsCount,
    landingCvrPct: pct(leadsCount, traffic),
    videoCompletionRatePct: pct(videoCompleted, leadsCount),
    applicationRatePct: pct(applications, leadsCount),
    bookingRatePct: pct(booked, leadsCount),
    closeRatePct: pct(closedWon, booked),
    revenueCents,
  };

  const funnel = [
    { key: "traffic", label: "Traffic", value: traffic },
    { key: "leads", label: "Leads", value: leadsCount },
    { key: "joined", label: "Discord beigetreten", value: joined },
    { key: "video", label: "Video geschaut", value: videoCompleted },
    { key: "applications", label: "Applications", value: applications },
    { key: "qualified", label: "Qualifiziert", value: qualifiedCount },
    { key: "booked", label: "Calls gebucht", value: booked },
    { key: "no_shows", label: "No-Shows", value: noShows },
    { key: "closings", label: "Closings", value: closedWon },
    { key: "revenue", label: "Revenue", value: revenueCents, isRevenue: true },
  ];

  // ── Content-Insights ────────────────────────────────────────────────────────
  const blocker = DISCORD_FUNNEL_QUESTIONS.find((q) => q.id === "biggest_blocker")!;
  const tried = DISCORD_FUNNEL_QUESTIONS.find((q) => q.id === "tried_before")!;
  const channel = DISCORD_FUNNEL_QUESTIONS.find((q) => q.id === "channel")!;

  const contentInsights = {
    biggestBlocker: optionDistribution(blocker, leads),
    triedBefore: optionDistribution(tried, leads),
    // Bester Kanal: Leads vs. Closes pro Kanal
    channelLeads: optionDistribution(channel, leads),
    channelCloses: optionDistribution(
      channel,
      leads,
      (l) => l.closed === "closed_won",
    ),
  };

  // ── Per-Kanal-Aufschlüsselung (utm_source) ──────────────────────────────────
  // Vereint definierte Kanäle mit tatsächlich beobachteten utm_source-Werten.
  const channelMap = new Map<
    string,
    { utm_source: string; label: string; visits: number; leads: number; joins: number; bookings: number }
  >();
  const ensureChannel = (src: string | null, label?: string) => {
    const key = src && src.trim() ? src : "(direkt / unbekannt)";
    if (!channelMap.has(key)) {
      channelMap.set(key, { utm_source: key, label: label ?? key, visits: 0, leads: 0, joins: 0, bookings: 0 });
    } else if (label) {
      channelMap.get(key)!.label = label;
    }
    return channelMap.get(key)!;
  };
  for (const ch of channels) ensureChannel(ch.utm_source, ch.label);
  for (const v of visits) ensureChannel(v.utm_source).visits += 1;
  for (const l of leads) {
    const c = ensureChannel(l.utm_source);
    c.leads += 1;
    if (l.discord_joined_at) c.joins += 1;
    if (l.calendly_booked_at) c.bookings += 1;
  }
  const perChannel = Array.from(channelMap.values()).sort((a, b) => b.visits - a.visits);

  // ── Closer-Performance ──────────────────────────────────────────────────────
  const showUps = booked - noShows;
  const closerPerformance = {
    calls: booked,
    showUps,
    showUpRatePct: pct(showUps, booked),
    closeRatePct: pct(closedWon, booked),
    closedWon,
    closedLost,
    revenueCents,
  };

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    range: { id: range, from, to },
    kpis,
    funnel,
    contentInsights,
    closerPerformance,
    perChannel,
    joined,
    closingReady,
  });
}
