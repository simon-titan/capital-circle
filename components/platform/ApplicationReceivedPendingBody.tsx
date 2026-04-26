"use client";

import { Box, Button, Stack, Text } from "@chakra-ui/react";
import { glassPrimaryButtonProps } from "@/components/ui/glassButtonStyles";

/** Nur im CTA — nicht in den Fließtext duplizieren. */
export const TELEGRAM_COMMUNITY_URL = "https://t.me/capitalcircletrading" as const;

/**
 * Inhalt nach eingegangener Free-Bewerbung (Plattform + Modal).
 * Keine URL im sichtbaren Text — nur im Button.
 */
export function ApplicationReceivedPendingBody() {
  return (
    <Stack spacing={4} w="full" textAlign="left" className="inter">
      <Text fontSize="md" color="rgba(255,255,255,0.75)" lineHeight="1.6">
        Ich lese jede Bewerbung persönlich. Wenn du der richtige Fit bist, melde ich mich
        in den nächsten 24–48 Stunden direkt bei dir.
      </Text>
      <Text fontSize="md" color="rgba(255,255,255,0.75)" lineHeight="1.6">
        Bis dahin – falls du noch nicht in meiner Telegram-Gruppe bist:
      </Text>
      <Text fontSize="md" color="rgba(255,255,255,0.75)" lineHeight="1.6">
        Jeden Tag kostenlose Marktanalysen, Weekly Outlooks und Trade Recaps. Direkt von
        mir.
      </Text>
      <Box pt={1}>
        <Button
          as="a"
          href={TELEGRAM_COMMUNITY_URL}
          target="_blank"
          rel="noopener noreferrer"
          {...glassPrimaryButtonProps}
        >
          Hier kostenlos beitreten
        </Button>
      </Box>
      <Text fontSize="md" color="rgba(255,255,255,0.75)" lineHeight="1.6" pt={1}>
        Jeder Tag ohne System kostet dich.
      </Text>
    </Stack>
  );
}
