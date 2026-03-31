"use client";

import { Box, Text, Tooltip } from "@chakra-ui/react";
import type { LearningWeekDay } from "@/lib/learning-daily";

function formatDayMinutes(m: number): string {
  if (m <= 0) return "Keine Lernzeit an diesem Tag";
  if (m < 60) return `${m} Min. gesamt`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h} h ${mm} Min. gesamt` : `${h} h gesamt`;
}

type WelcomeLearningWeekProps = {
  days: LearningWeekDay[];
  /** Summe Minuten dieser Woche (Anzeige) */
  weekTotalLabel: string;
};

export function WelcomeLearningWeek({ days, weekTotalLabel }: WelcomeLearningWeekProps) {
  const maxM = Math.max(1, ...days.map((d) => d.minutes));

  return (
    <Box
      w="100%"
      minW={0}
      borderRadius="14px"
      border="1px solid rgba(212, 175, 55, 0.38)"
      bg="linear-gradient(165deg, rgba(212, 175, 55, 0.1) 0%, rgba(8, 8, 8, 0.55) 55%)"
      px={{ base: 3, md: 4 }}
      py={{ base: 2, md: 3 }}
      h="100%"
      display="flex"
      flexDirection="column"
    >
      <Text className="inter-medium" fontSize="xs" letterSpacing="0.1em" textTransform="uppercase" color="rgba(255,255,255,0.5)" mb={1}>
        Lernzeit
      </Text>
      <Text className="inter-semibold" fontSize="sm" color="rgba(245, 236, 210, 0.95)" mb={4}>
        {weekTotalLabel} · letzte 7 Tage
      </Text>
      <Box display="flex" alignItems="flex-end" justifyContent="space-between" gap={{ base: 1, sm: 2 }} flex="1" pt={1} w="100%" minW={0}>
        {days.map((d) => {
          const trackPx = 80;
          const barPx = d.minutes <= 0 ? 4 : Math.max(10, Math.round((trackPx * d.minutes) / maxM));
          const label = `${d.weekdayShort}. · ${d.labelDe}`;
          return (
            <Tooltip
              key={d.dayKey}
              label={
                <Box>
                  <Text fontWeight={600}>{label}</Text>
                  <Text fontSize="sm">{formatDayMinutes(d.minutes)}</Text>
                </Box>
              }
              placement="top"
              hasArrow
              bg="rgba(12, 12, 12, 0.95)"
              color="var(--color-text-primary)"
              borderWidth="1px"
              borderColor="rgba(212, 175, 55, 0.45)"
              px={3}
              py={2}
              borderRadius="md"
            >
              <Box
                flex="1"
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="flex-end"
                minW={0}
                cursor="default"
                aria-label={`${label}: ${formatDayMinutes(d.minutes)}`}
              >
                <Box h={`${trackPx}px`} display="flex" alignItems="flex-end" justifyContent="center" w="100%">
                  <Box
                    w="100%"
                    maxW="34px"
                    h={`${barPx}px`}
                    borderRadius="8px 8px 4px 4px"
                    bg="linear-gradient(180deg, #f0dc82 0%, #d4af37 45%, #8a6f1c 100%)"
                    boxShadow={
                      d.minutes > 0 ? "0 0 16px rgba(212, 175, 55, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)" : undefined
                    }
                    opacity={d.minutes > 0 ? 1 : 0.35}
                    transition="height 0.35s ease, opacity 0.2s"
                  />
                </Box>
                <Text
                  className="inter-medium"
                  fontSize="10px"
                  color="rgba(255,255,255,0.45)"
                  mt={2}
                  textTransform="capitalize"
                  noOfLines={1}
                >
                  {d.weekdayShort}
                </Text>
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}
