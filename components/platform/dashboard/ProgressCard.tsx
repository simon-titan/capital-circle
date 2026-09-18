"use client";

import { Box, Flex, Text, Tooltip } from "@chakra-ui/react";
import { Check, Flame } from "lucide-react";
import { CardLink, DashCard, Meta } from "./primitives";
import type { ProgressSummary, StreakSummary } from "./types";

/** Zehn Segmente à 10 % — Zahl und Balken zeigen immer dasselbe (wie im Mockup). */
const SEGMENTS = 10;

/**
 * Fortschritt und Streak in einer Karte (Kunden-Mockup 09/2026).
 *
 * Bis dahin waren das zwei Karten übereinander, die dieselbe Frage beantwortet
 * haben: „Wie weit bin ich?“ Zusammengelegt trägt die große Prozentzahl die
 * Antwort, und Streak und Wochentage stehen als zwei ruhige Kennzahlen darunter.
 */
export function ProgressCard({ progress, streak }: { progress: ProgressSummary; streak: StreakSummary }) {
  const { percent, completedVideos, totalVideos, totalModules } = progress;

  if (totalModules === 0) {
    return (
      <DashCard label="Dein Fortschritt" labelId="dash-progress">
        <Meta>Noch keine Module freigeschaltet.</Meta>
      </DashCard>
    );
  }

  // Abgerundet: das letzte Segment füllt sich erst bei 100 %.
  const filled = Math.floor(Math.max(0, Math.min(100, percent)) / (100 / SEGMENTS));

  return (
    <DashCard
      label="Dein Fortschritt"
      labelId="dash-progress"
      badge={<CardLink href="/ausbildung">Details</CardLink>}
    >
      <Text
        className="cc-num"
        fontSize={{ base: "38px", md: "44px" }}
        lineHeight="1"
        fontWeight={600}
        letterSpacing="-0.02em"
        color="var(--cc-text)"
      >
        {percent} %
      </Text>
      <Meta mt={3} className="cc-num">
        {completedVideos} von {totalVideos} Lektionen abgeschlossen
      </Meta>

      {/* Segmente in heller Datenfarbe wie im Kunden-Mockup; offen = Kontur. */}
      <Flex gap="5px" mt={5} role="img" aria-label={`${percent} Prozent der Institut-Videos angesehen`}>
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const on = i < filled;
          return (
            <Box
              key={i}
              flex="1"
              h="20px"
              borderRadius="4px"
              position="relative"
              overflow="hidden"
              border="1px solid"
              borderColor={on ? "transparent" : "rgba(255, 255, 255, 0.14)"}
            >
              {on ? (
                <Box
                  className="cc-fill"
                  position="absolute"
                  inset={0}
                  bg="var(--cc-ink)"
                  style={{ animationDelay: `${i * 45}ms` }}
                />
              ) : null}
            </Box>
          );
        })}
      </Flex>

      {/* `mt="auto"` schiebt die Kennzahlen ans untere Ende — wächst die Karte auf
          die Höhe der Nachbarkarte, klafft sonst eine Lücke darunter. */}
      <Flex
        mt="auto"
        pt={5}
        gap={5}
        borderTop="1px solid var(--cc-line)"
        align="center"
        direction={{ base: "column", sm: "row" }}
        alignItems={{ base: "flex-start", sm: "center" }}
      >
        <Tooltip
          label={streak.days === 1 ? "1 Tag in Folge aktiv" : `${streak.days} Tage in Folge aktiv`}
          placement="top"
          openDelay={200}
          bg="var(--cc-surface-2)"
          color="var(--cc-text)"
          border="1px solid var(--cc-line-strong)"
          borderRadius="6px"
          px={3}
          py={2}
          fontSize="13px"
        >
          <Flex align="center" gap={3} flex="1" minW={0} tabIndex={0}>
            <Flex
              w="44px"
              h="44px"
              flexShrink={0}
              align="center"
              justify="center"
              borderRadius="12px"
              bg="linear-gradient(145deg, rgba(255, 140, 60, 0.3) 0%, rgba(212, 176, 128, 0.16) 100%)"
              border="1px solid rgba(255, 160, 80, 0.45)"
              aria-hidden
            >
              <Box className="cc-flame" display="flex">
                <Flame size={20} strokeWidth={1.6} color="#ffb454" fill="rgba(255, 120, 40, 0.35)" />
              </Box>
            </Flex>
            <Box minW={0}>
              <Text className="cc-num" fontSize="22px" lineHeight="1.1" fontWeight={600} color="var(--cc-text)">
                {streak.days}
              </Text>
              <Text fontSize="13px" lineHeight={1.4} color="var(--cc-text-2)">
                {streak.days === 1 ? "Tag aktiv" : "Tage aktiv"}
              </Text>
            </Box>
          </Flex>
        </Tooltip>

        <Flex
          align="center"
          gap={3}
          flex="1"
          minW={0}
          borderLeft={{ base: "none", sm: "1px solid var(--cc-line)" }}
          pl={{ base: 0, sm: 5 }}
        >
          <Flex
            w="28px"
            h="28px"
            flexShrink={0}
            align="center"
            justify="center"
            borderRadius="full"
            border="1px solid var(--cc-line-strong)"
            color="var(--cc-ink)"
            aria-hidden
          >
            <Check size={15} strokeWidth={2.25} />
          </Flex>
          <Box minW={0}>
            <Text className="cc-num" fontSize="14px" lineHeight={1.3} fontWeight={600} color="var(--cc-text)">
              {streak.weekdaysActive} von {streak.weekdaysTotal} Tagen
            </Text>
            <Text fontSize="13px" lineHeight={1.4} color="var(--cc-text-2)">
              diese Woche
            </Text>
          </Box>
        </Flex>
      </Flex>
    </DashCard>
  );
}
