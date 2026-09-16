"use client";

import { Box, Flex } from "@chakra-ui/react";
import { AddTradeModal } from "./AddTradeModal";
import { JournalProvider, useJournal } from "./JournalProvider";
import { JournalSidebar } from "./JournalSidebar";

/**
 * Rahmen des neuen Journals: linke Sub-Navigation plus Inhalt. Die
 * Plattform-TopBar bleibt darüber bestehen.
 *
 * Provider und Modal leben hier im Layout, damit Konto-Auswahl und geladene
 * Trades den Wechsel zwischen den Tabs überstehen.
 *
 * `data-journal-wide` ist der Anker, an dem `app/globals.css` per `:has()` die
 * 1200-px-Grenze des Plattform-Containers auf 1600 px anhebt — nur hier.
 */
function Chrome({ children }: { children: React.ReactNode }) {
  const { activeAccountId, addTradeOpen, closeAddTrade, reload } = useJournal();

  return (
    <>
      <Flex data-journal-wide gap={{ base: 5, lg: 8 }} align="flex-start" direction={{ base: "column", lg: "row" }} w="100%">
        <JournalSidebar />
        <Box flex="1" minW={0} w="100%" maxW="100%">
          {children}
        </Box>
      </Flex>

      {activeAccountId && (
        <AddTradeModal
          isOpen={addTradeOpen}
          onClose={closeAddTrade}
          accountId={activeAccountId}
          onImported={() => void reload()}
        />
      )}
    </>
  );
}

export function JournalChrome({ children }: { children: React.ReactNode }) {
  return (
    <JournalProvider>
      <Chrome>{children}</Chrome>
    </JournalProvider>
  );
}
