"use client";

import { Box, type BoxProps } from "@chakra-ui/react";
import type { ChartConfiguration, ScriptableContext } from "chart.js";
import { useMemo } from "react";
import type { EquityPoint } from "@/lib/journal/metrics";
import { formatDate, formatMoney } from "../format";
import { AXIS_STYLE, CHART_COLORS, RGB, TOOLTIP_STYLE, verticalFade } from "./chartSetup";
import { useChart } from "./useChart";

/** Verlaufskurve mit dezenter Fläche — kumulierte P&L und Drawdown. */
export function AreaChart({
  points,
  height = { base: "200px", md: "260px" },
  color = CHART_COLORS.profit,
  rgb = RGB.profit,
}: {
  points: EquityPoint[];
  height?: BoxProps["h"];
  color?: string;
  rgb?: string;
}) {
  const config = useMemo<ChartConfiguration>(
    () => ({
      type: "line",
      data: {
        labels: points.map((p) => p.x),
        datasets: [
          {
            data: points.map((p) => p.y),
            borderColor: color,
            borderWidth: 2,
            borderJoinStyle: "round",
            borderCapStyle: "round",
            pointRadius: 0,
            // ≥ 8px Trefferfläche, 2px Ring in Flächenfarbe (Marks-Spec).
            pointHoverRadius: 4,
            pointHoverBackgroundColor: color,
            pointHoverBorderColor: "#0a0d11",
            pointHoverBorderWidth: 2,
            tension: 0.25,
            fill: true,
            backgroundColor: (ctx: ScriptableContext<"line">) => verticalFade(ctx.chart, rgb),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 8, right: 4 } },
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            ...AXIS_STYLE,
            grid: { display: false },
            ticks: {
              ...AXIS_STYLE.ticks,
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 6,
              callback: (_v, index) => (points[index] ? formatDate(points[index].x.slice(0, 10)) : ""),
            },
          },
          y: {
            ...AXIS_STYLE,
            ticks: { ...AXIS_STYLE.ticks, maxTicksLimit: 5 },
          },
        },
        plugins: {
          // Explizit aus: registriert ein anderer Bereich chart.js global mit Legende, erschiene hier „undefined“.
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_STYLE,
            callbacks: {
              title: (items) => formatDate(String(items[0].label).slice(0, 10)),
              label: (ctx) => formatMoney(ctx.parsed.y ?? 0),
            },
          },
        },
      },
    }),
    [points, color, rgb],
  );

  const canvasRef = useChart(config);

  return (
    <Box h={height} w="100%">
      <canvas ref={canvasRef} />
    </Box>
  );
}
