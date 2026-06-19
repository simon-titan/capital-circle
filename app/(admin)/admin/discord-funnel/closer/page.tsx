"use client";

import { Stack } from "@chakra-ui/react";
import { useFunnel } from "@/components/admin/discord-funnel/DiscordFunnelShell";
import { PerCloserSection } from "@/components/admin/discord-funnel/PerCloserSection";

/** Closer: Kevin vs. Simon — Calls, Show-up, Close-Rate, Revenue, Deal-Mix. */
export default function DiscordFunnelCloserPage() {
  const { analytics } = useFunnel();
  if (!analytics) return null;

  return (
    <Stack spacing={10}>
      <PerCloserSection perCloser={analytics.perCloser} />
    </Stack>
  );
}
