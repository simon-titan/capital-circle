"use client";

import { Box, Stack, Text } from "@chakra-ui/react";
import { useJournal } from "../JournalProvider";
import { ApexPromoCard } from "./ApexPromoCard";
import { StarterChecklist } from "./StarterChecklist";
import { YoutubeCarousel } from "./YoutubeCarousel";

export function HomeView({ firstName }: { firstName: string }) {
  const { trades, loading, openAddTrade } = useJournal();

  return (
    <Stack gap={{ base: 4, md: 5 }}>
      <Stack gap={2} mb={{ base: 1, md: 2 }} className="cc-rise">
        <Box
          as="h1"
          fontSize={{ base: "28px", md: "36px" }}
          fontWeight={600}
          letterSpacing="-0.01em"
          lineHeight={1.15}
          color="var(--cc-text)"
        >
          Willkommen zurück,{" "}
          <Box as="span" color="var(--cc-gold-light)">
            {firstName}
          </Box>
        </Box>
        <Text fontSize={{ base: "15px", md: "16px" }} color="var(--cc-text-2)" maxW="44rem" lineHeight={1.6}>
          Importiere deine Orders und sieh, was deine Zahlen dir sagen.
        </Text>
      </Stack>

      {!loading && <StarterChecklist done={trades.length > 0} onAddTrade={openAddTrade} />}

      <ApexPromoCard />

      <YoutubeCarousel />
    </Stack>
  );
}
