"use client";

import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { finalerCta } from "@/config/landing-membership";
import { Reveal } from "../landing-ui";
import { GoldCta, Sektion, SterneZeile } from "./membership-ui";

/**
 * Der Abschluss.
 *
 * Drei Zeilen, die letzte gedimmt — dieselbe Gewichtung wie im Hero, damit die
 * Seite sichtbar dort ankommt, wo sie angefangen hat. Kein neues Argument mehr:
 * Wer bis hierher gelesen hat, braucht keinen weiteren Grund, sondern einen
 * Knopf.
 *
 * Der Knopf führt zurück zur Laufzeitauswahl statt direkt in die Kasse — die
 * Entscheidung, welche Laufzeit es wird, ist an dieser Stelle noch nicht
 * gefallen.
 */
export function FinalCtaSection() {
  const [ersteZeile, zweiteZeile, dritteZeile] = finalerCta.zeilen;

  return (
    <Sektion py={{ base: 20, md: 32 }}>
      <Reveal>
        <Stack spacing={{ base: 8, md: 10 }} align="center" textAlign="center">
          <Heading
            as="h2"
            fontSize="clamp(30px, 5.2vw, 58px)"
            fontWeight={700}
            lineHeight={1.08}
            letterSpacing="-0.03em"
            color="var(--cc-text)"
            maxW="900px"
          >
            {ersteZeile}
            <Box as="span" display="block">
              {zweiteZeile}
            </Box>
            <Box as="span" display="block" color="var(--cc-text-2)">
              {dritteZeile}
            </Box>
          </Heading>

          <Stack spacing={5} align="center">
            <GoldCta href="#angebot" />
            <Text fontSize="14px" color="var(--cc-text-3)">
              {finalerCta.feinabdruck}
            </Text>
            <SterneZeile />
          </Stack>
        </Stack>
      </Reveal>
    </Sektion>
  );
}
