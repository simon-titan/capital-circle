"use client";

import { Box, Button, Flex, Grid, HStack, Stack, Text, type BoxProps } from "@chakra-ui/react";
import { ArrowRight, Hash, Lock } from "lucide-react";
import NextLink from "next/link";
import { community, PROGRAMME_PFAD } from "@/config/training";
import type { TerminZeile } from "./types";

/**
 * „Community & Live" (Board „Free Training", Spalte 9) für Free-Konten:
 * links die nächsten Live-Termine, rechts die Discord-Kanäle — gesperrt, mit
 * dem Weg zu „Ausbildung & Mentoring". Zahlende sehen dieselben Inhalte schon
 * über Live-Karte, Termine und den Discord-Punkt, deshalb nur hier.
 *
 * Im neutralen Dashboard: keine Gold-Kanten, Gold nur als Text-Akzent.
 */
/** „Heute", „Morgen", „In 3 Tagen" — wie im Board. */
function abstand(t: TerminZeile): string {
  if (t.istHeute) return "Heute";
  const tage = Math.max(1, Math.round((t.minutesUntilStart ?? 0) / 1440));
  return tage === 1 ? "Morgen" : `In ${tage} Tagen`;
}

export function CommunityLiveKarte({ termine, ...rest }: BoxProps & { termine: TerminZeile[] }) {
  const naechste = termine.slice(0, 2);
  return (
    <Grid templateColumns={{ base: "1fr", lg: "repeat(2, minmax(0, 1fr))" }} gap={5} {...rest}>
      <Stack className="cc-card cc-card--still" p={{ base: 5, md: 6 }} spacing={4}>
        <Flex justify="space-between" align="center">
          <Text fontSize="16px" fontWeight={600} color="var(--cc-text)">
            {community.liveTitel}
          </Text>
          <Button as={NextLink} href="/events" size="xs" variant="line" rightIcon={<ArrowRight size={12} />}>
            {community.liveAlle}
          </Button>
        </Flex>
        {naechste.length === 0 ? (
          <Text fontSize="14px" color="var(--cc-text-2)">
            {community.liveLeer}
          </Text>
        ) : (
          naechste.map((t) => (
            <Flex
              key={t.id}
              justify="space-between"
              align="center"
              gap={3}
              p={4}
              borderRadius="12px"
              border="1px solid var(--cc-line)"
              bg="rgba(255,255,255,0.02)"
            >
              <Box minW={0}>
                <Text className="cc-num" fontSize="13px" color="var(--cc-text-2)">
                  {t.dayLabel}, {t.timeLabel}
                </Text>
                <Text fontSize="15px" fontWeight={500} color="var(--cc-text)" noOfLines={1}>
                  {t.title}
                </Text>
              </Box>
              {t.laeuft ? (
                <Box as="span" flexShrink={0} px={2.5} py={1} borderRadius="full" fontSize="12px" fontWeight={600} bg="var(--cc-danger)" color="#fff">
                  Live
                </Box>
              ) : (
                <Box
                  as="span"
                  flexShrink={0}
                  px={2.5}
                  py={1}
                  borderRadius="full"
                  fontSize="12px"
                  border="1px solid var(--cc-line)"
                  color="var(--cc-text-2)"
                >
                  {abstand(t)}
                </Box>
              )}
            </Flex>
          ))
        )}
      </Stack>

      <Stack className="cc-card cc-card--still" p={{ base: 5, md: 6 }} spacing={3}>
        <Flex justify="space-between" align="center">
          <Text fontSize="16px" fontWeight={600} color="var(--cc-text)">
            {community.communityTitel}
          </Text>
          <HStack spacing={1.5} color="var(--cc-text-3)">
            <Lock size={13} strokeWidth={1.75} aria-hidden />
            <Text fontSize="12px">Discord</Text>
          </HStack>
        </Flex>
        <Stack spacing={2.5} opacity={0.6} aria-hidden>
          {community.kanaele.map((k) => (
            <HStack key={k.name} spacing={3} align="flex-start">
              <Box color="var(--cc-text-2)" pt="3px">
                <Hash size={15} strokeWidth={1.75} />
              </Box>
              <Box>
                <Text fontSize="14px" fontWeight={500} color="var(--cc-text)">
                  {k.name}
                </Text>
                <Text fontSize="12px" color="var(--cc-text-3)">
                  {k.text}
                </Text>
              </Box>
            </HStack>
          ))}
        </Stack>
        <Box borderTop="1px solid var(--cc-line)" pt={4} mt="auto">
          <Text fontSize="13px" color="var(--cc-text-2)" mb={3}>
            {community.gesperrt}
          </Text>
          <Button as={NextLink} href={PROGRAMME_PFAD} size="sm" variant="line" rightIcon={<ArrowRight size={14} />}>
            {community.gesperrtKnopf}
          </Button>
        </Box>
      </Stack>
    </Grid>
  );
}
