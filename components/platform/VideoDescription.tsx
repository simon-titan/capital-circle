"use client";

import { Text } from "@chakra-ui/react";

type VideoDescriptionProps = {
  description: string | null | undefined;
};

export function VideoDescription({ description }: VideoDescriptionProps) {
  const trimmed = description?.trim();
  if (!trimmed) return null;

  return (
    <Text fontSize="15px" color="var(--cc-text-soft)" lineHeight={1.7} whiteSpace="pre-wrap" maxW="75ch">
      {trimmed}
    </Text>
  );
}
