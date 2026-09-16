"use client";

import { Box, Grid, GridItem, HStack, Input, Select, Text } from "@chakra-ui/react";
import { Chart, registerables } from "chart.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { strategyLabel } from "@/components/trading-journal/constants";
import { TradeCalendar } from "@/components/trading-journal/TradeCalendar";
import type { TradeRow } from "@/components/trading-journal/types";

Chart.register(...registerables);

type Props = {
  trades: TradeRow[];
};

function fmtD(v: number, sign = true): string {
  const abs = Math.abs(v).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!sign) return `$${abs}`;
  return `${v >= 0 ? "+$" : "-$"}${abs}`;
}

/** Gewinn/Verlust bleiben Grün/Rot; alles Neutrale ist Gold (siehe components/journal/charts/chartSetup.ts). */
const CHART_PROFIT = "#22c55e";
const CHART_LOSS = "#ef4444";

const TOOLTIP_STYLE = {
  backgroundColor: "rgba(14,18,23,0.97)",
  borderColor: "rgba(212,176,128,0.4)",
  borderWidth: 1,
  titleColor: "#f2f3f5",
  bodyColor: "#d4d7db",
  titleFont: { family: "'Inter', sans-serif", size: 11, weight: 600 as const },
  bodyFont: { family: "'Inter', sans-serif", size: 12 },
  padding: 10,
  cornerRadius: 8,
  displayColors: false,
};

const inputSx = {
  bg: "rgba(255, 255, 255, 0.03)",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  _hover: { borderColor: "var(--cc-gold-line)" },
  _focusVisible: { borderColor: "var(--cc-gold)", boxShadow: "0 0 0 1px var(--cc-gold)" },
};

/** Innenkachel auf der Karte (keine zweite Glas-Karte). */
const tileProps = {
  bg: "rgba(255, 255, 255, 0.03)",
  border: "1px solid var(--cc-line)",
  borderRadius: "10px",
};

const tileLabelProps = {
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--cc-text-2)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  mb: 2,
};

const sectionTitleProps = {
  fontSize: "13px",
  lineHeight: "18px",
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "var(--cc-text-soft)",
};

