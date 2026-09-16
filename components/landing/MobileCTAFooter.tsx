"use client";

import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { Lock } from "lucide-react";
import { landingConfig } from "@/config/landing-config";

interface MobileCTAFooterProps {
  onApply: () => void;
  ctaPrimary?: string;
  trustLine?: string | null;
}

/** Fester CTA-Balken (nur mobil): Glas-Leiste mit Gold-Kante, Gold-Button. */
export function MobileCTAFooter({ onApply, ctaPrimary: ctaPrimaryOverride, trustLine }: MobileCTAFooterProps) {
  const { cta } = landingConfig;
  const resolvedPrimary = ctaPrimaryOverride ?? cta.primary;
  const hideTrust = trustLine === null;
  const trustLineFirst =
    hideTrust
      ? null
      : trustLine === undefined
        ? "Kostenlos · Keine Kreditkarte"
        : (trustLine ?? "");

  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      zIndex={1000}
      display={{ base: "block", md: "none" }}
      bg="var(--cc-bg-raised)"
      backdropFilter="blur(18px)"
      borderTop="1px solid rgba(212, 176, 128, 0.18)"
      boxShadow="0 -12px 32px rgba(0, 0, 0, 0.45)"
      px={4}
      pt={3}
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      {/* Gold-Lichtkante */}
      <Box
        aria-hidden
        position="absolute"
        top="-1px"
        left="16%"
        right="16%"
        h="1px"
        bg="linear-gradient(90deg, transparent, rgba(232, 192, 148, 0.7), transparent)"
      />
      <Stack spacing={2.5}>
        <Button
          variant="gold"
          w="full"
          h="52px"
          fontSize="16px"
          letterSpacing="0.02em"
          leftIcon={<Lock size={15} strokeWidth={2.25} />}
          onClick={onApply}
        >
          {resolvedPrimary}
        </Button>

        {!hideTrust && (
          <HStack justify="center" spacing={4}>
            {trustLineFirst ? (
              <>
                <Text fontSize="12px" color="var(--cc-text-3)">
                  {trustLineFirst}
                </Text>
                <Box aria-hidden w="1px" h="10px" bg="var(--cc-line-strong)" />
              </>
            ) : null}
            <Text fontSize="12px" color="var(--cc-text-3)" className="cc-num">
              Bewerbung &lt; 5 Min.
            </Text>
          </HStack>
        )}
      </Stack>
    </Box>
  );
}
