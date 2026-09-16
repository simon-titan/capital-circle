"use client";

import { Box, Button, HStack, Icon, Stack, Text } from "@chakra-ui/react";
import { Check, Circle } from "lucide-react";
import { Panel } from "../Panel";

/**
 * Erste Schritte. Der Haken setzt sich, sobald mindestens ein Trade im aktiven
 * Konto liegt — kein separater Zustand in der Datenbank nötig.
 */
export function StarterChecklist({ done, onAddTrade }: { done: boolean; onAddTrade: () => void }) {
  return (
    <Panel>
      <HStack justify="space-between" align="center" gap={4} flexWrap="wrap">
        <HStack gap={3.5} align="center">
          <Box
            w="28px"
            h="28px"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg={done ? "rgba(34,197,94,0.14)" : "transparent"}
            border="1px solid"
            borderColor={done ? "rgba(34,197,94,0.5)" : "var(--j-line-strong)"}
            flexShrink={0}
          >
            <Icon
              as={done ? Check : Circle}
              boxSize={done ? 4 : 2.5}
              color={done ? "var(--color-profit)" : "var(--cc-text-3)"}
            />
          </Box>

          <Stack gap={0.5}>
            <Text
              className="inter-semibold"
              fontSize="sm"
              color="var(--cc-text)"
              textDecoration={done ? "line-through" : "none"}
              opacity={done ? 0.6 : 1}
            >
              Fang jetzt an, deinen ersten Trade zu journalieren
            </Text>
            <Text fontSize="xs" color="var(--cc-text-3)">
              {done
                ? "Erledigt — deine Auswertung findest du im Dashboard."
                : "Lade deinen Orders-Export hoch oder trag einen Trade von Hand ein."}
            </Text>
          </Stack>
        </HStack>

        {!done && (
          <Button size="sm" variant="gold" onClick={onAddTrade} flexShrink={0}>
            Jetzt starten
          </Button>
        )}
      </HStack>
    </Panel>
  );
}
