"use client";

import { Box } from "@chakra-ui/react";

type PlatformBackgroundProps = {
  children: React.ReactNode;
};

/** Vollflächiger Hintergrund für die Plattform — `public/bg/landscape.png` + dunkler Verlauf für Lesbarkeit. */
export function PlatformBackground({ children }: PlatformBackgroundProps) {
  return (
    <Box position="relative" minH="100vh" w="full" overflow="hidden">
      <Box
        position="fixed"
        inset={0}
        zIndex={0}
        bgImage="url(/bg/landscape.png)"
        bgSize="cover"
        bgPosition="center"
        bgRepeat="no-repeat"
      />
      <Box
        position="fixed"
        inset={0}
        zIndex={0}
        bgGradient="linear(to-b, rgba(10, 9, 6, 0.78), rgba(6, 6, 8, 0.92))"
        pointerEvents="none"
      />
      <Box position="relative" zIndex={1} minH="100vh" w="full">
        {children}
      </Box>
    </Box>
  );
}
