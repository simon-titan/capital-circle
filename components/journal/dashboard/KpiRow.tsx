"use client";

import { Box, Grid, GridItem, HStack, Stack, Text } from "@chakra-ui/react";
import { SCORE_TARGETS, type Summary } from "@/lib/journal/metrics";
import { Meter } from "../charts/Meter";
import { formatMoneyParts, formatPercent, formatRatio, pnlColor } from "../format";
import { Panel } from "../Panel";

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/**
 * Genau eine Hero-Zahl pro Ansicht (Net P&L), daneben vier Verhältniskennzahlen
 * als Meter. Auf Mobil bricht die Reihe in Hero + 2×2 um.
 */
export function KpiRow({ summary }: { summary: Summary }) {
  const { netPnl, tradeWinRate, profitFactor, dayWinRate, avgWinLossRatio, winCount, lossCount, tradingDays } = summary;

  // Der Profit Factor ist unbeschränkt; die Leiste zeigt ihn relativ zum Zielwert.
  const profitFactorFill = profitFactor === null ? 100 : clamp((profitFactor / SCORE_TARGETS.profitFactor) * 100);
  const payoffFill = clamp((avgWinLossRatio / SCORE_TARGETS.avgWinLossRatio) * 100);
  const hero = formatMoneyParts(netPnl);

  return (
    <Grid
      templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", xl: "minmax(250px, 1.25fr) repeat(4, 1fr)" }}
      gap={{ base: 3, md: 4 }}
    >
      <GridItem colSpan={{ base: 1, sm: 2, xl: 1 }}>
        {/* `containerType` macht die Karte zum Bezug für `cqi` unten. */}
        <Panel raised h="100%" sx={{ containerType: "inline-size" }}>
          <Stack gap={2} justify="center" h="100%" minH={{ base: "auto", xl: "132px" }}>
            <Text fontSize="xs" color="var(--cc-text-2)" className="inter-medium">
              Net P&amp;L
            </Text>
            <HStack align="baseline" gap="0.3em" color={pnlColor(netPnl)}>
              <Text
                className="cc-num"
                /*
                 * Eine feste Schriftgröße schneidet sechsstellige Beträge ab.
                 * `cqi` skaliert mit der Kartenbreite, nicht mit der Fensterbreite
                 * — die Karte ist die eigentliche Grenze. Der @supports-Zweig
                 * deckt Browser ohne Container-Queries ab.
                 */
                sx={{
                  fontSize: "1.75rem",
                  "@supports (font-size: 1cqi)": { fontSize: "clamp(1.5rem, 9cqi, 2.25rem)" },
                }}
                lineHeight="1.1"
                letterSpacing="-0.03em"
                whiteSpace="nowrap"
              >
                {hero.amount}
              </Text>
              <Text className="cc-num" fontSize="1rem" opacity={0.55} lineHeight="1.1">
                {hero.currency}
              </Text>
            </HStack>
            <HStack gap={2} color="var(--cc-text-3)" fontSize="xs">
              <Text className="cc-num">{summary.tradeCount}</Text>
              <Text>{summary.tradeCount === 1 ? "Trade" : "Trades"}</Text>
              <Box w="3px" h="3px" borderRadius="full" bg="currentColor" opacity={0.5} />
              <Text className="cc-num">{tradingDays}</Text>
              <Text>{tradingDays === 1 ? "Handelstag" : "Handelstage"}</Text>
            </HStack>
          </Stack>
        </Panel>
      </GridItem>

      <Panel>
        <Meter
          label="Trade Win %"
          value={formatPercent(tradeWinRate, 0)}
          caption={`${winCount}W · ${lossCount}L`}
          fillPercent={tradeWinRate}
          tone="profit"
        />
      </Panel>

      <Panel>
        <Meter
          label="Profit Factor"
          value={formatRatio(profitFactor)}
          caption={`Ziel ${SCORE_TARGETS.profitFactor.toFixed(1)}`}
          fillPercent={profitFactorFill}
        />
      </Panel>

      <Panel>
        <Meter
          label="Day Win %"
          value={formatPercent(dayWinRate, 0)}
          caption={`${tradingDays} ${tradingDays === 1 ? "Tag" : "Tage"}`}
          fillPercent={dayWinRate}
          tone="profit"
        />
      </Panel>

      <Panel>
        <Meter
          label="Avg Win / Loss"
          value={avgWinLossRatio ? avgWinLossRatio.toFixed(2) : "—"}
          caption={`Ziel ${SCORE_TARGETS.avgWinLossRatio.toFixed(1)}`}
          fillPercent={payoffFill}
        />
      </Panel>
    </Grid>
  );
}
