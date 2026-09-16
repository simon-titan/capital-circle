"use client";

import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { hero } from "@/config/landing-membership";
import { heroRise } from "../landing-ui";
import { GoldCta, SterneZeile } from "./membership-ui";
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
 */
export function MembershipHero() {
  return (
    <Box
      as="section"
      id="plattform"
      aria-label="Capital Circle — Trading-Community und Plattform"
      position="relative"
      pt={{ base: 10, md: 16 }}
      px={{ base: 4, md: 8, lg: 12 }}
      scrollMarginTop={{ base: "80px", md: "96px" }}
    >
      <Stack maxW="1180px" mx="auto" spacing={{ base: 10, md: 14 }}>
        <Stack spacing={{ base: 6, md: 7 }} align="center" textAlign="center" maxW="900px" mx="auto">
          <Text
            {...heroRise(0)}
            fontSize={{ base: "11px", md: "13px" }}
            fontWeight={600}
            letterSpacing="0.22em"
            textTransform="uppercase"
            color="var(--cc-text-soft)"
          >
            {hero.eyebrow}
          </Text>

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

          <Stack {...heroRise(3)} spacing={5} align="center" pt={2}>
            <GoldCta href="#angebot" />
            <SterneZeile />
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
