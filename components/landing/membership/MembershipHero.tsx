"use client";

import { Box, Heading, HStack, Stack, Text } from "@chakra-ui/react";
import { hero } from "@/config/landing-membership";
import { heroRise } from "../landing-ui";
import { BeitrittCta } from "./BeitrittModal";
import { SterneZeile } from "./membership-ui";
import { PlattformVorschau } from "./PlattformVorschau";

/**
 * Der Seitenkopf.
 *
 * Die Headline steht in zwei Gewichtungen: Das Versprechen in Weiß, die
 * Einschränkung dahinter gedimmt. Das ist kein Stilmittel, sondern die
 * Kernaussage der Seite — „konstant profitabel" ist der Anspruch, „nicht nur an
 * guten Tagen" ist das, was die meisten nicht schaffen. Stünden beide gleich
 * hell, läse sich der zweite Teil wie ein Nachsatz.
 *
 * Darunter die Plattform-Vorschau: Der Besucher sieht, was er kauft, bevor er
 * ein Wort über den Preis liest.
 */import type { Bewertungsspiegel } from "@/lib/landing-reviews";

export function MembershipHero({ bewertungen }: { bewertungen: Bewertungsspiegel }) {
  return (
    <Box
      as="section"
      id="plattform"
      aria-label="Capital Circle, Trading-Community und Plattform"
      position="relative"
      pt={{ base: 10, md: 16 }}
      px={{ base: 4, md: 8, lg: 12 }}
      scrollMarginTop={{ base: "80px", md: "96px" }}
    >
      <Stack maxW="1180px" mx="auto" spacing={{ base: 10, md: 14 }}>
        <Stack spacing={{ base: 6, md: 7 }} align="center" textAlign="center" maxW="900px" mx="auto">
          {/*
            Die Dachzeile sitzt in einer Pill mit einem leise pulsierenden
            Punkt — dieselbe Geste wie der Live-Zustand im Mitgliederbereich
            (DESIGN.md → Live-Zustand). Sie sagt vor dem ersten Satz, dass hier
            etwas läuft, statt es nur zu behaupten. Der Punkt bleibt Gold hell:
            ein zweiter Akzentton käme sonst über die Türschwelle der Seite.
          */}
          <HStack
            {...heroRise(0)}
            spacing={{ base: 2.5, md: 3 }}
            h={{ base: "32px", md: "36px" }}
            px={{ base: 4, md: 5 }}
            borderRadius="full"
            border="1px solid var(--cc-line-strong)"
            bg="rgba(255, 255, 255, 0.02)"
          >
            <Box
              className="cc-pulse"
              aria-hidden
              w="7px"
              h="7px"
              flexShrink={0}
              borderRadius="full"
              bg="var(--cc-gold-light)"
              boxShadow="0 0 10px rgba(232, 192, 148, 0.7)"
            />
            <Text
              as="span"
              fontSize={{ base: "11px", md: "13px" }}
              fontWeight={600}
              letterSpacing="0.22em"
              textTransform="uppercase"
              color="var(--cc-text-soft)"
              whiteSpace="nowrap"
            >
              {hero.eyebrow}
            </Text>
          </HStack>

          <Heading
            as="h1"
            {...heroRise(1)}
            fontSize="clamp(34px, 6.4vw, 68px)"
            fontWeight={700}
            lineHeight={1.05}
            letterSpacing="-0.03em"
            color="var(--cc-text)"
            overflowWrap="break-word"
          >
            {hero.headlineHell}
            <Box as="span" display="block" color="var(--cc-text-2)">
              {hero.headlineGedimmt}
            </Box>
          </Heading>

          <Stack {...heroRise(2)} spacing={1} maxW="760px">
            {hero.sublines.map((zeile) => (
              <Text key={zeile} fontSize={{ base: "16px", md: "18px" }} lineHeight={1.6} color="var(--cc-text-2)">
                {zeile}
              </Text>
            ))}
          </Stack>

          {/* Öffnet den Beitritts-Dialog, statt zum Angebot zu springen: Wer
              hier klickt, hat den Preis noch nicht gesehen — ihn erst quer über
              die Seite zu schicken, kostet den Klick. */}
          <Stack {...heroRise(3)} spacing={5} align="center" pt={2}>
            <BeitrittCta />
            <SterneZeile bewertungen={bewertungen} />
          </Stack>
        </Stack>

        {/*
          Die Vorschau taucht nach unten ab, statt mit einer Kante zu enden —
          sie ist ein Blick in die Plattform, kein abgeschlossenes Element.
        */}
        <Box {...heroRise(4)} position="relative" mb={{ base: -6, md: -10 }}>
          <PlattformVorschau />
          <Box
            aria-hidden
            position="absolute"
            left={0}
            right={0}
            bottom={0}
            h={{ base: "80px", md: "140px" }}
            pointerEvents="none"
            bg="linear-gradient(180deg, transparent, var(--cc-bg))"
          />
        </Box>
      </Stack>
    </Box>
  );
}
