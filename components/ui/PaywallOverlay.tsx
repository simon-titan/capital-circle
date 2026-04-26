"use client";

import { type ReactNode } from "react";
import { Box, Text } from "@chakra-ui/react";
import { Lock } from "lucide-react";

interface PaywallOverlayProps {
  active: boolean;
  children: ReactNode;
}

export function PaywallOverlay({ active, children }: PaywallOverlayProps) {
  if (!active) return <>{children}</>;

  return (
    <div style={{ position: "relative" }}>
      {/* Page content — visible but completely non-interactive */}
      <div
        style={{ pointerEvents: "none", userSelect: "none" }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Dimming layer */}
      <Box
        position="fixed"
        inset={0}
        bg="rgba(7, 8, 10, 0.55)"
        zIndex={9998}
        pointerEvents="none"
      />

      {/* Lock badge */}
      <Box
        role="status"
        aria-label="Nur für vollwertige Member"
        position="fixed"
        left="50%"
        top="50%"
        transform="translate(-50%, -50%)"
        zIndex={9999}
        pointerEvents="none"
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={3}
        sx={{ animation: "paywall-enter 0.35s ease-out both" }}
      >
        <Box
          p={4}
          borderRadius="full"
          bg="rgba(212, 175, 55, 0.12)"
          border="1px solid rgba(212, 175, 55, 0.35)"
          boxShadow="0 0 32px rgba(212, 175, 55, 0.15)"
        >
          <Lock size={32} color="rgba(212, 175, 55, 0.9)" strokeWidth={1.8} />
        </Box>
        <Text
          className="inter-semibold"
          fontSize="sm"
          color="var(--color-text-primary)"
          textAlign="center"
        >
          Nur für vollwertige Member
        </Text>
      </Box>
    </div>
  );
}
