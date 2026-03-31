"use client";

import { Box, Text } from "@chakra-ui/react";

type VideoDescriptionProps = {
  description: string | null | undefined;
};

export function VideoDescription({ description }: VideoDescriptionProps) {
  const trimmed = description?.trim();
  if (!trimmed) return null;

  return (
    <Box mt={5}>
      <Text className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="var(--color-text-muted)" mb={2}>
        Beschreibung
      </Text>
      <Text className="inter" fontSize="sm" color="var(--color-text-primary)" lineHeight={1.65} whiteSpace="pre-wrap">
        {trimmed}
      </Text>
    </Box>
  );
}
