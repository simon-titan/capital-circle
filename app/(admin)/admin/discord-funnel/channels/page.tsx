"use client";

import { Stack } from "@chakra-ui/react";
import { useFunnel } from "@/components/admin/discord-funnel/DiscordFunnelShell";
import { ChannelsSection } from "@/components/admin/discord-funnel/ChannelsSection";

/** Kanäle: Tracking-Link-Manager + Visits/Leads/Joins/Bookings je utm_source. */
export default function DiscordFunnelChannelsPage() {
  const { analytics } = useFunnel();
  if (!analytics) return null;

  return (
    <Stack spacing={10}>
      <ChannelsSection channels={analytics.perChannel} />
    </Stack>
  );
}
