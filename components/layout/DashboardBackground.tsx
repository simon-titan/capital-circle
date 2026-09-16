"use client";

import { Box } from "@chakra-ui/react";

type DashboardBackgroundProps = {
  children: React.ReactNode;
};

/**
 * Vollflächiger Grund (DESIGN.md v3.2): Graphit mit Sternenfeld und
 * Champagner-Licht — derselbe Himmel wie `PlatformBackground`. Ersetzt das
 * frühere Hintergrundbild `public/bg/dashboard.png`; die Props bleiben gleich.
 *
 * `overflow-x: clip` statt `hidden`, damit `position: sticky` im Inhalt greift.
 */
export function DashboardBackground({ children }: DashboardBackgroundProps) {
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
