"use client";

import { Box, Button, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { glassPrimaryButtonProps } from "@/components/ui/glassButtonStyles";
import { FreeFunnelVideo } from "./FreeFunnelVideo";
import { EmreStats } from "./EmreStats";
import { FreeApplicationModal } from "./FreeApplicationModal";

/**
 * Client-Wrapper für die Free-Funnel-Landing-Page.
 * Verwaltet den Modal-State und stellt beide CTAs bereit.
 */
export function FreeLandingExperience() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Stack spacing={{ base: 10, md: 16 }} align="center" w="full">
        {/* Hero-Text + erster CTA */}
        <Stack spacing={6} maxW="680px" mx="auto" textAlign="center" align="center">
          <Text
            fontSize="xs"
            letterSpacing="0.22em"
            textTransform="uppercase"
            color="var(--color-accent-gold)"
            className="inter-semibold"
          >
            Capital Circle Institut
          </Text>

          <Text
            as="h1"
            className="radley-regular"
            fontWeight={400}
            fontSize={{ base: "3xl", md: "5xl" }}
            lineHeight="1.1"
            color="var(--color-text-primary)"
          >
            Trete dem inneren Zirkel bei.
          </Text>

          <Text
            fontSize={{ base: "md", md: "lg" }}
            color="rgba(255,255,255,0.62)"
            className="inter"
            maxW="520px"
          >
            Lerne in unserem kostenlosen 5-Tage-Onboarding, wie professionelles Trading wirklich funktioniert.
            Nur für ausgewählte Trader — Bewerbung in 3 kurzen Schritten.
          </Text>

          <Button
            {...glassPrimaryButtonProps}
            w={{ base: "full", sm: "auto" }}
            px={10}
            minH="52px"
            fontSize="md"
            onClick={() => setIsModalOpen(true)}
          >
            Jetzt bewerben — kostenlos
          </Button>

          <Text fontSize="xs" color="rgba(255,255,255,0.30)" className="inter">
            Keine Kreditkarte erforderlich · Kostenloser Kurs
          </Text>
        </Stack>

        {/* Video */}
        <Box w="full" maxW="768px" mx="auto">
          <FreeFunnelVideo />
        </Box>

        {/* Emre-Stats */}
        <EmreStats />

        {/* Zweiter, prominenterer CTA */}
        <Stack spacing={3} align="center" textAlign="center">
          <Button
            {...glassPrimaryButtonProps}
            w={{ base: "full", sm: "auto" }}
            px={12}
            minH="56px"
            fontSize="lg"
            onClick={() => setIsModalOpen(true)}
          >
            Jetzt bewerben
          </Button>
          <Text fontSize="xs" color="rgba(255,255,255,0.30)" className="inter">
            Bewerbung dauert unter 5 Minuten
          </Text>
        </Stack>
      </Stack>

      <FreeApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
