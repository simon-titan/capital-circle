"use client";

import { Box, Grid, HStack, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useMemo } from "react";
import { orderChrono, summarize } from "@/lib/journal/metrics";
import { Sparkline } from "./charts/Sparkline";
import { EmptyState } from "./EmptyState";
import { formatDateLong, formatMoney, formatPercent, formatRatio, pnlColor } from "./format";
import { JournalSkeleton } from "./JournalSkeleton";
import { toMetricTrade, useJournal } from "./JournalProvider";
import { Panel } from "./Panel";
import type { JournalTradeRow } from "./types";

/**
 * Ein Block pro Handelstag: Intraday-Verlauf plus dieselben Kennzahlen wie im
 * Dashboard, nur auf diesen Tag gerechnet.
 */
export function DayView() {
  const { trades, loading } = useJournal();

  const days = useMemo(() => {
    const grouped = new Map<string, JournalTradeRow[]>();
    for (const trade of trades) {
      const bucket = grouped.get(trade.trade_date);
      if (bucket) bucket.push(trade);
      else grouped.set(trade.trade_date, [trade]);
    }
    return [...grouped.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, rows]) => {
        const metricTrades = orderChrono(rows.map(toMetricTrade));
        let running = 0;
        const equity = metricTrades.map((t) => (running += t.pnl));
        return { date, summary: summarize(metricTrades), equity };
      });
  }, [trades]);

  if (loading && trades.length === 0) return <JournalSkeleton />;
  if (trades.length === 0) return <EmptyState />;

  return (
    <Stack gap={{ base: 3, md: 4 }}>
      {days.map(({ date, summary, equity }) => {
        const positive = summary.netPnl >= 0;
        return (
          <Panel key={date} p={{ base: 4, md: 6 }}>
            <Grid templateColumns={{ base: "1fr", lg: "240px 1fr" }} gap={{ base: 4, lg: 8 }} alignItems="center">
              <Stack gap={1.5}>
                <Text fontSize="xs" className="inter-medium" color="var(--cc-text-2)">
                  {formatDateLong(date)}
                </Text>
                <Text
                  className="cc-num"
                  fontSize={{ base: "1.75rem", md: "2rem" }}
                  color={pnlColor(summary.netPnl)}
                  lineHeight="1"
                  letterSpacing="-0.03em"
                >
                  {formatMoney(summary.netPnl)}
                </Text>
                <Box mt={2}>
                  <Sparkline values={equity} positive={positive} />
                </Box>
              </Stack>

              <SimpleGrid columns={{ base: 2, sm: 3, xl: 5 }} gap={{ base: 3, md: 5 }} sx={{ fontVariantNumeric: "tabular-nums" }}>
                <DayStat label="Trades" value={String(summary.tradeCount)} />
                <DayStat label="Win %" value={formatPercent(summary.tradeWinRate, 0)} />
                <DayStat label="Profit Factor" value={formatRatio(summary.profitFactor)} />
                <DayStat label="Bester Trade" value={formatMoney(summary.bestTrade)} color={pnlColor(summary.bestTrade)} />
                <DayStat label="Schlechtester" value={formatMoney(summary.worstTrade)} color={pnlColor(summary.worstTrade)} />
              </SimpleGrid>
            </Grid>

            <HStack
              mt={5}
              pt={4}
              borderTop="1px solid var(--j-line)"
              gap={{ base: 3, md: 6 }}
              flexWrap="wrap"
              sx={{ fontVariantNumeric: "tabular-nums" }}
            >
              <Detail label="Gewinne" value={String(summary.winCount)} />
              <Detail label="Verluste" value={String(summary.lossCount)} />
              <Detail label="Ø Gewinn" value={formatMoney(summary.avgWin)} />
              <Detail label="Ø Verlust" value={formatMoney(summary.avgLoss)} />
              <Detail label="Max Drawdown" value={formatMoney(-summary.maxDrawdown)} />
            </HStack>
          </Panel>
        );
      })}
    </Stack>
  );
}

function DayStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Stack gap={1}>
      <Text fontSize="10px" color="var(--cc-text-3)" className="inter-medium" letterSpacing="0.03em" noOfLines={1}>
        {label}
      </Text>
      <Text className="cc-num" fontSize={{ base: "sm", md: "md" }} color={color ?? "var(--cc-text)"} noOfLines={1}>
        {value}
      </Text>
    </Stack>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <HStack gap={2}>
      <Text fontSize="xs" color="var(--cc-text-3)">
        {label}
      </Text>
      <Text fontSize="xs" className="cc-num" color="var(--cc-text-2)">
        {value}
      </Text>
    </HStack>
  );
}
