"use client";

import { Button, Icon, Stack, Text } from "@chakra-ui/react";
import { LineChart } from "lucide-react";
import { useJournal } from "./JournalProvider";
import { Panel } from "./Panel";

/** Wird gezeigt, solange noch kein Trade im aktiven Konto liegt. */
export function EmptyState() {
  const { openAddTrade } = useJournal();

  return (
    <Panel>
      <Stack align="center" gap={4} py={10} textAlign="center">
        <Icon as={LineChart} boxSize={9} color="var(--cc-gold-light)" />
        <Stack gap={1.5}>
          <Text className="inter-semibold" fontSize="lg" color="var(--cc-text)" letterSpacing="-0.015em">
            Noch keine Trades
          </Text>
          <Text fontSize="sm" color="var(--cc-text-2)" maxW="32rem" lineHeight="1.6">
            Lade deinen Orders-Export hoch oder trag deinen ersten Trade von Hand ein. Danach findest du hier deine
            komplette Performance.
          </Text>
        </Stack>
        <Button onClick={openAddTrade} variant="gold">
          Trade hinzufügen
        </Button>
      </Stack>
    </Panel>
  );
}
