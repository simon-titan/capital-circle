"use client";

import { Stack } from "@chakra-ui/react";
import { useFunnel } from "@/components/admin/discord-funnel/DiscordFunnelShell";
import { KpiSection } from "@/components/admin/discord-funnel/KpiSection";
import { FunnelSection } from "@/components/admin/discord-funnel/FunnelSection";
import { SourceOriginSegment } from "@/components/admin/discord-funnel/SourceOriginSegment";

/** Übersicht: High-Level-KPIs, Funnel-Stufen und Herkunfts-Segment. */
export default function DiscordFunnelOverviewPage() {
  const { analytics } = useFunnel();
  if (!analytics) return null;

  return (
    <Stack spacing={10}>
      <KpiSection kpis={analytics.kpis} joined={analytics.joined} closingReady={analytics.closingReady} />
      <FunnelSection funnel={analytics.funnel} funnelByOrigin={analytics.funnelByOrigin} />
      <SourceOriginSegment funnelByOrigin={analytics.funnelByOrigin} perChannel={analytics.perChannel} />
    </Stack>
  );
}
