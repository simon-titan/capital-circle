"use client";

import { Box } from "@chakra-ui/react";

type PlatformBackgroundProps = {
  children: React.ReactNode;
};

/**
 * Nachtgrund des Mitgliederbereichs: Sternenfeld wie in den Marketing-Mockups
 * plus weiches Gold-Licht (Klassen in globals.css). Beide Ebenen liegen `fixed`
 * hinter dem Inhalt.
 *
 * `overflow-x: clip` statt `hidden`: `hidden` macht den Container zum
 * Scroll-Container, und dann kleben Leiste und Sidebar nicht mehr.
 */
export function PlatformBackground({ children }: PlatformBackgroundProps) {
  return (
    <Box position="relative" minH="100vh" w="full" bg="var(--cc-bg)" overflowX="clip">
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />
      <Box position="relative" zIndex={1}>
        {children}
      </Box>
    </Box>
  );
}
