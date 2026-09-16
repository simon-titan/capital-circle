"use client";

import { Box, HStack, Stack, Text, type BoxProps } from "@chakra-ui/react";
import type { ChartConfiguration } from "chart.js";
import { useMemo } from "react";
import type { ScoreAxis } from "@/lib/journal/metrics";
import { CHART_COLORS, TOOLTIP_STYLE } from "./chartSetup";
import { useChart } from "./useChart";

/** Sechs Achsen des Performance Score, jeweils 0–100. Eine Reihe → keine Legende. */
export function RadarChart({ axes, height = { base: "230px", md: "260px" } }: { axes: ScoreAxis[]; height?: BoxProps["h"] }) {
  const config = useMemo<ChartConfiguration>(
    () => ({
      type: "radar",
      data: {
        labels: axes.map((a) => a.label),
        datasets: [
          {
            label: "Score",
            data: axes.map((a) => Math.round(a.value)),
            backgroundColor: "rgba(212,176,128,0.16)",
            borderColor: CHART_COLORS.accent,
            borderWidth: 2,
            pointBackgroundColor: CHART_COLORS.accent,
            pointBorderColor: "#0a0d11",
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { display: false, stepSize: 25 },
            grid: { color: CHART_COLORS.grid },
            angleLines: { color: CHART_COLORS.grid },
            pointLabels: { color: CHART_COLORS.text, font: { size: 10 } },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_STYLE,
            callbacks: { label: (ctx) => `${ctx.parsed.r} / 100` },
          },
        },
      },
    }),
    [axes],
  );

  const canvasRef = useChart(config);

  return (
    <Stack gap={4} w="100%">
      <Box h={height} w="100%">
        <canvas ref={canvasRef} />
      </Box>

      {/* Tabellen-Zwilling: jeder Achsenwert ist auch ohne Diagramm ablesbar. */}
      <Stack as="dl" gap={1.5} w="100%">
        {axes.map((axis) => (
          <HStack key={axis.key} justify="space-between" gap={3}>
            <Text as="dt" fontSize="xs" color="var(--cc-text-3)" noOfLines={1}>
              {axis.label}
            </Text>
            <HStack gap={2} flexShrink={0}>
              <Box w="44px" h="2px" borderRadius="full" bg="rgba(255,255,255,0.07)" overflow="hidden">
                <Box h="100%" w={`${Math.round(axis.value)}%`} bg="var(--cc-gold-bar)" borderRadius="full" />
              </Box>
              <Text as="dd" fontSize="xs" className="cc-num" color="var(--cc-text-2)" minW="24px" textAlign="right">
                {Math.round(axis.value)}
              </Text>
            </HStack>
          </HStack>
        ))}
      </Stack>
    </Stack>
  );
}
