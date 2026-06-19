/**
 * Discord-Funnel Analytics — geteilte, reine Aggregations-Helper.
 *
 * Diese Funktionen sind datenbankfrei: sie nehmen rohe Lead-Rows, Visit-Rows und
 * Video-View-Rows entgegen und berechnen die Analytics-Teilobjekte gemäß dem
 * gemeinsamen Typvertrag in `types.ts`. Dadurch sind sie sowohl vom Analytics-
 * Endpoint als auch vom Export-Endpoint nutzbar (keine doppelte Logik).
 */

import {
  CLOSERS,
  CLOSE_TYPES,
  MEMBERSHIP_INSTALLMENTS,
  SOURCE_ORIGINS,
  VIDEO_SOURCES,
  type CloserId,
  type SourceOrigin,
  type VideoSource,
  type AnalyticsKpis,
  type FunnelStage,
  type FunnelByOrigin,
  type PerChannelRow,
  type PerCloserStats,
  type TimeOnDiscord,
  type VideoEngagement,
  type TopOfFunnelVideo,
} from "./types";

/* ── Eingangs-Row-Typen (nur die hier benötigten Felder) ─────────────────────── */

/** Minimal-Shape einer Lead-Zeile, wie sie die Aggregation benötigt. */
export interface AggLeadRow {
  utm_source: string | null;
  source_origin: SourceOrigin | null;
  answers: Record<string, string> | null;
  questions_completed_at: string | null;
  video_completed_at: string | null;
  video_view_count: number | null;
  qualified: boolean | null;
  no_show: boolean | null;
  closed: string | null;
  closer: CloserId | null;
  close_type: string | null;
  membership_installments: number | null;
  closed_at: string | null;
  revenue_cents: number | null;
  calendly_booked_at: string | null;
  discord_joined_at: string | null;
}

export interface AggVisitRow {
  utm_source: string | null;
}

export interface AggVideoViewRow {
  source: VideoSource | string | null;
  completed: boolean | null;
  session_id: string | null;
  lead_id: string | null;
}

export interface AggChannelRow {
  utm_source: string;
  label: string;
}

/* ── Helper ──────────────────────────────────────────────────────────────────── */

export const pct = (num: number, den: number): number => (den > 0 ? (num / den) * 100 : 0);

const isClosedWon = (l: AggLeadRow) => l.closed === "closed_won";
const isClosedLost = (l: AggLeadRow) => l.closed === "closed_lost";

/* ── KPIs ─────────────────────────────────────────────────────────────────────── */

export function computeKpis(leads: AggLeadRow[], traffic: number): AnalyticsKpis {
  const leadsCount = leads.length;
  const videoCompleted = leads.filter((l) => l.video_completed_at).length;
  const applications = leads.filter((l) => l.questions_completed_at).length;
  const booked = leads.filter((l) => l.calendly_booked_at).length;
  const closedWon = leads.filter(isClosedWon).length;
  const revenueCents = leads.reduce((acc, l) => acc + (l.revenue_cents ?? 0), 0);

  return {
    traffic,
    leads: leadsCount,
    landingCvrPct: pct(leadsCount, traffic),
    videoCompletionRatePct: pct(videoCompleted, leadsCount),
    applicationRatePct: pct(applications, leadsCount),
    bookingRatePct: pct(booked, leadsCount),
    closeRatePct: pct(closedWon, booked),
    revenueCents,
  };
}

/* ── Funnel ───────────────────────────────────────────────────────────────────── */

