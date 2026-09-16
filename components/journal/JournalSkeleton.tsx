"use client";

import { Box, Grid, Stack } from "@chakra-ui/react";
import { Panel } from "./Panel";

/**
 * Platzhalter für den ersten Ladevorgang. Beim Nachladen (z. B. nach einem
 * Import) wird er NICHT gezeigt — dort bleibt die vorige Darstellung stehen,
 * damit nichts springt.
 */
export function JournalSkeleton() {
  return (
    <Stack gap={{ base: 3, md: 4 }} aria-busy aria-label="Lädt">
      <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", xl: "minmax(250px, 1.25fr) repeat(4, 1fr)" }} gap={{ base: 3, md: 4 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <Panel key={i}>
            <Box h="88px" />
          </Panel>
        ))}
      </Grid>
      <Grid templateColumns={{ base: "1fr", xl: "340px 1fr" }} gap={{ base: 3, md: 4 }}>
        <Panel>
          <Box h="300px" />
        </Panel>
        <Panel>
          <Box h="300px" />
        </Panel>
      </Grid>
    </Stack>
  );
}
