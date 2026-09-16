"use client";

import { Box, type BoxProps } from "@chakra-ui/react";
import type { ChartConfiguration } from "chart.js";
import { useMemo } from "react";
import type { DayAgg } from "@/lib/journal/metrics";
import { formatDate, formatMoney } from "../format";
import { AXIS_STYLE, CHART_COLORS, TOOLTIP_STYLE } from "./chartSetup";
import { useChart } from "./useChart";

/**
 * Tages-P&L, grün über und rot unter der Nulllinie.
 *
 * Die Farbe verdoppelt hier nur, was die Lage zur Nulllinie ohnehin sagt — das
 * ist die Sekundärkodierung, die Rot/Grün auch unter Farbenblindheit lesbar hält.
 */
export function BarChart({ days, height = { base: "200px", md: "240px" } }: { days: DayAgg[]; height?: BoxProps["h"] }) {
  const config = useMemo<ChartConfiguration>(
    () => ({
      type: "bar",
      data: {
        labels: days.map((d) => d.date),
        datasets: [
          {
            data: days.map((d) => d.pnl),
            backgroundColor: days.map((d) => (d.pnl >= 0 ? "rgba(34,197,94,0.7)" : "rgba(239,68,68,0.7)")),
            hoverBackgroundColor: days.map((d) => (d.pnl >= 0 ? CHART_COLORS.profit : CHART_COLORS.loss)),
            // Gerundetes Datenende, eckig an der Nulllinie (chart.js überspringt
            // per Default die Basiskante). Balken nie breiter als 24px.
            borderRadius: 4,
            borderWidth: 0,
            maxBarThickness: 24,
            categoryPercentage: 0.82,
            barPercentage: 0.9,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 8 } },
        scales: {
          x: {
            ...AXIS_STYLE,
            grid: { display: false },
            ticks: {
              ...AXIS_STYLE.ticks,
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 6,
              callback: (_v, index) => (days[index] ? formatDate(days[index].date) : ""),
            },
          },
          y: {
            ...AXIS_STYLE,
            ticks: { ...AXIS_STYLE.ticks, maxTicksLimit: 5 },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_STYLE,
            callbacks: {
              title: (items) => formatDate(String(items[0].label)),
              label: (ctx) => {
                const day = days[ctx.dataIndex];
                return `${formatMoney(ctx.parsed.y ?? 0)} · ${day.count} ${day.count === 1 ? "Trade" : "Trades"}`;
              },
            },
          },
        },
      },
    }),
    [days],
  );

  const canvasRef = useChart(config);

  return (
    <Box h={height} w="100%">
      <canvas ref={canvasRef} />
    </Box>
  );
}
