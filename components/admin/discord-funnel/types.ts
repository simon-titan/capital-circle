/**
 * UI-Typvertrag für das Discord-Funnel-Dashboard.
 *
 * Re-export der zentralen Analytics-/Lead-Typen aus `@/lib/discord-funnel/types`
 * (Single Source of Truth zur Analytics-API) + UI-lokale Hilfstypen (Filter-State,
 * Channel-CRUD-Row, Lead-API-Response).
 */

export {
  CLOSERS,
  CLOSER_LABELS,
  CLOSE_TYPES,
  MEMBERSHIP_INSTALLMENTS,
  SOURCE_ORIGINS,
  SOURCE_ORIGIN_LABELS,
  CLOSED_VALUES,
} from "@/lib/discord-funnel/types";

export type {
  AnalyticsResponse,
  AnalyticsKpis,
  FunnelStage,
  FunnelByOrigin,
  OptionDistribution,
  ContentInsights,
  PerChannelRow,
  CloserPerformance,
  PerCloserStats,
  TimeOnDiscord,
  VideoEngagement,
  VideoSource,
  TopOfFunnelVideo,
  LeadRow,
  LeadPatchBody,
  CloserId,
  CloseType,
  MembershipInstallments,
  SourceOrigin,
  ClosedValue,
  RangeId,
} from "@/lib/discord-funnel/types";

import type { RangeId, SourceOrigin, CloserId } from "@/lib/discord-funnel/types";

/* ── UI-lokale Hilfstypen ───────────────────────────────────────────────────── */

/** Ein verwalteter Kanal (Channel-CRUD gegen /api/admin/discord-funnel/channels). */
export interface ChannelRow {
  id: string;
  label: string;
  utm_source: string;
  utm_campaign: string | null;
  created_at: string;
}

/** Filter-State des Dashboards (Datum + Segment-Filter). */
export interface FunnelFilterState {
  range: RangeId;
  from: string;
  to: string;
  sourceOrigin: SourceOrigin | "all";
  closer: CloserId | "all";
  /** utm_source-Slug oder "all". */
  channel: string;
  /** Lead-Status-Filter-Slug (all|open|qualified|calls|closing|won|lost). */
  status: string;
}

/** Aggregat-Export-Typen (GET /api/admin/discord-funnel/export?type=…). */
export type ExportType = "leads" | "per_closer" | "per_channel" | "funnel_summary";
