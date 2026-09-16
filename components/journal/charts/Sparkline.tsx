"use client";

import { Box, type BoxProps } from "@chakra-ui/react";
import type { ChartConfiguration, ScriptableContext } from "chart.js";
import { useMemo } from "react";
import { CHART_COLORS, RGB, verticalFade } from "./chartSetup";
import { useChart } from "./useChart";

/**
 * Achsenlose Mini-Kurve für die Tages-Ansicht.
 *
 * Bewusst ohne Tooltip: sie zeigt die Form des Tages, die Zahlen stehen
 * daneben. Deshalb ist sie `aria-hidden` — nichts geht verloren.
 */
export function Sparkline({
  values,
  positive,
  height = "64px",
}: {
  values: number[];
  positive: boolean;
  height?: BoxProps["h"];
}) {
  const color = positive ? CHART_COLORS.profit : CHART_COLORS.loss;
  const rgb = positive ? RGB.profit : RGB.loss;

  const config = useMemo<ChartConfiguration>(
    () => ({
      type: "line",
      // Ein einzelner Punkt zeichnet keine Linie — dann die Null als Startpunkt.
      data: {
        labels: values.length === 1 ? ["", ""] : values.map((_, i) => String(i)),
        datasets: [
          {
            data: values.length === 1 ? [0, values[0]] : values,
            borderColor: color,
            borderWidth: 1.5,
            borderJoinStyle: "round",
            borderCapStyle: "round",
            pointRadius: 0,
            tension: 0.3,
            fill: true,
            backgroundColor: (ctx: ScriptableContext<"line">) => verticalFade(ctx.chart, rgb),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        events: [],
        layout: { padding: { top: 2, bottom: 2 } },
        scales: { x: { display: false }, y: { display: false } },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
      },
    }),
    [values, color, rgb],
  );

  const canvasRef = useChart(config);

  return (
    <Box h={height} w="100%" aria-hidden>
      <canvas ref={canvasRef} />
    </Box>
  );
}
