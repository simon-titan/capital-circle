"use client";

import { Box, Button } from "@chakra-ui/react";
import { NotebookPen, Plus } from "lucide-react";
import NextLink from "next/link";
import { CardValue, DashCard, Meta } from "./primitives";

/**
 * Journal-Aufforderung als normale Rasterkarte (Kunden-Mockup 09/2026).
 *
 * Vorher war das ein Band über die volle Breite unter dem Raster. In der Reihe
 * neben „Heute live“ und „Diese Woche“ steht es dort, wo man ohnehin nach dem
 * nächsten Schritt sucht — und die Reihe wird dreispaltig statt lückenhaft.
 */
export function JournalCard() {
  return (
    <DashCard label="Journal" labelId="dash-journal" icon={<NotebookPen size={17} strokeWidth={1.5} />}>
      <CardValue>Deinen letzten Trade erfassen.</CardValue>
      <Meta mt={2}>
        Halte dein Setup, deine Ausführung und das Ergebnis fest, solange es noch frisch ist.
      </Meta>
      <Box mt="auto" pt={5}>
        <Button
          as={NextLink}
          href="/trading-journal?neu=1"
          variant="line"
          w="100%"
          leftIcon={<Plus size={16} strokeWidth={2} />}
        >
          Trade erfassen
        </Button>
      </Box>
    </DashCard>
  );
}
