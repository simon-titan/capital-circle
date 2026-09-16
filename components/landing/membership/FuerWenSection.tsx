"use client";

import { Box, Flex, Grid, Heading, Stack, Text } from "@chakra-ui/react";
import { Compass, ShieldCheck, TrendingUp, type LucideIcon } from "lucide-react";
import { fuerWen } from "@/config/landing-membership";
import { Reveal } from "../landing-ui";
import { Sektion, SektionsKopf } from "./membership-ui";

const ICONS: Record<string, LucideIcon> = {
  compass: Compass,
  trending: TrendingUp,
  shield: ShieldCheck,
};

/**
 * Für wen — und für wen nicht.
 *
 * Die drei Karten sind neutral gehalten (Icon-Kacheln ohne Gold, wie im
 * Mitgliederbereich): Es geht um Einordnung, nicht um eine Aktion. Gold würde
 * hier etwas hervorheben, das man nicht anklicken kann.
 *
 * Die Ausschlussbox darunter trägt als einziges Element der Seite eine rote
 * Kontur. DESIGN.md erlaubt Rot ausschließlich semantisch, und „das ist nichts
 * für dich" ist genau das. Sie steht bewusst nach den drei Karten und nicht
 * davor: Erst das Angebot, dann die Grenze.
 */
export function FuerWenSection() {
  return (
    <Sektion aria-labelledby="fuer-wen-titel">
      <SektionsKopf eyebrow={fuerWen.eyebrow} headline={fuerWen.headline} id="fuer-wen-titel" />

      <Grid
        mt={{ base: 10, md: 12 }}
        templateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }}
        gap={{ base: 4, md: 5 }}
      >
        {fuerWen.gruppen.map((gruppe, i) => {
          const Icon = ICONS[gruppe.icon] ?? Compass;
          return (
            <Reveal key={gruppe.titel} delay={i * 70}>
              <Stack className="cc-card" h="100%" p={{ base: 5, md: 6 }} spacing={5}>
                <Text
                  className="cc-num"
                  fontSize="13px"
                  fontWeight={500}
                  letterSpacing="0.14em"
                  color="var(--cc-text-3)"
                  aria-hidden
                >
                  {String(i + 1).padStart(2, "0")}
                </Text>

                {/* Icon-Kachel neutral — wie im Kunden-Mockup des Dashboards. */}
                <Flex
                  w="52px"
                  h="52px"
                  align="center"
                  justify="center"
                  borderRadius="12px"
                  border="1px solid var(--cc-line-strong)"
                  bg="rgba(255, 255, 255, 0.02)"
                  color="var(--cc-text)"
                  aria-hidden
                >
                  <Icon size={24} strokeWidth={1.5} />
                </Flex>

                <Heading
                  as="h3"
                  fontSize={{ base: "22px", md: "25px" }}
                  fontWeight={600}
                  lineHeight={1.2}
                  letterSpacing="-0.02em"
                  color="var(--cc-text)"
                >
                  {gruppe.titel}
                </Heading>

                <Box flex="1" />

                <Stack spacing={2}>
                  <Text
                    fontSize="11px"
                    fontWeight={500}
                    letterSpacing="0.14em"
                    textTransform="uppercase"
                    color="var(--cc-text-3)"
                  >
                    Ergebnis:
                  </Text>
                  <Text fontSize="16px" lineHeight={1.55} color="var(--cc-text-2)">
                    {gruppe.ergebnis}
                  </Text>
                </Stack>
              </Stack>
            </Reveal>
          );
        })}
      </Grid>

      <Reveal delay={220}>
        <Box
          mt={{ base: 5, md: 6 }}
          p={{ base: 5, md: 7 }}
          borderRadius="12px"
          border="1px solid rgba(248, 113, 113, 0.35)"
          bg="linear-gradient(180deg, rgba(30, 22, 24, 0.7), rgba(24, 29, 34, 0.7))"
          backdropFilter="blur(14px)"
        >
          <Heading as="h3" fontSize={{ base: "20px", md: "24px" }} fontWeight={600} letterSpacing="-0.01em" mb={4}>
            {fuerWen.ausschluss.titel}
          </Heading>
          <Stack as="ul" listStyleType="none" spacing={2.5}>
            {fuerWen.ausschluss.punkte.map((punkt) => (
              <Flex as="li" key={punkt} gap={3} align="flex-start">
                <Box
                  aria-hidden
                  flexShrink={0}
                  mt="11px"
                  w="14px"
                  h="1px"
                  bg="var(--cc-danger)"
                  opacity={0.85}
                />
                <Text fontSize={{ base: "15px", md: "16px" }} lineHeight={1.6} color="var(--cc-text-2)">
                  {punkt}
                </Text>
              </Flex>
            ))}
          </Stack>
        </Box>
      </Reveal>
    </Sektion>
  );
}
