"use client";

import { Stack } from "@chakra-ui/react";
import { useFunnel } from "@/components/admin/discord-funnel/DiscordFunnelShell";
import { VideoEngagementPanel } from "@/components/admin/discord-funnel/VideoEngagementPanel";
import { TimeOnDiscordPanel } from "@/components/admin/discord-funnel/TimeOnDiscordPanel";
import { ContentInsightsSection } from "@/components/admin/discord-funnel/ContentInsightsSection";

/** Video & Traffic: Video-Engagement/Rewatch, Time-on-Discord, Content-Insights. */
export default function DiscordFunnelEngagementPage() {
  const { analytics } = useFunnel();
  if (!analytics) return null;

  return (
    <Stack spacing={10}>
      <VideoEngagementPanel
        engagement={analytics.videoEngagement}
        topOfFunnel={analytics.topOfFunnelVideo}
      />
      <TimeOnDiscordPanel data={analytics.timeOnDiscord} />
      <ContentInsightsSection insights={analytics.contentInsights} />
    </Stack>
  );
}
