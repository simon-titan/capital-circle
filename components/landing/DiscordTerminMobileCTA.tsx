"use client";

import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { Lock } from "lucide-react";

/**
 * Discord-gebrandete Kopie der MobileCTAFooter (nur mobil, sticky unten).
 * Action-Grün #16cc9b, Cyan-Border/Glow auf Schwarz.
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
      sx={{
        background: "rgba(0,0,0,0.97)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(71,247,220,0.22)",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.60), 0 -1px 0 rgba(71,247,220,0.14)",
      }}
      px={4}
      pt={3}
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <Stack spacing={2.5}>
        <Button
          variant="unstyled"
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap={2}
          w="full"
          minH="52px"
          borderRadius="12px"
          fontWeight="600"
          fontSize="md"
          letterSpacing="0.03em"
          color="#000000"
          onClick={onApply}
          sx={{
            background: "linear-gradient(135deg, #16cc9b 0%, #5FE6C6 100%)",
            boxShadow:
              "0 0 28px rgba(22,204,155,0.40), 0 4px 16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.28)",
            transition: "all 220ms cubic-bezier(0.16, 1, 0.3, 1)",
            _hover: {
              background: "linear-gradient(135deg, #1AE0AC 0%, #82EFD6 100%)",
              boxShadow: "0 0 44px rgba(22,204,155,0.55), 0 4px 20px rgba(0,0,0,0.55)",
              transform: "translateY(-1px)",
            },
            _active: {
              transform: "translateY(0)",
              boxShadow: "0 0 16px rgba(22,204,155,0.30)",
            },
          }}
          className="inter-semibold"
        >
          <Lock size={15} strokeWidth={2.5} style={{ marginRight: 2 }} />
          {ctaPrimary}
        </Button>

        <HStack justify="center" spacing={4}>
          <Text fontSize="10px" color="rgba(255,255,255,0.32)" className="inter" letterSpacing="0.03em">
            Bewerbung &lt; 5 Min.
          </Text>
        </HStack>
      </Stack>
    </Box>
  );
}
