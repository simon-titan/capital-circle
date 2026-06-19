"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { Clock } from "lucide-react";
import type { TimeOnDiscord } from "./types";
import { SectionCard } from "./primitives";

export function TimeOnDiscordPanel({ data }: { data?: TimeOnDiscord }) {
  const distribution = data?.distribution ?? [];
  const max = Math.max(1, ...distribution.map((d) => d.count));
  const avgHours = data?.avgHours;

  return (
    <SectionCard
      title="Zeit auf Discord vor dem Call"
      subtitle="Spanne zwischen Server-Join und gebuchtem Termin."
      icon={<Clock size={16} />}
    >
      <Stack spacing={5}>
        <Box
          bg="rgba(212,175,55,0.08)"
          border="1px solid rgba(212,175,55,0.20)"
          borderRadius="14px"
          p={4}
        >
          <Text
            fontSize="11px"
            letterSpacing="0.08em"
            textTransform="uppercase"
            color="#606068"
            className="inter"
            mb={1}
          >
            Ø Verweildauer
          </Text>
          <Text className="inter-semibold" fontSize="28px" fontWeight={700} color="#E8C547" lineHeight="1">
            {avgHours != null ? `${avgHours.toFixed(1)} h` : "—"}
          </Text>
        </Box>

        <Stack spacing={3}>
          {distribution.length === 0 ? (
            <Text fontSize="xs" color="#3A3A40" className="inter" fontStyle="italic">
              Keine Daten im Zeitraum.
            </Text>
          ) : (
            distribution.map((d) => {
              const pct = max > 0 ? d.count / max : 0;
              return (
                <Stack key={d.bucket} spacing={1}>
                  <HStack justify="space-between">
                    <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
                      {d.bucket}
                    </Text>
                    <Text className="inter-semibold" fontSize="xs" color="var(--color-text-primary)">
                      {d.count}
                    </Text>
                  </HStack>
                  <Box bg="#1A1B1F" borderRadius="9999px" overflow="hidden" h="6px">
                    <Box
                      h="full"
                      w={`${(pct * 100).toFixed(2)}%`}
                      background="linear-gradient(90deg, #A67C00 0%, #D4AF37 100%)"
                      borderRadius="9999px"
                      transition="width 500ms ease"
                    />
                  </Box>
                </Stack>
              );
            })
          )}
        </Stack>
      </Stack>
    </SectionCard>
  );
}
