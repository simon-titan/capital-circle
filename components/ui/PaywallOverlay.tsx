"use client";

import { type ReactNode } from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { Lock } from "lucide-react";
import NextLink from "next/link";

interface PaywallOverlayProps {
  active: boolean;
  children: ReactNode;
}

/**
 * Seiten-Paywall (v3.2): Der Seiteninhalt bleibt sichtbar, ist aber `inert`.
 * Darüber liegt ein ruhiger Graphit-Schleier; mittig eine Glas-Karte mit
 * Champagner-Schloss und Gold-Button zur Bewerbung. Sidebar und Navigation
 * liegen außerhalb und bleiben bedienbar (der Schleier lässt Klicks durch).
 */
export function PaywallOverlay({ active, children }: PaywallOverlayProps) {
  if (!active) return <>{children}</>;

  return (
    <div style={{ position: "relative" }}>
      {/* Seiteninhalt — sichtbar, aber weder klick- noch fokussierbar */}
      <div inert aria-hidden="true" style={{ pointerEvents: "none", userSelect: "none" }}>
        {children}
      </div>

      {/* Graphit-Schleier */}
      <Box position="fixed" inset={0} bg="rgba(18, 23, 28, 0.62)" zIndex={9998} pointerEvents="none" />

      {/* Hinweis-Karte */}
      <Box
        position="fixed"
        left="50%"
        top="50%"
        transform="translate(-50%, -50%)"
        zIndex={9999}
        w="min(340px, calc(100vw - 32px))"
        sx={{ animation: "paywall-enter 0.35s var(--cc-ease) both" }}
      >
        <Flex
          className="cc-card cc-card--still"
          direction="column"
          align="center"
          gap={4}
          textAlign="center"
          px={6}
          py={7}
        >
          <Flex
            align="center"
            justify="center"
            w="56px"
            h="56px"
            borderRadius="full"
            bg="var(--cc-gold-wash)"
            border="1px solid rgba(212, 176, 128, 0.4)"
            color="var(--cc-gold-light)"
            boxShadow="0 0 28px rgba(212, 176, 128, 0.2)"
          >
            <Lock size={24} strokeWidth={1.75} aria-hidden />
          </Flex>
          <Text role="status" fontSize="16px" fontWeight={600} color="var(--cc-text)">
            Nur für vollwertige Member
          </Text>
          <Button as={NextLink} href="/bewerbung" variant="gold" w="full">
            Jetzt Mitglied werden
          </Button>
        </Flex>
      </Box>
    </div>
  );
}
