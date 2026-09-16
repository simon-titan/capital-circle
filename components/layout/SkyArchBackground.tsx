"use client";

import { Box } from "@chakra-ui/react";

type SkyArchBackgroundProps = {
  children: React.ReactNode;
};

/**
 * Vollflächiger Grund für Einstieg, Login und Onboarding (DESIGN.md v3.2):
 * Graphit mit Sternenfeld und Champagner-Licht (`.cc-stars`, `.cc-goldlight`,
 * beide `fixed` hinter dem Inhalt). Der Name stammt vom früheren Landschaftsbild
 * und bleibt für bestehende Imports.
 *
 * `overflow-x: clip` statt `hidden`, damit `position: sticky` im Inhalt greift.
 */
export function SkyArchBackground({ children }: SkyArchBackgroundProps) {
  return (
    <Box position="relative" minH="100vh" w="full" bg="var(--cc-bg)" overflowX="clip">
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />
      <Box position="relative" zIndex={1} minH="100vh" w="full">
        {children}
      </Box>
    </Box>
  );
}
