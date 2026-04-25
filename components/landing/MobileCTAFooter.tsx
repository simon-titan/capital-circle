"use client";

import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { Lock } from "lucide-react";
import { landingConfig } from "@/config/landing-config";

interface MobileCTAFooterProps {
  onApply: () => void;
}

export function MobileCTAFooter({ onApply }: MobileCTAFooterProps) {
  const { cta } = landingConfig;

  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      zIndex={1000}
      display={{ base: "block", md: "none" }}
      sx={{
        background: "rgba(7, 8, 10, 0.97)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(212,175,55,0.20)",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.50), 0 -1px 0 rgba(212,175,55,0.12)",
      }}
      px={4}
      pt={3}
      pb="env(safe-area-inset-bottom, 12px)"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <Stack spacing={2.5}>
        {/* CTA button */}
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
          color="#07080A"
          onClick={onApply}
          sx={{
            background: "linear-gradient(135deg, #E8C547 0%, #D4AF37 50%, #A67C00 100%)",
            boxShadow:
              "0 0 28px rgba(212,175,55,0.30), 0 4px 16px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.22)",
            transition: "all 220ms cubic-bezier(0.16, 1, 0.3, 1)",
            _hover: {
              background: "linear-gradient(135deg, #F0DC82 0%, #E8C547 50%, #D4AF37 100%)",
              boxShadow: "0 0 40px rgba(212,175,55,0.45), 0 4px 20px rgba(0,0,0,0.40)",
              transform: "translateY(-1px)",
            },
            _active: {
              transform: "translateY(0)",
              boxShadow: "0 0 16px rgba(212,175,55,0.20)",
            },
          }}
          className="inter-semibold"
        >
          <Lock size={15} strokeWidth={2.5} style={{ marginRight: 2 }} />
          {cta.primary}
        </Button>

        {/* Trust row */}
        <HStack justify="center" spacing={4}>
          <Text fontSize="10px" color="rgba(255,255,255,0.32)" className="inter" letterSpacing="0.03em">
            Kostenlos · Keine Kreditkarte
          </Text>
          <Box w="1px" h="10px" bg="rgba(255,255,255,0.12)" />
          <Text fontSize="10px" color="rgba(255,255,255,0.32)" className="inter" letterSpacing="0.03em">
            Bewerbung &lt; 5 Min.
          </Text>
        </HStack>
      </Stack>
    </Box>
  );
}
