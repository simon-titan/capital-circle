"use client";

import { Box, Button, Stack, Text } from "@chakra-ui/react";
import { ArrowRight } from "lucide-react";
import NextLink from "next/link";
import { useJournal } from "../JournalProvider";
import { SectionCard } from "../SectionCard";
import { TradesTable } from "../TradesTable";
import { StarterChecklist } from "./StarterChecklist";

/**
 * Journal-Home. Bewusst schlank: Das Journal dreht sich nur um Trades,
 * Auswertung und Verbesserung. Die Apex-Werbung wohnt seit 25.09.2026 unter
 * Tools → Propfirms, die YouTube-Leiste ist ersatzlos entfallen. An ihrer
 * Stelle stehen die letzten Trades — ein Klick führt direkt in den Eintrag.
 */
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

      {trades.length > 0 ? (
        <SectionCard
          title="Letzte Trades"
          action={
            <Button
              as={NextLink}
              href="/trading-journal/trades"
              size="xs"
              variant="ghost"
              color="var(--cc-text-2)"
              rightIcon={<ArrowRight size={13} />}
              _hover={{ color: "var(--cc-gold-light)", bg: "transparent" }}
            >
              Alle Trades
            </Button>
          }
        >
          <TradesTable trades={trades} limit={5} />
        </SectionCard>
      ) : null}
    </Stack>
  );
}
