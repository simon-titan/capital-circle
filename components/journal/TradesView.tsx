"use client";

import { Stack } from "@chakra-ui/react";
import { KpiRow } from "./dashboard/KpiRow";
import { EmptyState } from "./EmptyState";
import { useJournal } from "./JournalProvider";
import { JournalSkeleton } from "./JournalSkeleton";
import { SectionCard } from "./SectionCard";
import { TradesTable } from "./TradesTable";

export function TradesView() {
  const { trades, summary, loading } = useJournal();

  if (loading && trades.length === 0) return <JournalSkeleton />;
  if (trades.length === 0) return <EmptyState />;

  return (
    <Stack gap={{ base: 3, md: 4 }}>
      <KpiRow summary={summary} />
      <SectionCard title="Alle Trades" hint={`${summary.tradeCount} gesamt`}>
        <TradesTable trades={trades} />
      </SectionCard>
    </Stack>
  );
}
