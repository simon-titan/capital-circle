"use client";

import { Alert, AlertIcon, Button, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type AnalyticsResponse,
  type ExportType,
  type FunnelFilterState,
  type LeadPatchBody,
  type LeadRow,
} from "./discord-funnel/types";
import { FilterBar } from "./discord-funnel/FilterBar";
import { KpiSection } from "./discord-funnel/KpiSection";
import { FunnelSection } from "./discord-funnel/FunnelSection";
import { SourceOriginSegment } from "./discord-funnel/SourceOriginSegment";
import { PerCloserSection } from "./discord-funnel/PerCloserSection";
import { VideoEngagementPanel } from "./discord-funnel/VideoEngagementPanel";
import { TimeOnDiscordPanel } from "./discord-funnel/TimeOnDiscordPanel";
import { ContentInsightsSection } from "./discord-funnel/ContentInsightsSection";
import { ChannelsSection } from "./discord-funnel/ChannelsSection";
import { LeadsSection } from "./discord-funnel/LeadsSection";

const INITIAL_FILTER: FunnelFilterState = {
  range: "month",
  from: "",
  to: "",
  sourceOrigin: "all",
  closer: "all",
  channel: "all",
  status: "all",
};

/** Baut die gemeinsamen Query-Params (Range + Segment-Filter) für API-Calls. */
function buildBaseParams(filter: FunnelFilterState): URLSearchParams {
  const params = new URLSearchParams({ range: filter.range });
  if (filter.range === "custom") {
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to);
  }
  if (filter.sourceOrigin !== "all") params.set("source_origin", filter.sourceOrigin);
  if (filter.closer !== "all") params.set("closer", filter.closer);
  if (filter.channel !== "all") params.set("utm_source", filter.channel);
  return params;
}

export function DiscordFunnelDashboard() {
  const [filter, setFilterState] = useState<FunnelFilterState>(INITIAL_FILTER);
  const [search, setSearch] = useState("");

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Aktuelle Such-Eingabe ohne load-Identität zu invalidieren (Enter/Refresh committed).
  const searchRef = useRef(search);
  searchRef.current = search;

  const setFilter = useCallback((patch: Partial<FunnelFilterState>) => {
    setFilterState((prev) => ({ ...prev, ...patch }));
  }, []);

  // Filter-Felder, die einen Auto-Reload auslösen (Custom-Datum erst per Apply).
  const reloadKey = useMemo(
    () =>
      JSON.stringify({
        range: filter.range,
        sourceOrigin: filter.sourceOrigin,
        closer: filter.closer,
        channel: filter.channel,
        status: filter.status,
        // Custom-Range nur reloaden, wenn beide Felder gesetzt sind.
        from: filter.range === "custom" ? filter.from : "",
        to: filter.range === "custom" ? filter.to : "",
      }),
    [filter],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const baseParams = buildBaseParams(filter);

      const leadParams = new URLSearchParams(baseParams);
      if (filter.status && filter.status !== "all") leadParams.set("status", filter.status);
      const searchValue = searchRef.current.trim();
      if (searchValue) leadParams.set("search", searchValue);

      const [aRes, lRes] = await Promise.all([
        fetch(`/api/admin/discord-funnel/analytics?${baseParams.toString()}`, { cache: "no-store" }),
        fetch(`/api/admin/discord-funnel/leads?${leadParams.toString()}`, { cache: "no-store" }),
      ]);

      const aJson = (await aRes.json()) as AnalyticsResponse | { ok: false; error: string };
      const lJson = (await lRes.json()) as
        | { ok: true; items: LeadRow[] }
        | { ok: false; error: string };

      if (!aRes.ok || !("ok" in aJson) || !aJson.ok) {
        setError((aJson as { error?: string }).error ?? "Analytics konnten nicht geladen werden.");
        return;
      }
      if (!lRes.ok || !lJson.ok) {
        setError((lJson as { error?: string }).error ?? "Leads konnten nicht geladen werden.");
        return;
      }
      setAnalytics(aJson);
      setLeads(lJson.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Reload bei Filter-Änderung (außer reiner Sucheingabe).
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  function exportCsv(type: ExportType) {
    const params = buildBaseParams(filter);
    params.set("type", type);
    if (type === "leads") {
      if (filter.status && filter.status !== "all") params.set("status", filter.status);
      const searchValue = searchRef.current.trim();
      if (searchValue) params.set("search", searchValue);
    }
    window.open(`/api/admin/discord-funnel/export?${params.toString()}`, "_blank");
  }

  const patchLead = useCallback(
    async (id: string, body: LeadPatchBody) => {
      // optimistisches Update
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...(body as Partial<LeadRow>) } : l)));
      const res = await fetch(`/api/admin/discord-funnel/leads/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? "Speichern fehlgeschlagen.");
        void load();
      }
    },
    [load],
  );

  // Kanal-Liste (utm_source) für den Filter aus perChannel ableiten.
  const channelSlugs = useMemo(() => {
    const set = new Set<string>();
    for (const c of analytics?.perChannel ?? []) set.add(c.utm_source);
    return [...set].sort();
  }, [analytics]);

  if (loading && !analytics) {
    return (
      <HStack py={20} justify="center">
        <Spinner color="var(--color-accent-gold)" />
      </HStack>
    );
  }

  return (
    <Stack spacing={8}>
      <FilterBar
        filter={filter}
        setFilter={setFilter}
        channels={channelSlugs}
        loading={loading}
        onApply={() => void load()}
      />

      {error ? (
        <Alert status="error" variant="subtle" bg="rgba(229,72,77,0.10)" borderRadius="12px">
          <AlertIcon />
          <Stack spacing={1}>
            <Text fontSize="sm" className="inter">
              {error}
            </Text>
            <Button size="xs" variant="ghost" onClick={() => void load()}>
              Erneut versuchen
            </Button>
          </Stack>
        </Alert>
      ) : null}

      {analytics ? (
        <>
          <KpiSection
            kpis={analytics.kpis}
            joined={analytics.joined}
            closingReady={analytics.closingReady}
          />
          <FunnelSection funnel={analytics.funnel} funnelByOrigin={analytics.funnelByOrigin} />
          <SourceOriginSegment
            funnelByOrigin={analytics.funnelByOrigin}
            perChannel={analytics.perChannel}
          />
          <PerCloserSection perCloser={analytics.perCloser} />
          <VideoEngagementPanel
            engagement={analytics.videoEngagement}
            topOfFunnel={analytics.topOfFunnelVideo}
          />
          <TimeOnDiscordPanel data={analytics.timeOnDiscord} />
          <ChannelsSection channels={analytics.perChannel} />
          <ContentInsightsSection insights={analytics.contentInsights} />
        </>
      ) : null}

      <LeadsSection
        leads={leads}
        search={search}
        setSearch={setSearch}
        onSearchSubmit={() => void load()}
        onPatch={patchLead}
        onExport={exportCsv}
      />
    </Stack>
  );
}
