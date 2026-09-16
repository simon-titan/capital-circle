"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { Clock } from "lucide-react";
import { ADMIN_CHART, adminInsetProps } from "@/components/admin/adminUi";
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
        <Box {...adminInsetProps} p={4}>
          <Text
            fontSize="11px"
            fontWeight={500}
            letterSpacing="0.06em"
            textTransform="uppercase"
            color="var(--cc-text-2)"
            mb={2}
          >
            Ø Verweildauer
          </Text>
          <Text className="cc-num" fontSize="28px" fontWeight={600} letterSpacing="-0.01em" color="var(--cc-text)" lineHeight="1">
            {avgHours != null ? `${avgHours.toFixed(1)} h` : "—"}
          </Text>
        </Box>

        <Stack spacing={3}>
          {distribution.length === 0 ? (
            <Text fontSize="12px" color="var(--cc-text-3)">
              Keine Daten im Zeitraum.
            </Text>
          ) : (
            distribution.map((d) => {
              const pct = max > 0 ? d.count / max : 0;
              return (
                <Stack key={d.bucket} spacing={1}>
                  <HStack justify="space-between">
                    <Text fontSize="12px" color="var(--cc-text-2)">
                      {d.bucket}
                    </Text>
                    <Text className="cc-num" fontSize="12px" fontWeight={600} color="var(--cc-text)">
                      {d.count}
                    </Text>
                  </HStack>
                  <Box bg={ADMIN_CHART.track} borderRadius="full" overflow="hidden" h="6px">
                    <Box
                      h="full"
                      w={`${(pct * 100).toFixed(2)}%`}
                      bg={ADMIN_CHART.gold}
                      borderRadius="full"
                      transition="width 500ms var(--cc-ease)"
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
