"use client";

import { Box, Flex } from "@chakra-ui/react";
import { PlatformBackground } from "@/components/layout/PlatformBackground";
import { PlatformSidebar } from "./PlatformSidebar";
import { PlatformTopStrip } from "./PlatformTopStrip";

/**
 * Rahmen des Mitgliederbereichs: Leiste oben, Sidebar links, Inhalt rechts.
 * Als Client-Komponente, damit Emotion auf Server und Client dasselbe Markup
 * erzeugt (Chakra-Boxen direkt im Server-Layout führen zu Hydration-Fehlern).
 */
export function PlatformFrame({ children }: { children: React.ReactNode }) {
  return (
    <PlatformBackground>
      <Box minH="100vh" data-platform>
        <PlatformTopStrip />
        <Flex direction={{ base: "column", lg: "row" }}>
          <PlatformSidebar />
          <Box as="main" flex="1" minW={0} px={{ base: 4, md: 6, xl: 10 }} pt={{ base: 6, md: 8, lg: 12 }} pb={16}>
            {/* `cc-main-inner`: Anker für die breitere Journal-Ansicht in globals.css */}
            <Box className="cc-main-inner" maxW="1280px" mx="auto" w="100%">
              {children}
            </Box>
          </Box>
        </Flex>
      </Box>
    </PlatformBackground>
  );
}
