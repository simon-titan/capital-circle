"use client";

import { Box, Flex } from "@chakra-ui/react";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { PlatformBackground } from "@/components/layout/PlatformBackground";
import { GeheimhaltungPopup } from "./GeheimhaltungPopup";
import { LifetimePopup } from "./LifetimePopup";
import { PlatformSidebar } from "./PlatformSidebar";
import { PlatformTopStrip } from "./PlatformTopStrip";
import { UmzugBand } from "./UmzugBand";
import { useViewer, ViewerProvider } from "./viewer";

/**
 * Rahmen des Mitgliederbereichs: Leiste oben, Sidebar links, Inhalt rechts.
 * Als Client-Komponente, damit Emotion auf Server und Client dasselbe Markup
 * erzeugt (Chakra-Boxen direkt im Server-Layout führen zu Hydration-Fehlern).
 *
 * `ViewerProvider` holt das Profil einmal für die ganze Schale (Sidebar,
 * Hinweisband, Dashboard-Karte); Begründung im Kopf von `viewer.tsx`.
 */
/**
 * Kein Promo-Band (Apex, 90 % Rabatt) für **Free-Mitglieder** und im kostenlosen
 * Kurs (Feedback 14.11.2026). Die Höhe `--cc-strip-h` geht dann auf 0, sonst
 * ließen die klebende Seitenleiste und die klebenden Spalten des Kursplayers
 * oben 48 px Lücke.
 */
const OHNE_BAND = ["/kostenloses-training"];

export function PlatformFrame({ children }: { children: React.ReactNode }) {
  return (
    <ViewerProvider>
      <Rahmen>{children}</Rahmen>
    </ViewerProvider>
  );
}

/** Innerhalb des `ViewerProvider`, damit `isFree` das Band ausblenden kann. */
function Rahmen({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const viewer = useViewer();
  const ohneBand = viewer.isFree || OHNE_BAND.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return (
    <>
      <PlatformBackground>
        <Box minH="100vh" data-platform style={ohneBand ? ({ "--cc-strip-h": "0px" } as CSSProperties) : undefined}>
          {ohneBand ? null : <PlatformTopStrip />}
          <Flex direction={{ base: "column", lg: "row" }}>
            <PlatformSidebar />
            <Box as="main" flex="1" minW={0} px={{ base: 4, md: 6, xl: 10 }} pt={{ base: 6, md: 8, lg: 12 }} pb={16}>
              {/* `cc-main-inner`: Anker für die breitere Journal-Ansicht in globals.css */}
              <Box className="cc-main-inner" maxW="1280px" mx="auto" w="100%">
                {/*
                  Innerhalb der Inhaltsspalte, nicht über der ganzen Seite: So
                  trägt das Band dieselben Ränder wie der Inhalt, schiebt ihn
                  nach unten statt ihn zu überdecken und kann auf schmalen
                  Geräten keine seitliche Scrollleiste erzeugen.
                */}
                <UmzugBand />
                {children}
              </Box>
            </Box>
          </Flex>
        </Box>
        <LifetimePopup />
        <GeheimhaltungPopup />
      </PlatformBackground>
    </>
  );
}