export function computeFunnel(leads: AggLeadRow[], traffic: number): FunnelStage[] {
  const leadsCount = leads.length;
  const joined = leads.filter((l) => l.discord_joined_at).length;
  const videoCompleted = leads.filter((l) => l.video_completed_at).length;
  const applications = leads.filter((l) => l.questions_completed_at).length;
  const qualifiedCount = leads.filter((l) => l.qualified === true).length;
  const booked = leads.filter((l) => l.calendly_booked_at).length;
  const noShows = leads.filter((l) => l.no_show === true).length;
  const closedWon = leads.filter(isClosedWon).length;
  const revenueCents = leads.reduce((acc, l) => acc + (l.revenue_cents ?? 0), 0);

  return [
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
}

/**
 * Funnel je source_origin. Traffic ist auf Lead-Ebene nicht herkunftsaufgelöst,
 * daher wird Traffic je Origin mit 0 angesetzt (Visits tragen keine Herkunft).
 */
export function computeFunnelByOrigin(leads: AggLeadRow[]): FunnelByOrigin {
  const byOrigin = (origin: SourceOrigin): FunnelStage[] => {
    const subset = leads.filter((l) => l.source_origin === origin);
    // Traffic je Herkunft ist nicht aus Visits ableitbar → 0.
    return computeFunnel(subset, 0);
  };
  return {
    discord_funnel: byOrigin("discord_funnel"),
    termin_direct: byOrigin("termin_direct"),
  };
}

/* ── Per-Closer ───────────────────────────────────────────────────────────────── */

const DAY_MS = 1000 * 60 * 60 * 24;

export function computePerCloser(leads: AggLeadRow[]): PerCloserStats[] {
  return CLOSERS.map((closer): PerCloserStats => {
    const mine = leads.filter((l) => l.closer === closer);
    const booked = mine.filter((l) => l.calendly_booked_at).length;
    const noShows = mine.filter((l) => l.no_show === true).length;
    const showUps = booked - noShows;
    const won = mine.filter(isClosedWon);
    const closedWon = won.length;
    const closedLost = mine.filter(isClosedLost).length;
    const revenueCents = mine.reduce((acc, l) => acc + (l.revenue_cents ?? 0), 0);

    const closeTypeSplit = { one_to_one: 0, membership: 0 };
    const installmentSplit: { "1": number; "2": number; "4": number } = {
      "1": 0,
      "2": 0,
      "4": 0,
    };
    for (const l of won) {
      if (l.close_type === "one_to_one") closeTypeSplit.one_to_one += 1;
      else if (l.close_type === "membership") {
        closeTypeSplit.membership += 1;
        const inst = l.membership_installments;
        if (inst === 1 || inst === 2 || inst === 4) {
          installmentSplit[String(inst) as "1" | "2" | "4"] += 1;
        }
      }
    }

    // timeToCloseAvgDays: avg(closed_at - calendly_booked_at) über closed_won mit beiden Daten
    const closeDurations: number[] = [];
    for (const l of won) {
      if (l.closed_at && l.calendly_booked_at) {
        const diff = new Date(l.closed_at).getTime() - new Date(l.calendly_booked_at).getTime();
        if (Number.isFinite(diff)) closeDurations.push(diff / DAY_MS);
      }
    }
    const timeToCloseAvgDays =
      closeDurations.length > 0
        ? closeDurations.reduce((a, b) => a + b, 0) / closeDurations.length
        : null;

    return {
      closer,
      calls: booked,
      showUps,
      showUpRatePct: pct(showUps, booked),
      closeRatePct: pct(closedWon, booked),
      closedWon,
      closedLost,
      revenueCents,
      avgDealSizeCents: closedWon > 0 ? Math.round(revenueCents / closedWon) : 0,
      closeTypeSplit,
      installmentSplit,
      timeToCloseAvgDays,
    };
  });
}

/* ── Time on Discord ──────────────────────────────────────────────────────────── */

const TIME_BUCKETS = ["<1h", "1-24h", "1-3d", "3-7d", ">7d"] as const;

function timeBucket(hours: number): (typeof TIME_BUCKETS)[number] {
  if (hours < 1) return "<1h";
  if (hours < 24) return "1-24h";
  if (hours < 72) return "1-3d";
  if (hours < 168) return "3-7d";
  return ">7d";
}

/** avgHours + Verteilung aus discord_joined_at → calendly_booked_at. */
export function computeTimeOnDiscord(leads: AggLeadRow[]): TimeOnDiscord {
  const counts = new Map<string, number>();
  for (const b of TIME_BUCKETS) counts.set(b, 0);

  const durationsHours: number[] = [];
  for (const l of leads) {
    if (!l.discord_joined_at || !l.calendly_booked_at) continue;
    const diff = new Date(l.calendly_booked_at).getTime() - new Date(l.discord_joined_at).getTime();
    if (!Number.isFinite(diff) || diff < 0) continue;
    const hours = diff / (1000 * 60 * 60);
    durationsHours.push(hours);
    const b = timeBucket(hours);
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }

  const avgHours =
    durationsHours.length > 0
      ? durationsHours.reduce((a, b) => a + b, 0) / durationsHours.length
      : null;

  return {
    avgHours,
    distribution: TIME_BUCKETS.map((bucket) => ({ bucket, count: counts.get(bucket) ?? 0 })),
  };
}

/* ── Video Engagement ─────────────────────────────────────────────────────────── */

export function computeVideoEngagement(
  videoViews: AggVideoViewRow[],
  leads: AggLeadRow[],
): VideoEngagement {
  const totalViews = videoViews.length;
  const sessionIds = new Set<string>();
  for (const v of videoViews) {
    if (v.session_id) sessionIds.add(v.session_id);
  }
  const uniqueSessions = sessionIds.size;
  const completed = videoViews.filter((v) => v.completed === true).length;

  const bySource = VIDEO_SOURCES.map((source) => {
    const subset = videoViews.filter((v) => (v.source ?? "unknown") === source);
    return {
      source,
      views: subset.length,
      completed: subset.filter((v) => v.completed === true).length,
    };
  });

  // avgViewsPerLead über Leads mit video_view_count > 0
  const viewedLeads = leads.filter((l) => (l.video_view_count ?? 0) > 0);
  const avgViewsPerLead =
    viewedLeads.length > 0
      ? viewedLeads.reduce((acc, l) => acc + (l.video_view_count ?? 0), 0) / viewedLeads.length
      : 0;

  // rewatchRatePct = % Leads (mit Views) mit video_view_count > 1
  const rewatched = viewedLeads.filter((l) => (l.video_view_count ?? 0) > 1).length;
  const rewatchRatePct = pct(rewatched, viewedLeads.length);

  return {
    totalViews,
    uniqueSessions,
    avgViewsPerLead,
    rewatchRatePct,
    completionRatePct: pct(completed, totalViews),
    bySource,
  };
}

/* ── Top of Funnel (anonyme /video-Seite) ─────────────────────────────────────── */

/**
 * Top-of-Funnel Video.
 *  - visits: discord_page_visits mit utm_source='video'
 *  - views/completed: discord_video_views mit source='video_only'
 */
export function computeTopOfFunnelVideo(
  visits: AggVisitRow[],
  videoViews: AggVideoViewRow[],
): TopOfFunnelVideo {
  const visitCount = visits.filter((v) => v.utm_source === "video").length;
  const videoOnly = videoViews.filter((v) => (v.source ?? "unknown") === "video_only");
  return {
    visits: visitCount,
    views: videoOnly.length,
    completed: videoOnly.filter((v) => v.completed === true).length,
  };
}

/* ── Per-Channel ──────────────────────────────────────────────────────────────── */

/**
 * Per-Kanal-Aufschlüsselung (utm_source). Vereint definierte Kanäle mit tatsächlich
 * beobachteten utm_source-Werten. Optional mit closedWon/revenueCents/source_origin.
 */
export function computePerChannel(
  leads: AggLeadRow[],
  visits: AggVisitRow[],
  channels: AggChannelRow[],
): PerChannelRow[] {
  const map = new Map<
    string,
    {
      utm_source: string;
      label: string;
      source_origin: SourceOrigin | null;
      visits: number;
      leads: number;
      joins: number;
      bookings: number;
      closedWon: number;
      revenueCents: number;
    }
  >();

  const ensure = (src: string | null, label?: string) => {
    const key = src && src.trim() ? src : "(direkt / unbekannt)";
    if (!map.has(key)) {
      map.set(key, {
        utm_source: key,
        label: label ?? key,
        source_origin: null,
        visits: 0,
        leads: 0,
        joins: 0,
        bookings: 0,
        closedWon: 0,
        revenueCents: 0,
      });
    } else if (label) {
      map.get(key)!.label = label;
    }
    return map.get(key)!;
  };

  for (const ch of channels) ensure(ch.utm_source, ch.label);
  for (const v of visits) ensure(v.utm_source).visits += 1;
  for (const l of leads) {
    const c = ensure(l.utm_source);
    c.leads += 1;
    if (l.discord_joined_at) c.joins += 1;
    if (l.calendly_booked_at) c.bookings += 1;
    if (isClosedWon(l)) {
      c.closedWon += 1;
      c.revenueCents += l.revenue_cents ?? 0;
    }
    // Herkunft des Kanals: erste beobachtete source_origin gewinnt.
    if (c.source_origin === null && l.source_origin) c.source_origin = l.source_origin;
  }

  return Array.from(map.values())
    .map((c) => ({
      utm_source: c.utm_source,
      label: c.label,
      source_origin: c.source_origin,
      visits: c.visits,
      leads: c.leads,
      joins: c.joins,
      bookings: c.bookings,
      closedWon: c.closedWon,
      revenueCents: c.revenueCents,
    }))
    .sort((a, b) => b.visits - a.visits);
}

/* ── Re-Exports der Konstanten (für Konsumenten bequem) ───────────────────────── */

export {
  CLOSERS,
  CLOSE_TYPES,
  MEMBERSHIP_INSTALLMENTS,
  SOURCE_ORIGINS,
};