export function TradeAnalytics({ trades }: Props) {
  const [fStrat, setFStrat] = useState("");
  const [fAsset, setFAsset] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const filtered = useMemo(() => {
    let f = trades;
    if (fStrat) f = f.filter((x) => x.strategy === fStrat);
    if (fAsset) f = f.filter((x) => x.asset === fAsset);
    if (fFrom) f = f.filter((x) => x.trade_date >= fFrom);
    if (fTo) f = f.filter((x) => x.trade_date <= fTo);
    return f;
  }, [trades, fStrat, fAsset, fFrom, fTo]);

  const winRateRef = useRef<HTMLCanvasElement>(null);
  const pfRef = useRef<HTMLCanvasElement>(null);
  const chartWin = useRef<Chart<"doughnut", number[]> | null>(null);
  const chartPf = useRef<Chart<"doughnut", number[]> | null>(null);

  useEffect(() => {
    const wins = filtered.filter((t) => t.result_dollar > 0).length;
    const losses = filtered.length - wins;

    const grossWin = filtered.filter((t) => t.result_dollar > 0).reduce((s, t) => s + t.result_dollar, 0);
    const grossLoss = Math.abs(filtered.filter((t) => t.result_dollar < 0).reduce((s, t) => s + t.result_dollar, 0));

    if (winRateRef.current) {
      chartWin.current?.destroy();
      chartWin.current = new Chart(winRateRef.current, {
        type: "doughnut",
        data: {
          datasets: [
            {
              data: [losses, wins],
              backgroundColor: [CHART_LOSS, CHART_PROFIT],
              borderWidth: 0,
              circumference: 180,
              rotation: 270,
            },
          ],
        },
        options: {
          responsive: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          cutout: "72%",
        },
      });
    }

    if (pfRef.current) {
      chartPf.current?.destroy();
      chartPf.current = new Chart(pfRef.current, {
        type: "doughnut",
        data: {
          datasets: [
            {
              data: [grossWin || 0, grossLoss || 0],
              backgroundColor: [CHART_PROFIT, CHART_LOSS],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...TOOLTIP_STYLE,
              callbacks: {
                label: (c) => fmtD(Number(c.raw), false),
              },
            },
          },
          cutout: "60%",
        },
      });
    }

    return () => {
      chartWin.current?.destroy();
      chartPf.current?.destroy();
    };
  }, [filtered]);

  const stats = useMemo(() => {
    if (!filtered.length) return null;
    const dayMap: Record<string, number> = {};
    filtered.forEach((t) => {
      dayMap[t.trade_date] = (dayMap[t.trade_date] || 0) + t.result_dollar;
    });
    const days = Object.entries(dayMap);
    const bestDay = days.length ? days.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;
    const sessMap: Record<string, number> = {};
    filtered.forEach((t) => {
      const k = t.session || "—";
      sessMap[k] = (sessMap[k] || 0) + t.result_dollar;
    });
    const bestSess = Object.entries(sessMap).reduce((a, b) => (b[1] > a[1] ? b : a), ["—", 0]);
    const stratMap: Record<string, number> = {};
    filtered.forEach((t) => {
      const k = strategyLabel(t.strategy);
      stratMap[k] = (stratMap[k] || 0) + t.result_dollar;
    });
    const bestStrat = Object.entries(stratMap).reduce((a, b) => (b[1] > a[1] ? b : a), ["—", 0]);
    const winTr = filtered.filter((t) => t.result_dollar > 0);
    const lossTr = filtered.filter((t) => t.result_dollar < 0);
    const avgWin = winTr.length ? winTr.reduce((s, t) => s + t.result_dollar, 0) / winTr.length : 0;
    const avgLoss = lossTr.length ? lossTr.reduce((s, t) => s + t.result_dollar, 0) / lossTr.length : 0;
    const bestTrade = filtered.reduce((a, b) => (b.result_dollar > a.result_dollar ? b : a));
    const worstTrade = filtered.reduce((a, b) => (b.result_dollar < a.result_dollar ? b : a));
    return { bestDay, bestSess, bestStrat, avgWin, avgLoss, bestTrade, worstTrade };
  }, [filtered]);

  const wins = filtered.filter((t) => t.result_dollar > 0).length;
  const losses = filtered.length - wins;
  const wr = filtered.length ? Math.round((wins / filtered.length) * 100) : 0;
  const grossWin = filtered.filter((t) => t.result_dollar > 0).reduce((s, t) => s + t.result_dollar, 0);
  const grossLoss = Math.abs(filtered.filter((t) => t.result_dollar < 0).reduce((s, t) => s + t.result_dollar, 0));
  const pf = grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : "—";

  const sel = {
    size: "sm" as const,
    ...inputSx,
    sx: { "& option, & optgroup": { background: "#0e1217" } },
    maxW: "180px",
  };
  const dateSel = { size: "sm" as const, ...inputSx, maxW: "180px" };

  return (
    <Box>
      <HStack flexWrap="wrap" gap={3} mb={6}>
        <Select {...sel} placeholder="Alle Strategien" value={fStrat} onChange={(e) => setFStrat(e.target.value)}>
          <option value="">Alle Strategien</option>
          <option value="scalp">Scalping Balance</option>
          <option value="ocrr">NYSE OCRR</option>
          <option value="naked">Naked Zonen</option>
        </Select>
        <Select {...sel} value={fAsset} onChange={(e) => setFAsset(e.target.value)}>
          <option value="">Alle Assets</option>
          <option>NQ</option>
          <option>MNQ</option>
          <option>ES</option>
          <option>MES</option>
          <option>GC</option>
          <option>MGC</option>
          <option>CL</option>
          <option>MCL</option>
        </Select>
        <Input type="date" className="cc-num" {...dateSel} value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
        <Text fontSize="sm" color="var(--cc-text-2)">
          bis
        </Text>
        <Input type="date" className="cc-num" {...dateSel} value={fTo} onChange={(e) => setFTo(e.target.value)} />
      </HStack>

      {!filtered.length ? (
        <Text color="var(--cc-text-2)" py={8} textAlign="center">
          Keine Trades im gewählten Zeitraum
        </Text>
      ) : (
        <>
          {stats ? (
            <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={3} mb={6}>
              <GridItem {...tileProps} p={4}>
                <Text {...tileLabelProps}>Bester Tag</Text>
                <Text
                  fontSize="xl"
                  fontWeight={600}
                  color={stats.bestDay && stats.bestDay[1] >= 0 ? "var(--color-profit)" : "var(--color-loss)"}
                  className="cc-num"
                >
                  {stats.bestDay ? fmtD(stats.bestDay[1]) : "—"}
                </Text>
                <Text fontSize="xs" color="var(--cc-text-2)" mt={1} className="cc-num">
                  {stats.bestDay ? stats.bestDay[0] : "—"}
                </Text>
              </GridItem>
              <GridItem {...tileProps} p={4}>
                <Text {...tileLabelProps}>Beste Session</Text>
                <Text fontSize="lg" fontWeight={600} color="var(--cc-gold-light)">
                  {stats.bestSess[0]}
                </Text>
                <Text fontSize="xs" color="var(--cc-text-2)" mt={1} className="cc-num">
                  {fmtD(stats.bestSess[1])}
                </Text>
              </GridItem>
              <GridItem {...tileProps} p={4}>
                <Text {...tileLabelProps}>Beste Strategie</Text>
                <Text fontSize="lg" fontWeight={600} color="var(--cc-gold-light)">
                  {stats.bestStrat[0]}
                </Text>
                <Text fontSize="xs" color="var(--cc-text-2)" mt={1} className="cc-num">
                  {fmtD(stats.bestStrat[1])}
                </Text>
              </GridItem>
              <GridItem {...tileProps} p={4}>
                <Text {...tileLabelProps}>Ø Gewinn / Ø Verlust</Text>
                <Text fontSize="sm" fontWeight={600} color="var(--cc-text-2)" className="cc-num">
                  <Text as="span" color="var(--color-profit)">
                    {fmtD(stats.avgWin)}
                  </Text>{" "}
                  /{" "}
                  <Text as="span" color="var(--color-loss)">
                    {fmtD(stats.avgLoss)}
                  </Text>
                </Text>
              </GridItem>
            </Grid>
          ) : null}

          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} mb={6}>
            <GridItem {...tileProps} p={5}>
              <Text {...sectionTitleProps} mb={4}>
                Bester Trade
              </Text>
              {stats ? (
                <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={4}>
                  <Box>
                    <Text fontSize="2xl" fontWeight={600} letterSpacing="-0.01em" color="var(--color-profit)" className="cc-num">
                      {fmtD(stats.bestTrade.result_dollar)}
                    </Text>
                  </Box>
                  <Text fontSize="xs" color="var(--cc-text-2)" textAlign="right" maxW="200px" className="cc-num">
                    {stats.bestTrade.direction === "long" ? "Long" : "Short"} {stats.bestTrade.contracts} / {stats.bestTrade.asset}
                    <br />
                    {stats.bestTrade.trade_date}
                  </Text>
                </HStack>
              ) : null}
            </GridItem>
            <GridItem {...tileProps} p={5}>
              <Text {...sectionTitleProps} mb={4}>
                Schlechtester Trade
              </Text>
              {stats ? (
                <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={4}>
                  <Box>
                    <Text fontSize="2xl" fontWeight={600} letterSpacing="-0.01em" color="var(--color-loss)" className="cc-num">
                      {fmtD(stats.worstTrade.result_dollar)}
                    </Text>
                  </Box>
                  <Text fontSize="xs" color="var(--cc-text-2)" textAlign="right" maxW="200px" className="cc-num">
                    {stats.worstTrade.direction === "long" ? "Long" : "Short"} {stats.worstTrade.contracts} / {stats.worstTrade.asset}
                    <br />
                    {stats.worstTrade.trade_date}
                  </Text>
                </HStack>
              ) : null}
            </GridItem>
          </Grid>

          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} mb={6}>
            <HStack {...tileProps} p={5} align="flex-start" spacing={6} flexWrap="wrap">
              <Box>
                <Text {...sectionTitleProps} mb={3}>
                  Trade Win %
                </Text>
                <Text fontSize="28px" fontWeight={600} letterSpacing="-0.02em" color="var(--cc-text)" className="cc-num">
                  {wr}%
                </Text>
                <Text fontSize="xs" color="var(--cc-text-2)" mt={1} className="cc-num">
                  {wins} Wins / {losses} Losses
                </Text>
              </Box>
              <Box position="relative" w="160px" h="120px">
                <canvas ref={winRateRef} width={160} height={120} />
                <Text position="absolute" top="4px" right="24px" fontSize="11px" fontWeight={600} color="var(--color-loss)" className="cc-num">
                  {losses}
                </Text>
                <Text position="absolute" bottom="8px" right="28px" fontSize="11px" fontWeight={600} color="var(--color-profit)" className="cc-num">
                  {wins}
                </Text>
              </Box>
            </HStack>
            <HStack {...tileProps} p={5} align="flex-start" spacing={6} flexWrap="wrap">
              <Box>
                <Text {...sectionTitleProps} mb={3}>
                  Profit Factor
                </Text>
                <Text
                  fontSize="28px"
                  fontWeight={600}
                  letterSpacing="-0.02em"
                  color={pf !== "—" && !Number.isNaN(parseFloat(pf)) && parseFloat(pf) >= 1 ? "var(--color-profit)" : "var(--color-loss)"}
                  className="cc-num"
                >
                  {pf}
                </Text>
                <Text fontSize="xs" color="var(--cc-text-2)" mt={1}>
                  Gross Win / Gross Loss
                </Text>
                <Text fontSize="xs" fontWeight={500} mt={2} className="cc-num">
                  <Text as="span" color="var(--color-profit)">
                    +{fmtD(grossWin, false)}
                  </Text>{" "}
                  <Text as="span" color="var(--color-loss)">
                    -{fmtD(grossLoss, false)}
                  </Text>
                </Text>
              </Box>
              <Box position="relative" w="140px" h="140px">
                <canvas ref={pfRef} width={140} height={140} />
              </Box>
            </HStack>
          </Grid>
        </>
      )}

      <TradeCalendar trades={filtered} />
    </Box>
  );
}
