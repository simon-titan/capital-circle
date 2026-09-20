"use client";

import { Box, Button, Stack, Text } from "@chakra-ui/react";
import { ArrowRight } from "lucide-react";
import NextLink from "next/link";

/** „Noch kein Mitglied?“ unter dem Login: Glas-Karte mit Gold-Rand, der Knopf führt auf die Verkaufsseite. */
export function MitgliedWerdenCard() {
  return (
    <Box
      className="cc-card"
      p={{ base: 4, md: 5 }}
      w="full"
      maxW="360px"
      mt={10}
      style={{ borderColor: "rgba(212, 176, 128, 0.38)" }}
    >
      <Stack spacing={3} textAlign="center">
        <Text fontWeight={600} fontSize="16px" color="var(--cc-text)" lineHeight={1.45}>
          Noch kein Mitglied?
        </Text>
        <Button
          as={NextLink}
          href="/"
          variant="gold"
          w="full"
          h="48px"
          fontSize="16px"
          rightIcon={<ArrowRight size={16} strokeWidth={2.25} />}
        >
          Capital Circle beitreten
        </Button>
      </Stack>
    </Box>
  );
}
