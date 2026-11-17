"use client";

import { Box, Button, Stack, Text } from "@chakra-ui/react";
import { ArrowRight, CalendarCheck } from "lucide-react";
import { mitglied, PROGRAMME_PFAD } from "@/config/training";
import { AnalyseGespraechKnopf } from "./AnalyseGespraech";

/**
 * „Bereit für den nächsten Schritt?" (Board, Spalte 4) unter den Videos.
 *
 * Laut Board „nach Video 3 / jederzeit erreichbar": Die Karte steht immer da,
 * wird nach dem dritten Video aber zur Hauptaktion (Gold-Rahmen) und meldet die
 * Anfrage als `nach_video_3`. Vorher zählt sie als `training`.
 */
export function NaechsterSchritt({ abgeschlossen }: { abgeschlossen: boolean }) {
  const c = mitglied.cta;
  return (
    <Stack
      className={abgeschlossen ? "cc-card cc-card--hero" : "cc-card cc-card--still"}
      p={{ base: 6, md: 8 }}
      spacing={5}
      align="center"
      textAlign="center"
      maxW="560px"
      mx="auto"
      w="full"
    >
      <Box color="var(--cc-gold-light)">
        <CalendarCheck size={34} strokeWidth={1.5} aria-hidden />
      </Box>
      <Text as="h2" fontSize={{ base: "20px", md: "24px" }} fontWeight={600} color="var(--cc-text)">
        {c.titel}
      </Text>
      <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
        {c.text}
      </Text>
      <AnalyseGespraechKnopf stelle={abgeschlossen ? "nach_video_3" : "training"} w={{ base: "full", sm: "auto" }} minH="50px">
        {c.gespraech}
      </AnalyseGespraechKnopf>
      <Box w="full" borderTop="1px solid var(--cc-line)" pt={5}>
        <Text fontSize="14px" color="var(--cc-text-2)" mb={3}>
          {c.oder}
        </Text>
        <Button as="a" href={PROGRAMME_PFAD} variant="line" rightIcon={<ArrowRight size={16} strokeWidth={2} />}>
          {c.ausbildung}
        </Button>
      </Box>
    </Stack>
  );
}
