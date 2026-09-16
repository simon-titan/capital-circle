"use client";

import { Box, Button, Stack, Text } from "@chakra-ui/react";
import { Lock } from "lucide-react";

/**
 * Feste CTA-Leiste der Funnel-Seiten (nur mobil, unten): Glas-Leiste mit
 * Gold-Oberkante und Gold-Verlauf-Button (DESIGN.md v3.2).
 */
export function DiscordTerminMobileCTA({
  onApply,
  ctaPrimary = "ZUGANG BEANTRAGEN",
}: {
  onApply: () => void;
  ctaPrimary?: string;
}) {
  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      zIndex={1000}
      display={{ base: "block", md: "none" }}
      bg="var(--cc-bg-raised)"
      borderTop="1px solid rgba(212, 176, 128, 0.18)"
      boxShadow="0 -12px 32px rgba(0, 0, 0, 0.35)"
      sx={{
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
      px={4}
      pt={3}
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <Stack spacing={2.5}>
        <Button
          variant="gold"
          w="full"
          h="52px"
          fontSize="16px"
          letterSpacing="0.03em"
          leftIcon={<Lock size={15} strokeWidth={2.25} aria-hidden />}
          onClick={onApply}
        >
          {ctaPrimary}
        </Button>

        <Text fontSize="11px" color="var(--cc-text-3)" textAlign="center" letterSpacing="0.03em">
          Bewerbung &lt; 5 Min.
        </Text>
      </Stack>
    </Box>
  );
}
