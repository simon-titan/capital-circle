/**
 * Discord-Funnel Analytics — gemeinsamer Typ-Vertrag.
 *
 * Single Source of Truth für die Tracking-/Analytics-Felder über alle Workstreams:
 * Backend-Tracking (B), Admin-Analytics+Export-APIs (C) und Dashboard-UI (D) importieren
 * ausschließlich von hier, damit die Response-Shapes nicht auseinanderdriften.
 *
 * Werte-Konvention: in DB + API werden Kleinbuchstaben-Slugs gespeichert/übertragen
 * (kevin/simon, one_to_one/membership, discord_funnel/termin_direct). Die UI mappt auf Labels.
 */

/* ── Enums / Slugs ─────────────────────────────────────────────────────────────── */

export const CLOSERS = ["kevin", "simon"] as const;
export type CloserId = (typeof CLOSERS)[number];

export const CLOSE_TYPES = ["one_to_one", "membership"] as const;
export type CloseType = (typeof CLOSE_TYPES)[number];

export const MEMBERSHIP_INSTALLMENTS = [1, 2, 4] as const;
export type MembershipInstallments = (typeof MEMBERSHIP_INSTALLMENTS)[number];

export const SOURCE_ORIGINS = ["discord_funnel", "termin_direct"] as const;
export type SourceOrigin = (typeof SOURCE_ORIGINS)[number];

export const CLOSED_VALUES = ["pending", "closed_won", "closed_lost"] as const;
export type ClosedValue = (typeof CLOSED_VALUES)[number];

/** Quelle eines Video-View-Events. `video_only` = anonyme /video-Seite. */
export const VIDEO_SOURCES = ["discord_funnel", "termin_direct", "video_only", "unknown"] as const;
export type VideoSource = (typeof VIDEO_SOURCES)[number];

export type RangeId = "today" | "week" | "month" | "last_month" | "custom";

/** Anzeige-Labels für die Closer-Slugs (UI). */
export const CLOSER_LABELS: Record<CloserId, string> = {
  kevin: "Kevin",
  simon: "Simon",
};

/** Anzeige-Labels für Herkunft (UI). */
export const SOURCE_ORIGIN_LABELS: Record<SourceOrigin, string> = {
  discord_funnel: "Discord-Funnel",
  termin_direct: "Termin direkt",
};

/* ── DB-Rows ───────────────────────────────────────────────────────────────────── */

/** Eine Zeile aus discord_video_views. */
export interface DiscordVideoViewRow {
  id: string;
  session_id: string | null;
  token: string | null;
  lead_id: string | null;
  source: VideoSource;
  watched_seconds: number;
  max_percent: number;
  completed: boolean;
  session_start: string | null;
  session_end: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Lead-Zeile, wie sie das Admin-`leads`-Endpoint liefert und das Dashboard rendert.
 * Enthält die bestehenden Felder + die in Migration 059 ergänzten Tracking-Spalten.
 */
export interface LeadRow {
  id: string;
  token: string;
  name: string;
  email: string;
  phone: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  source_origin: SourceOrigin | null;
  discord_invite_sent_at: string | null;
  discord_joined_at: string | null;
  discord_user_id: string | null;
  discord_username: string | null;
  answers: Record<string, string> | null;
  questions_completed_at: string | null;
  video_watch_seconds: number | null;
  video_max_percent: number | null;
  video_completed_at: string | null;
  video_view_count: number | null;
  video_last_watched_at: string | null;
  calendly_booked_at: string | null;
  calendly_event_uri: string | null;
  qualified: boolean | null;
  no_show: boolean | null;
  closed: ClosedValue | null;
  closer: CloserId | null;
  close_type: CloseType | null;
  membership_installments: MembershipInstallments | null;
  closed_at: string | null;
  product: string | null;
  revenue_cents: number | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Editierbare Felder im Lead-Inline-Edit (PATCH-Body). Alle optional. */
export interface LeadPatchBody {
  qualified?: boolean | null;
  no_show?: boolean;
  closed?: ClosedValue;
  closer?: CloserId | null;
  close_type?: CloseType | null;
  membership_installments?: MembershipInstallments | null;
  closed_at?: string | null;
  product?: string | null;
  revenue_cents?: number | null;
  internal_notes?: string | null;
}

/* ── Analytics-Response ────────────────────────────────────────────────────────── */

export interface AnalyticsKpis {
  traffic: number;
  leads: number;
  landingCvrPct: number;
  videoCompletionRatePct: number;
  applicationRatePct: number;
  bookingRatePct: number;
  closeRatePct: number;
  revenueCents: number;
}

export interface FunnelStage {
  key: string;
  label: string;
  value: number;
  isRevenue?: boolean;
}

export interface OptionDistribution {
  questionId: string;
  label: string;
  options: { option: string; count: number }[];
}

export interface ContentInsights {
  biggestBlocker: OptionDistribution;
  triedBefore: OptionDistribution;
  channelLeads: OptionDistribution;
  channelCloses: OptionDistribution;
}

export interface PerChannelRow {
  utm_source: string;
  label: string;
  source_origin?: SourceOrigin | null;
  visits: number;
  leads: number;
  joins: number;
  bookings: number;
  closedWon?: number;
  revenueCents?: number;
}

/** Aggregierte Closer-Performance (über alle Closer) — bleibt für Rückwärtskompatibilität. */
export interface CloserPerformance {
  calls: number;
  showUps: number;
  showUpRatePct: number;
  closeRatePct: number;
  closedWon: number;
  closedLost: number;
  revenueCents: number;
}

/** Per-Closer-Auswertung (Kevin & Simon). */
export interface PerCloserStats {
  closer: CloserId;
  calls: number;
  showUps: number;
  showUpRatePct: number;
  closeRatePct: number;
  closedWon: number;
  closedLost: number;
  revenueCents: number;
  avgDealSizeCents: number;
  closeTypeSplit: { one_to_one: number; membership: number };
  installmentSplit: { "1": number; "2": number; "4": number };
  timeToCloseAvgDays: number | null;
}

export interface FunnelByOrigin {
  discord_funnel: FunnelStage[];
  termin_direct: FunnelStage[];
}

export interface TimeOnDiscord {
  avgHours: number | null;
  distribution: { bucket: string; count: number }[];
}

export interface VideoEngagement {
  totalViews: number;
  uniqueSessions: number;
  avgViewsPerLead: number;
  rewatchRatePct: number;
  completionRatePct: number;
  bySource: { source: VideoSource; views: number; completed: number }[];
}

export interface TopOfFunnelVideo {
  visits: number;
  views: number;
  completed: number;
}

export interface AnalyticsResponse {
  ok: true;
  generatedAt: string;
  range: { id: RangeId; from: string | null; to: string | null };
  kpis: AnalyticsKpis;
  funnel: FunnelStage[];
  funnelByOrigin: FunnelByOrigin;
  contentInsights: ContentInsights;
  closerPerformance: CloserPerformance;
  perCloser: PerCloserStats[];
  perChannel: PerChannelRow[];
  timeOnDiscord: TimeOnDiscord;
  videoEngagement: VideoEngagement;
  topOfFunnelVideo: TopOfFunnelVideo;
  joined: number;
  closingReady: number;
}
