"use client";

import { Box } from "@chakra-ui/react";

/** Champagner-Lichtlinie zwischen Abschnitten: blendet an den Enden aus, leuchtet leicht. */
export function GoldGlowDivider() {
  return (
    <Box
      aria-hidden
      w="100%"
      maxW="1200px"
      mx="auto"
      h="1px"
      bg="linear-gradient(90deg, transparent 0%, rgba(232, 192, 148, 0.5) 50%, transparent 100%)"
      boxShadow="0 0 18px rgba(212, 176, 128, 0.22)"
    />
  );
}
