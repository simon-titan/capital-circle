"use client";

import { SimpleGrid } from "@chakra-ui/react";
import { Filter } from "lucide-react";
import type { ContentInsights } from "./types";
import { DistChart, SectionCard } from "./primitives";

export function ContentInsightsSection({ insights }: { insights: ContentInsights }) {
  return (
    <SectionCard title="Content-Insights" icon={<Filter size={16} />}>
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <DistChart title="Häufigster Pain-Point" dist={insights.biggestBlocker} />
        <DistChart title="Was am meisten versucht wurde" dist={insights.triedBefore} />
        <DistChart title="Bester Kanal — nach Leads" dist={insights.channelLeads} />
        <DistChart title="Bester Kanal — nach Closes" dist={insights.channelCloses} accent />
      </SimpleGrid>
    </SectionCard>
  );
}
