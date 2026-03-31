"use client";

import { Box } from "@chakra-ui/react";

type SkyArchBackgroundProps = {
  children: React.ReactNode;
};

/** Vollflächiger Hintergrund wie Login — `public/bg/sky-arch.png` + Verlauf. */
export function SkyArchBackground({ children }: SkyArchBackgroundProps) {
  return (
    <Box position="relative" minH="100vh" w="full" overflow="hidden">
      <Box
        position="absolute"
        inset={0}
        bgImage="url(/bg/sky-arch.png)"
        bgSize="cover"
        bgPosition="center"
        bgRepeat="no-repeat"
      />
      <Box
        position="absolute"
        inset={0}
        bgGradient="linear(to-b, rgba(7, 8, 10, 0.42), rgba(7, 8, 10, 0.82))"
        pointerEvents="none"
      />
      <Box position="relative" zIndex={1} minH="100vh" w="full">
        {children}
      </Box>
    </Box>
  );
}
