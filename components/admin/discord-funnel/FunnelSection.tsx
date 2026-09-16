"use client";

import { Box, Button, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { Activity } from "lucide-react";
import { useState } from "react";
import { ADMIN_CHART, adminChipProps, adminInsetProps } from "@/components/admin/adminUi";
import {
  SOURCE_ORIGIN_LABELS,
  type FunnelByOrigin,
  type FunnelStage,
} from "./types";
import { eurFromCents, SectionCard } from "./primitives";

function FunnelStages({ funnel }: { funnel: FunnelStage[] }) {
  const max = Math.max(1, ...funnel.filter((s) => !s.isRevenue).map((s) => s.value));

  return (
    <Stack spacing={5}>
      {funnel.length === 0 ? (
        <Text fontSize="14px" color="var(--cc-text-3)">
          Keine Daten im Zeitraum.
        </Text>
      ) : null}
      {funnel.map((stage) => {
        if (stage.isRevenue) {
          return (
            <HStack key={stage.key} justify="space-between">
              <Text fontSize="14px" color="var(--cc-text-soft)">
                {stage.label}
              </Text>
              <Text className="cc-num" fontSize="14px" fontWeight={600} color="var(--cc-success)">
                {eurFromCents(stage.value)}
              </Text>
            </HStack>
          );
        }
        const pct = max > 0 ? Math.max(stage.value > 0 ? 0.02 : 0, stage.value / max) : 0;
        return (
          <Stack key={stage.key} spacing={2}>
            <HStack justify="space-between">
              <Text fontSize="14px" color="var(--cc-text-soft)">
                {stage.label}
              </Text>
              <Text className="cc-num" fontSize="14px" fontWeight={600} color="var(--cc-text)">
                {stage.value}
              </Text>
            </HStack>
            <Box bg={ADMIN_CHART.track} borderRadius="full" overflow="hidden" h="8px">
              <Box
                h="full"
                w={`${(pct * 100).toFixed(2)}%`}
                bg={ADMIN_CHART.gold}
                borderRadius="full"
                transition="width 600ms var(--cc-ease)"
              />
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}

export function FunnelSection({
  funnel,
  funnelByOrigin,
}: {
  funnel: FunnelStage[];
  funnelByOrigin?: FunnelByOrigin;
}) {
  const [byOrigin, setByOrigin] = useState(false);
  const hasOrigin = !!funnelByOrigin;

  return (
    <SectionCard
      title="Funnel-Stufen"
      icon={<Activity size={16} />}
      right={
        hasOrigin ? (
          <HStack spacing={2}>
            {(
              [
                { id: false, label: "Gesamt" },
                { id: true, label: "Nach Quelle" },
              ] as const
            ).map((opt) => {
              const active = byOrigin === opt.id;
              return (
                <Button
                  key={String(opt.id)}
                  {...adminChipProps(active)}
                  size="xs"
                  onClick={() => setByOrigin(opt.id)}
                >
                  {opt.label}
                </Button>
              );
            })}
          </HStack>
        ) : null
      }
    >
      {byOrigin && funnelByOrigin ? (
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          {(["discord_funnel", "termin_direct"] as const).map((origin) => (
            <Box key={origin} {...adminInsetProps} p={4}>
              <Text fontSize="14px" fontWeight={600} color="var(--cc-text)" mb={4}>
                {SOURCE_ORIGIN_LABELS[origin]}
              </Text>
              <FunnelStages funnel={funnelByOrigin[origin] ?? []} />
            </Box>
          ))}
        </SimpleGrid>
      ) : (
        <FunnelStages funnel={funnel} />
      )}
    </SectionCard>
  );
}
