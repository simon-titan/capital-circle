"use client";

import { Box, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { GitCompareArrows } from "lucide-react";
import {
  SOURCE_ORIGIN_LABELS,
  type FunnelByOrigin,
  type FunnelStage,
  type PerChannelRow,
  type SourceOrigin,
} from "./types";
import { eurFromCents, pctFmt, SectionCard } from "./primitives";

interface OriginMetrics {
  leads: number;
  bookings: number;
  closedWon: number;
  revenueCents: number;
  bookingRatePct: number;
  closeRatePct: number;
}

/** Liest einen Stage-Wert per (Teil-)Key heraus — robust gegen variierende Stage-Keys. */
function stageValue(stages: FunnelStage[], ...keys: string[]): number {
  for (const k of keys) {
    const hit = stages.find((s) => s.key.toLowerCase().includes(k));
    if (hit) return hit.value;
  }
  return 0;
}

function deriveFromFunnel(stages: FunnelStage[]): { leads: number; bookings: number } {
  return {
    leads: stageValue(stages, "lead"),
    bookings: stageValue(stages, "booking", "booked", "call"),
  };
}

function computeMetrics(
  origin: SourceOrigin,
  funnelByOrigin: FunnelByOrigin | undefined,
  perChannel: PerChannelRow[],
): OriginMetrics {
  // Channels dieser Herkunft summieren (closedWon/revenue kommen verlässlich von hier).
  const rows = perChannel.filter((c) => c.source_origin === origin);
  const fromChannels = rows.reduce(
    (acc, c) => ({
      leads: acc.leads + c.leads,
      bookings: acc.bookings + c.bookings,
      closedWon: acc.closedWon + (c.closedWon ?? 0),
      revenueCents: acc.revenueCents + (c.revenueCents ?? 0),
    }),
    { leads: 0, bookings: 0, closedWon: 0, revenueCents: 0 },
  );

  // Funnel-Stufen als Fallback/Primärquelle für leads & bookings.
  const fromFunnel = funnelByOrigin ? deriveFromFunnel(funnelByOrigin[origin] ?? []) : { leads: 0, bookings: 0 };

  const leads = fromFunnel.leads || fromChannels.leads;
  const bookings = fromFunnel.bookings || fromChannels.bookings;

  return {
    leads,
    bookings,
    closedWon: fromChannels.closedWon,
    revenueCents: fromChannels.revenueCents,
    bookingRatePct: leads > 0 ? (bookings / leads) * 100 : 0,
    closeRatePct: bookings > 0 ? (fromChannels.closedWon / bookings) * 100 : 0,
  };
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack justify="space-between" py={1.5} borderBottom="1px solid rgba(255,255,255,0.05)">
      <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
        {label}
      </Text>
      <Text className="inter-semibold" fontSize="sm" color="var(--color-text-primary)">
        {value}
      </Text>
    </HStack>
  );
}

function OriginCard({ origin, metrics }: { origin: SourceOrigin; metrics: OriginMetrics }) {
  return (
    <Box bg="#0C0D10" border="1px solid rgba(255,255,255,0.07)" borderRadius="16px" p={5}>
      <Text className="inter-semibold" fontSize="md" color="var(--color-accent-gold-light, #E8C547)" mb={3}>
        {SOURCE_ORIGIN_LABELS[origin]}
      </Text>
      <Stack spacing={0}>
        <MetricRow label="Leads" value={String(metrics.leads)} />
        <MetricRow label="Calls gebucht" value={String(metrics.bookings)} />
        <MetricRow label="Booking-Rate" value={pctFmt(metrics.bookingRatePct)} />
        <MetricRow label="Closed Won" value={String(metrics.closedWon)} />
        <MetricRow label="Close-Rate" value={pctFmt(metrics.closeRatePct)} />
        <HStack justify="space-between" pt={2}>
          <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
            Revenue
          </Text>
          <Text className="inter-semibold" fontSize="sm" color="#34D399" fontWeight={700}>
            {eurFromCents(metrics.revenueCents)}
          </Text>
        </HStack>
      </Stack>
    </Box>
  );
}

export function SourceOriginSegment({
  funnelByOrigin,
  perChannel,
}: {
  funnelByOrigin?: FunnelByOrigin;
  perChannel?: PerChannelRow[];
}) {
  const channels = perChannel ?? [];
  const discord = computeMetrics("discord_funnel", funnelByOrigin, channels);
  const direct = computeMetrics("termin_direct", funnelByOrigin, channels);

  return (
    <SectionCard
      title="Herkunfts-Segment"
      subtitle="Discord-Funnel (Cold Traffic) vs. Termin direkt."
      icon={<GitCompareArrows size={16} />}
    >
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
        <OriginCard origin="discord_funnel" metrics={discord} />
        <OriginCard origin="termin_direct" metrics={direct} />
      </SimpleGrid>
    </SectionCard>
  );
}
