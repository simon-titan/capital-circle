"use client";

import { Box } from "@chakra-ui/react";

export function GoldGlowDivider() {
  return (
    <Box
      w="100%"
      h="1px"
      background="linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.55) 40%, rgba(212,175,55,0.55) 60%, transparent 100%)"
      boxShadow="0 0 20px rgba(212,175,55,0.22), 0 0 8px rgba(212,175,55,0.12)"
    />
  );
}
