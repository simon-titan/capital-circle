"use client";

import { Box, Flex, Grid, Heading, Text, Tooltip } from "@chakra-ui/react";
import { Check, Flame } from "lucide-react";
import { DashCard } from "./primitives";
import type { StreakDay } from "./types";

export function StreakCard({ days, week }: { days: number; week: StreakDay[] }) {
  return (
    <DashCard label="Streak" labelId="dash-streak">
      <Flex align="center" gap={5}>
        <Flex
          w="56px"
          h="56px"
          flexShrink={0}
          align="center"
          justify="center"
          borderRadius="12px"
          bg="linear-gradient(145deg, rgba(255, 140, 60, 0.3) 0%, rgba(212, 176, 128, 0.16) 100%)"
          border="1px solid rgba(255, 160, 80, 0.45)"
          boxShadow="0 0 28px rgba(255, 140, 60, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.14)"
          aria-hidden
        >
          <Box className="cc-flame" display="flex">
            <Flame size={26} strokeWidth={1.6} color="#ffb454" fill="rgba(255, 120, 40, 0.35)" />
          </Box>
        </Flex>
        <Box>
          <Text className="cc-num" fontSize="44px" lineHeight="44px" fontWeight={600} letterSpacing="-0.02em" color="var(--cc-text)">
            {days}
          </Text>
          <Text fontSize="15px" color="var(--cc-text-2)" mt={1}>
            {days === 1 ? "Tag in Folge" : "Tage in Folge"}
          </Text>
        </Box>
      </Flex>

      <Heading
        as="h3"
        fontSize="12px"
        lineHeight="16px"
        fontWeight={500}
        letterSpacing="0.12em"
        textTransform="uppercase"
        color="var(--cc-text-2)"
        mt={7}
        mb={3}
      >
        Letzte 7 Tage
      </Heading>
      <Grid as="ol" listStyleType="none" templateColumns="repeat(7, minmax(0, 1fr))" gap={1} maxW="440px">
        {week.map((d) => (
          <Tooltip
            key={d.dayKey}
            label={d.detail}
            placement="top"
            openDelay={150}
            bg="var(--cc-surface-2)"
            color="var(--cc-text)"
            border="1px solid var(--cc-line-strong)"
            borderRadius="6px"
            px={3}
            py={2}
            fontSize="13px"
            fontWeight={400}
          >
            <Flex as="li" direction="column" align="center" gap={2} py={1} borderRadius="6px" tabIndex={0} aria-label={d.detail}>
              <Text
                fontSize="13px"
                textTransform="capitalize"
                color={d.isToday ? "var(--cc-text)" : "var(--cc-text-2)"}
                fontWeight={d.isToday ? 600 : 400}
              >
                {d.weekdayShort}
              </Text>
              {/* Haken in heller Datenfarbe wie im Kunden-Mockup */}
              {d.active ? (
                <Flex w="26px" h="26px" borderRadius="full" bg="var(--cc-ink)" color="var(--cc-bg)" align="center" justify="center">
                  <Check size={15} strokeWidth={2.75} aria-hidden />
                </Flex>
              ) : (
                <Box
                  w="26px"
                  h="26px"
                  borderRadius="full"
                  border="1.5px solid"
                  borderColor={d.isToday ? "var(--cc-gold-line)" : "rgba(255, 255, 255, 0.3)"}
                />
              )}
            </Flex>
          </Tooltip>
        ))}
      </Grid>
    </DashCard>
  );
}
