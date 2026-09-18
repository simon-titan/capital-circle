"use client";

import { Box, Flex, Grid, Heading, Stack, Text } from "@chakra-ui/react";
import { Ban, Compass, ShieldCheck, TrendingUp, type LucideIcon } from "lucide-react";
import { fuerWen } from "@/config/landing-membership";
import { Reveal } from "../landing-ui";
import { BeitrittCta } from "./BeitrittModal";
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
 * hier etwas hervorheben, das man nicht anklicken kann. Deshalb steht hier auch
 * bewusst **nicht** `GoldIconTile` aus `landing-ui.tsx` — die Kachel folgt der
 * Icon-Kachel-Regel aus DESIGN.md („neutral wie im Kunden-Mockup").
 *
 * Die Ausschlussbox darunter trägt als einziges Element der Seite eine rote
 * Kontur. DESIGN.md erlaubt Rot ausschließlich semantisch, und „das ist nichts
 * für dich" ist genau das. Sie steht bewusst nach den drei Karten und nicht
 * davor: Erst das Angebot, dann die Grenze.
 *
 * Der Knopf ganz unten schließt den Abschnitt ab, weil hier die Einordnung
 * fällt: Wer sich in einer der drei Karten wiedererkannt und in der roten Box
 * nicht wiedergefunden hat, hat seine Entscheidung an dieser Stelle getroffen.
 */
export function FuerWenSection() {
  return (
    <Sektion aria-labelledby="fuer-wen-titel">
      <SektionsKopf
        eyebrow={fuerWen.eyebrow}
        headline={fuerWen.headline}
        id="fuer-wen-titel"
        sublines={[fuerWen.subline]}
        merksatz={fuerWen.merksatz}
        lichtstriche
        maxW="760px"
      />

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
                  fontSize={{ base: "21px", md: "24px" }}
                  fontWeight={600}
                  lineHeight={1.25}
                  letterSpacing="-0.02em"
                  color="var(--cc-text)"
                  // Der Umbruch aus der Config greift erst, wenn die Spalte schmal
                  // genug ist, dass er der Zeile hilft statt sie zu zerteilen.
                  whiteSpace={{ base: "normal", md: "pre-line" }}
                >
                  {gruppe.titel}
                </Heading>

                <Text fontSize={{ base: "15px", md: "16px" }} lineHeight={1.6} color="var(--cc-text-2)">
                  {gruppe.text}
                </Text>
              </Stack>
            </Reveal>
          );
        })}
      </Grid>

      {/*
        Ausschluss: links Icon, Titel und die Einleitung, rechts die drei
        Punkte, dazwischen eine senkrechte Haarlinie. Ab `lg` nebeneinander —
        darunter stapelt sich beides, und die Linie legt sich waagerecht
        dazwischen, damit die Trennung nicht verloren geht.
      */}
      <Reveal delay={220}>
        <Grid
          mt={{ base: 5, md: 6 }}
          templateColumns={{ base: "1fr", lg: "minmax(0, 380px) minmax(0, 1fr)" }}
          gap={{ base: 6, lg: 10 }}
          p={{ base: 5, md: 7 }}
          borderRadius="12px"
          border="1px solid rgba(248, 113, 113, 0.35)"
          bg="linear-gradient(180deg, rgba(30, 22, 24, 0.7), rgba(24, 29, 34, 0.7))"
          backdropFilter="blur(14px)"
        >
          <Stack spacing={4}>
            <Flex
              w="52px"
              h="52px"
              align="center"
              justify="center"
              borderRadius="12px"
              border="1px solid rgba(248, 113, 113, 0.35)"
              bg="rgba(248, 113, 113, 0.06)"
              color="var(--cc-danger)"
              aria-hidden
            >
              <Ban size={24} strokeWidth={1.5} />
            </Flex>

            <Heading as="h3" fontSize={{ base: "20px", md: "24px" }} fontWeight={600} letterSpacing="-0.01em">
              {fuerWen.ausschluss.titel}
            </Heading>

            <Text fontSize={{ base: "15px", md: "16px" }} lineHeight={1.6} color="var(--cc-text-2)">
              {fuerWen.ausschluss.einleitung}
            </Text>
          </Stack>

          <Stack
            as="ul"
            listStyleType="none"
            spacing={{ base: 3, md: 4 }}
            justify="center"
            pl={{ base: 0, lg: 10 }}
            pt={{ base: 5, lg: 0 }}
            borderTop={{ base: "1px solid rgba(248, 113, 113, 0.22)", lg: "none" }}
            borderLeft={{ base: "none", lg: "1px solid rgba(248, 113, 113, 0.22)" }}
          >
            {fuerWen.ausschluss.punkte.map((punkt) => (
              <Flex as="li" key={punkt} gap={3} align="flex-start">
                <Box aria-hidden flexShrink={0} mt="11px" w="14px" h="1px" bg="var(--cc-danger)" opacity={0.85} />
                <Text fontSize={{ base: "15px", md: "16px" }} lineHeight={1.6} color="var(--cc-text-2)">
                  {punkt}
                </Text>
              </Flex>
            ))}
          </Stack>
        </Grid>
      </Reveal>

      <Reveal delay={280}>
        <Flex justify="center" mt={{ base: 10, md: 12 }}>
          <BeitrittCta />
        </Flex>
      </Reveal>
    </Sektion>
  );
}
