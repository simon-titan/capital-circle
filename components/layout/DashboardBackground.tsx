"use client";

import { Box } from "@chakra-ui/react";

type DashboardBackgroundProps = {
  children: React.ReactNode;
};

/** Vollflächiger Hintergrund für die Plattform — `public/bg/dashboard.png` + dunkler Verlauf für Lesbarkeit. */
export function DashboardBackground({ children }: DashboardBackgroundProps) {
  return (
    <Box position="relative" minH="100vh" w="full" overflow="hidden">
      <Box
        position="absolute"
        inset={0}
        bgImage="url(/bg/dashboard.png)"
        bgSize="cover"
        bgPosition="center"
        bgRepeat="no-repeat"
      />
      <Box
        position="absolute"
        inset={0}
        bgGradient="linear(to-b, rgba(7, 8, 10, 0.58), rgba(7, 8, 10, 0.9))"
        pointerEvents="none"
      />
      <Box position="relative" zIndex={1} minH="100vh" w="full">
        {children}
      </Box>
    </Box>
  );
}
