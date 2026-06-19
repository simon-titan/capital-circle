"use client";

import { Box, Button, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { Activity } from "lucide-react";
import { useState } from "react";
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
        <Text fontSize="sm" color="#3A3A40" className="inter" fontStyle="italic">
          Keine Daten im Zeitraum.
        </Text>
      ) : null}
      {funnel.map((stage) => {
        if (stage.isRevenue) {
          return (
            <HStack key={stage.key} justify="space-between">
              <Text fontSize="sm" color="var(--color-text-primary)" className="inter">
                {stage.label}
              </Text>
              <Text className="jetbrains-mono" fontSize="sm" color="#E8C547" fontWeight={700}>
                {eurFromCents(stage.value)}
              </Text>
            </HStack>
          );
        }
        const pct = max > 0 ? Math.max(stage.value > 0 ? 0.02 : 0, stage.value / max) : 0;
        return (
          <Stack key={stage.key} spacing={2}>
            <HStack justify="space-between">
              <Text fontSize="sm" color="var(--color-text-primary)" className="inter">
                {stage.label}
              </Text>
              <Text className="jetbrains-mono" fontSize="sm" color="var(--color-text-primary)">
                {stage.value}
              </Text>
            </HStack>
            <Box bg="#1A1B1F" borderRadius="9999px" overflow="hidden" h="8px">
              <Box
                h="full"
                w={`${(pct * 100).toFixed(2)}%`}
                background="linear-gradient(90deg, #A67C00 0%, #D4AF37 100%)"
                borderRadius="9999px"
                boxShadow="0 0 8px rgba(212,175,55,0.30)"
                transition="width 600ms cubic-bezier(0.16, 1, 0.3, 1)"
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
          <HStack spacing={1}>
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
                  size="xs"
                  onClick={() => setByOrigin(opt.id)}
                  bg={active ? "rgba(212,175,55,0.16)" : "transparent"}
                  color={active ? "var(--color-accent-gold-light, #E8C547)" : "var(--color-text-secondary)"}
                  border="1px solid"
                  borderColor={active ? "rgba(212,175,55,0.45)" : "rgba(255,255,255,0.10)"}
                  _hover={{ bg: "rgba(255,255,255,0.06)" }}
                  className="inter"
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
            <Box
              key={origin}
              bg="#0C0D10"
              border="1px solid rgba(255,255,255,0.07)"
              borderRadius="12px"
              p={4}
            >
              <Text className="inter-semibold" fontSize="sm" color="var(--color-accent-gold-light, #E8C547)" mb={4}>
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
