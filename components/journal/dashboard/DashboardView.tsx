"use client";

import { Grid, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useMemo } from "react";
import {
  cumulativeEquity,
  dailyCumulative,
  dailyPnl,
  drawdown,
  MIN_TRADES_FOR_SCORE,
  performanceScore,
} from "@/lib/journal/metrics";
import { AreaChart } from "../charts/AreaChart";
import { BarChart } from "../charts/BarChart";
import { CHART_COLORS, RGB } from "../charts/chartSetup";
import { RadarChart } from "../charts/RadarChart";
import { EmptyState } from "../EmptyState";
import { formatMoney, pnlColor } from "../format";
import { useJournal } from "../JournalProvider";
import { JournalSkeleton } from "../JournalSkeleton";
import { Panel } from "../Panel";
import { PnlCalendar } from "../PnlCalendar";
import { SectionCard } from "../SectionCard";
import { TradesTable } from "../TradesTable";
import { KpiRow } from "./KpiRow";

export function DashboardView() {
  const { trades, metricTrades, summary, loading } = useJournal();

  const days = useMemo(() => dailyPnl(metricTrades), [metricTrades]);
  const cumulative = useMemo(() => dailyCumulative(metricTrades), [metricTrades]);
  const dd = useMemo(() => drawdown(cumulativeEquity(metricTrades)), [metricTrades]);
  const score = useMemo(() => performanceScore(metricTrades), [metricTrades]);

  if (loading && trades.length === 0) return <JournalSkeleton />;
  if (trades.length === 0) return <EmptyState />;

  return (
    <Stack gap={{ base: 3, md: 4 }}>
      <KpiRow summary={summary} />

      <Grid templateColumns={{ base: "1fr", xl: "340px 1fr" }} gap={{ base: 3, md: 4 }}>
        <SectionCard
          title="Performance Score"
          action={
            <HStack align="baseline" gap={1}>
              <Text className="cc-num" fontSize="2xl" fontWeight={600} color="var(--cc-gold-light)" lineHeight="1" letterSpacing="-0.02em">
                {score.total ?? "—"}
              </Text>
              <Text fontSize="xs" color="var(--cc-text-3)">
                /100
              </Text>
            </HStack>
          }
        >
          {score.total === null && (
            <Text fontSize="xs" color="var(--cc-text-3)" mb={3}>
              Ab {MIN_TRADES_FOR_SCORE} Trades aussagekräftig.
            </Text>
          )}
          <RadarChart axes={score.axes} />
        </SectionCard>

        {/*
         * Die Equity-Kurve ist gold, nicht grün/rot: sie zeigt einen Verlauf, kein
         * Ergebnis. Grün und Rot bleiben den Tagesbalken und dem Drawdown, wo das
         * Vorzeichen tatsächlich die Aussage ist.
         */}
        <SectionCard title="Kumulierte Netto-P&amp;L" hint={formatMoney(summary.netPnl)}>
          <AreaChart
            points={cumulative}
            height={{ base: "230px", md: "340px" }}
            color={CHART_COLORS.accent}
            rgb={RGB.accent}
          />
        </SectionCard>
      </Grid>

      <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr" }} gap={{ base: 3, md: 4 }}>
        <SectionCard title="Tägliche Netto-P&amp;L" hint={`${summary.tradingDays} Tage`}>
          <BarChart days={days} height={{ base: "210px", md: "260px" }} />
        </SectionCard>

        <SectionCard title="Drawdown" hint={formatMoney(-dd.maxAbsolute)}>
          <AreaChart points={dd.series} height={{ base: "210px", md: "260px" }} color={CHART_COLORS.loss} rgb={RGB.loss} />
          <Text fontSize="xs" color="var(--cc-text-3)" mt={3}>
            Größter Rückgang vom laufenden Höchststand
            {dd.maxPercent > 0 && ` · ${dd.maxPercent.toFixed(1)} %`}
          </Text>
        </SectionCard>
      </Grid>

      <SectionCard title="Letzte Trades" hint={`${summary.tradeCount} gesamt`}>
        <TradesTable trades={trades} limit={8} />
      </SectionCard>

      <SectionCard title="Kalender" padded={false}>
        <PnlCalendar trades={metricTrades} />
      </SectionCard>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={{ base: 3, md: 4 }}>
        <StatTile
          label="Bester Trade"
          value={formatMoney(summary.bestTrade)}
          color={pnlColor(summary.bestTrade)}
          hint={`Ø Gewinn ${formatMoney(summary.avgWin)}`}
        />
        <StatTile
          label="Anzahl Trades"
          value={String(summary.tradeCount)}
          color="var(--cc-text)"
          hint={`Ø ${formatMoney(summary.expectancy)} je Trade`}
        />
        <StatTile
          label="Schlechtester Trade"
          value={formatMoney(summary.worstTrade)}
          color={pnlColor(summary.worstTrade)}
          hint={`Ø Verlust ${formatMoney(summary.avgLoss)}`}
        />
      </SimpleGrid>
    </Stack>
  );
}

function StatTile({ label, value, color, hint }: { label: string; value: string; color: string; hint?: string }) {
  return (
    <Panel>
      <Stack gap={1.5}>
        <Text fontSize="xs" color="var(--cc-text-2)" className="inter-medium">
          {label}
        </Text>
        <Text className="cc-num" fontSize={{ base: "xl", md: "2xl" }} color={color} letterSpacing="-0.02em" lineHeight="1.1">
          {value}
        </Text>
        {hint && (
          <Text fontSize="xs" color="var(--cc-text-3)" className="cc-num">
            {hint}
          </Text>
        )}
      </Stack>
    </Panel>
  );
}
