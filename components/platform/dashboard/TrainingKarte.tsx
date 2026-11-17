"use client";

import { Box, Button, Flex, Grid, Stack, Text, type BoxProps } from "@chakra-ui/react";
import { ArrowRight, PenLine, UserRound } from "lucide-react";
import NextLink from "next/link";
import { mitglied, PROGRAMME_PFAD, TRAINING_VIDEOS_PFAD } from "@/config/training";
import { ProgressBar } from "./primitives";
import type { TrainingKachel } from "./types";

/**
 * Free-Dashboard (Board, Spalte 6): Willkommen, Fortschritt im kostenlosen
 * Training, Knopf zum nächsten Video und „Dein nächster Schritt" mit den zwei
 * Wegen. Nur für Konten ohne Zahlung (`training` in den Dashboard-Daten).
 *
 * Steht im neutralen Dashboard (`.cc-neutral`): kein Gold-Schein, Gold nur für
 * den Knopf.
 */
export function TrainingKarte({ training, ...rest }: BoxProps & { training: TrainingKachel }) {
  const d = mitglied.dashboard;
  const k = mitglied.karten;
  return (
    <Box className="cc-card cc-card--still" p={{ base: 5, md: 7 }} {...rest}>
      <Stack spacing={6}>
        <Box>
          <Text fontSize={{ base: "20px", md: "22px" }} fontWeight={600} color="var(--cc-text)">
            {d.titel}
          </Text>
          <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)" mt={1.5} maxW="62ch">
            {d.text}
          </Text>
        </Box>

        <Flex direction={{ base: "column", md: "row" }} gap={{ base: 4, md: 6 }} align={{ base: "stretch", md: "center" }}>
          <Stack spacing={2} flex="1" minW={0}>
            <ProgressBar value={(training.gesehen / training.gesamt) * 100} label="Fortschritt im kostenlosen Training" />
            <Text className="cc-num" fontSize="13px" color="var(--cc-text-2)">
              {Math.min(training.gesehen, training.gesamt)}/{training.gesamt} Videos abgeschlossen
            </Text>
          </Stack>
          <Button
            as={NextLink}
            href={TRAINING_VIDEOS_PFAD}
            variant="gold"
            rightIcon={<ArrowRight size={17} strokeWidth={2} />}
            flexShrink={0}
          >
            {training.abgeschlossen ? d.fertig : d.weiter(training.naechstes)}
          </Button>
        </Flex>

        <Box borderTop="1px solid var(--cc-line)" pt={5}>
          <Text fontSize="15px" fontWeight={600} color="var(--cc-text)" mb={4}>
            {d.naechsterSchritt}
          </Text>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }} gap={4}>
            {[
              { ...k.selbst, icon: PenLine, href: PROGRAMME_PFAD },
              { ...k.begleitung, icon: UserRound, href: `${PROGRAMME_PFAD}#mentoring` },
            ].map((karte) => (
              <Stack key={karte.titel} spacing={3} p={5} borderRadius="12px" border="1px solid var(--cc-line)" bg="rgba(255,255,255,0.02)">
                <Box color="var(--cc-gold-light)">
                  <karte.icon size={24} strokeWidth={1.5} aria-hidden />
                </Box>
                <Text fontSize="15px" fontWeight={600} color="var(--cc-text)">
                  {karte.titel}
                </Text>
                <Text fontSize="14px" color="var(--cc-text-2)" flex="1">
                  {karte.text}
                </Text>
                <Button as={NextLink} href={karte.href} variant="line" size="sm" alignSelf="flex-start" rightIcon={<ArrowRight size={14} />}>
                  {karte.knopf}
                </Button>
              </Stack>
            ))}
          </Grid>
        </Box>
      </Stack>
    </Box>
  );
}
