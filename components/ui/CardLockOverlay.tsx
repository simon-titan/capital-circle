"use client";

import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";
import { Lock } from "lucide-react";
import NextLink from "next/link";
import { type ReactNode } from "react";

interface CardLockOverlayProps {
  /** Wenn true: Inhalt wird gesperrt angezeigt. */
  locked: boolean;
  children: ReactNode;
  /** Optionaler Text unter dem Titel. Default: generischer Hinweis. */
  description?: string;
}

/**
 * Inline-Paywall fuer einzelne Dashboard-Cards.
 *
 * - locked=false: Kinder werden normal gerendert.
 * - locked=true:  Kinder werden verschwommen im Hintergrund angezeigt
 *   (aria-hidden) und eine zentrierte Glasoverlay-Karte mit CTA
 *   erscheint absolut darueber.
 */
export function CardLockOverlay({
  locked,
  children,
  description = "Dieser Bereich ist exklusiv für vollwertige Capital Circle Mitglieder.",
}: CardLockOverlayProps) {
  if (!locked) return <>{children}</>;

  return (
    <Box position="relative" borderRadius="inherit" overflow="hidden">
      {/* Gesperrter Inhalt — sichtbar aber unklickbar */}
      <Box
        pointerEvents="none"
        userSelect="none"
        aria-hidden="true"
        filter="blur(3px)"
        opacity={0.45}
        sx={{ WebkitFilter: "blur(3px)" }}
      >
        {children}
      </Box>

      {/* Overlay — zentriert absolut ueber der Card */}
      <Flex
        position="absolute"
        inset={0}
        align="center"
        justify="center"
        px={{ base: 4, md: 6 }}
        borderRadius="inherit"
        bg="rgba(7, 8, 12, 0.52)"
        backdropFilter="blur(2px)"
        sx={{ WebkitBackdropFilter: "blur(2px)" }}
      >
        <Stack
          align="center"
          spacing={3}
          maxW="320px"
          textAlign="center"
          px={4}
          py={5}
          borderRadius="14px"
          bg="rgba(14, 16, 22, 0.82)"
          borderWidth="1px"
          borderColor="rgba(212, 175, 55, 0.38)"
          backdropFilter="blur(18px)"
          sx={{
            WebkitBackdropFilter: "blur(18px)",
            boxShadow:
              "0 0 0 1px rgba(212,175,55,0.12), 0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          {/* Gold-Divider */}
          <Box
            h="2px"
            w="48px"
            borderRadius="full"
            bg="linear-gradient(90deg, rgba(212,175,55,0) 0%, rgba(232,197,71,0.85) 50%, rgba(212,175,55,0) 100%)"
            boxShadow="0 0 10px rgba(212,175,55,0.3)"
          />

          {/* Lock-Icon */}
          <Flex
            align="center"
            justify="center"
            w="44px"
            h="44px"
            borderRadius="12px"
            bg="rgba(212, 175, 55, 0.12)"
            border="1px solid rgba(212, 175, 55, 0.38)"
          >
            <Lock size={20} strokeWidth={2} aria-hidden style={{ color: "rgba(212,175,55,0.9)" }} />
          </Flex>

          <Stack spacing={1}>
            <Text className="inter-semibold" fontSize="sm" color="var(--color-text-primary)">
              Nur für vollwertige Mitglieder
            </Text>
            <Text className="inter" fontSize="xs" color="rgba(255,255,255,0.52)" lineHeight="1.6">
              {description}
            </Text>
          </Stack>

          <Button
            as={NextLink}
            href="/bewerbung"
            size="sm"
            borderRadius="9px"
            w="full"
            bg="rgba(212, 175, 55, 0.22)"
            border="1px solid rgba(212, 175, 55, 0.48)"
            color="rgba(232, 197, 71, 0.95)"
            className="inter-semibold"
            fontSize="xs"
            _hover={{
              bg: "rgba(212, 175, 55, 0.32)",
              borderColor: "rgba(232, 197, 71, 0.65)",
              boxShadow: "0 0 16px rgba(212,175,55,0.22)",
            }}
          >
            Jetzt Mitglied werden
          </Button>
        </Stack>
      </Flex>
    </Box>
  );
}
