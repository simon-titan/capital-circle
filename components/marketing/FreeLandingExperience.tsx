"use client";

import { Box, Button, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { FreeFunnelVideo } from "./FreeFunnelVideo";
import { EmreStats } from "./EmreStats";
import { FreeApplicationModal } from "./FreeApplicationModal";
import { FunnelEyebrow, FunnelFinePrint, FunnelHeadline, FunnelLead, GoldWord, rise } from "./funnel-ui";

/**
 * Client-Wrapper für die Free-Funnel-Landing-Page.
 * Verwaltet den Modal-State und stellt beide CTAs bereit.
 */
export function FreeLandingExperience() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Stack spacing={{ base: 12, md: 16 }} align="center" w="full">
        {/* Hero-Text + erster CTA */}
        <Stack spacing={6} maxW="720px" mx="auto" textAlign="center" align="center" {...rise(1)}>
          <FunnelEyebrow>Capital Circle Institut</FunnelEyebrow>

          <FunnelHeadline>
            Trete dem <GoldWord>inneren Zirkel</GoldWord> bei.
          </FunnelHeadline>

          <FunnelLead maxW="560px">
            Lerne in unserem kostenlosen 5-Tage-Onboarding, wie professionelles Trading wirklich funktioniert.
            Nur für ausgewählte Trader — Bewerbung in 3 kurzen Schritten.
          </FunnelLead>

          <Button
            variant="gold"
            size="lg"
            w={{ base: "full", sm: "auto" }}
            h="52px"
            px={10}
            fontSize="16px"
            onClick={() => setIsModalOpen(true)}
          >
            Jetzt bewerben — kostenlos
          </Button>

          <FunnelFinePrint>Keine Kreditkarte erforderlich · Kostenloser Kurs</FunnelFinePrint>
        </Stack>

        {/* Video */}
        <Box w="full" maxW="768px" mx="auto" {...rise(2)}>
          <FreeFunnelVideo />
        </Box>

        {/* Emre-Stats */}
        <EmreStats />

        {/* Zweiter, prominenterer CTA — Hero-Karte für den nächsten Schritt */}
        <Box w="full" maxW="768px" mx="auto" {...rise(8)}>
          <Stack
            className="cc-card cc-card--hero"
            spacing={3}
            align="center"
            textAlign="center"
            px={{ base: 5, md: 8 }}
            py={{ base: 7, md: 9 }}
          >
            <Button
              variant="gold"
              size="lg"
              w={{ base: "full", sm: "auto" }}
              h="56px"
              px={12}
              fontSize="17px"
              onClick={() => setIsModalOpen(true)}
            >
              Jetzt bewerben
            </Button>
            <Text fontSize="13px" color="var(--cc-text-2)">
              Bewerbung dauert unter 5 Minuten
            </Text>
          </Stack>
        </Box>
      </Stack>

      <FreeApplicationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
