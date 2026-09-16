"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { DashCard, Meta } from "./primitives";
import type { ProgressSummary } from "./types";

/** Zehn Segmente à 10 % — Zahl und Balken zeigen immer dasselbe (wie im Mockup). */
const SEGMENTS = 10;

export function ProgressCard({ progress }: { progress: ProgressSummary }) {
  const { percent, completedModules, totalModules, completedVideos, totalVideos } = progress;

  if (totalModules === 0) {
    return (
      <DashCard label="Fortschritt" labelId="dash-progress">
        <Meta>Noch keine Module freigeschaltet.</Meta>
      </DashCard>
    );
  }

  // Abgerundet: das letzte Segment füllt sich erst bei 100 %.
  const filled = Math.floor(Math.max(0, Math.min(100, percent)) / (100 / SEGMENTS));

  return (
    <DashCard label="Fortschritt" labelId="dash-progress">
      <Text as="p" fontSize="17px" lineHeight={1.3} color="var(--cc-text-soft)">
        <Box as="span" whiteSpace="nowrap">
          <Box as="span" className="cc-num" fontSize="30px" fontWeight={600} letterSpacing="-0.02em" color="var(--cc-text)">
            {percent}%
          </Box>{" "}
          —
        </Box>{" "}
        <Box as="span" whiteSpace="nowrap">
          dein Weg durchs Institut
        </Box>
      </Text>

      {/* Segmente in heller Datenfarbe wie im Kunden-Mockup; offen = Kontur. */}
      <Flex gap="5px" mt={5} role="img" aria-label={`${percent} Prozent der Institut-Videos angesehen`}>
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const on = i < filled;
          return (
            <Box
              key={i}
              flex="1"
              h="24px"
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

      {/* `mt="auto"` schiebt die Kennzahl ans untere Ende — wächst die Karte auf
          die Höhe der Nachbarkarten, klafft sonst eine Lücke darunter. */}
      <Meta mt="auto" pt={4} className="cc-num">
        {completedModules} von {totalModules} Modulen · {completedVideos} von {totalVideos} Videos
      </Meta>
    </DashCard>
  );
}
