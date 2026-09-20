"use client";

import { Box, Stack, Text } from "@chakra-ui/react";
import type { ChartConfiguration } from "chart.js";
import { useMemo } from "react";
import { AXIS_STYLE, TOOLTIP_STYLE } from "@/components/journal/charts/chartSetup";
import { useChart } from "@/components/journal/charts/useChart";
import { ADMIN_CHART } from "./adminUi";

/**
 * Ein Tagesverlauf, **eine** Reihe.
 *
 * ── Warum vier kleine Diagramme statt eines mit vier Kurven ────────────────
 *
 * Das Schema erlaubt genau einen Akzent (Champagner; Grün und Rot nur
 * semantisch, siehe DESIGN.md). Vier Reihen bräuchten vier unterscheidbare
 * Farben — unter Farbenschwäche liegen die Grautöne dieser Palette zu dicht
 * beieinander, um sie sicher auseinanderzuhalten. Vier kleine Diagramme
 * nebeneinander lösen dasselbe Problem ohne eine einzige neue Farbe: Die
 * Identität steckt in der Überschrift, nicht im Farbton.
 *
 * Sie teilen sich ihre Höhenachse (`max`), sonst sähe ein Tag mit zwei
 * Abbrüchen genauso hoch aus wie einer mit zwanzig Käufen.
 *
 * Balken und nicht Linie: gezählt wird je Tag, und ein Zähler je Zeitabschnitt
 * ist eine Menge, keine Bewegung.
 */
export function KaufwegTagesChart({
  titel,
  hinweis,
  tage,
  werte,
  max,
  ton = "gold",
  hoehe = "150px",
}: {
  titel: string;
  hinweis?: string;
  tage: string[];
  werte: number[];
  /** Gemeinsame Obergrenze aller Diagramme einer Reihe. */
  max: number;
  /** `danger` nur für Fehlschläge — Rot trägt im Schema ausschließlich Bedeutung. */
  ton?: "gold" | "ink" | "danger";
  hoehe?: string;
}) {
  const farbe =
    ton === "danger" ? ADMIN_CHART.danger : ton === "ink" ? ADMIN_CHART.ink : ADMIN_CHART.gold;

  const summe = werte.reduce((n, w) => n + w, 0);

  const config = useMemo<ChartConfiguration>(
    () => ({
      type: "bar",
      data: {
        labels: tage,
        datasets: [
          {
            data: werte,
            backgroundColor: `${farbe}b0`,
            hoverBackgroundColor: farbe,
            borderRadius: 3,
            borderWidth: 0,
            maxBarThickness: 18,
            categoryPercentage: 0.88,
            barPercentage: 0.92,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 6 } },
        scales: {
          x: {
            ...AXIS_STYLE,
            grid: { display: false },
            ticks: {
              ...AXIS_STYLE.ticks,
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 5,
              callback: (_v, index) => kurzesDatum(tage[index]),
            },
          },
          y: {
            ...AXIS_STYLE,
            // Gemeinsame Achse aller Diagramme der Reihe. `Math.max(1, …)`,
            // damit eine Reihe aus lauter Nullen nicht auf eine Nulllinie
            // zusammenfällt und dadurch aussähe wie ein fehlendes Diagramm.
            min: 0,
            max: Math.max(1, max),
            ticks: {
              ...AXIS_STYLE.ticks,
              maxTicksLimit: 4,
              // Gezählt wird in ganzen Vorgängen — „2,5 Käufe“ gibt es nicht.
              callback: (wert) => (Number.isInteger(Number(wert)) ? String(wert) : ""),
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TOOLTIP_STYLE,
            callbacks: {
              title: (items) => langesDatum(String(items[0].label)),
              label: (ctx) => `${ctx.parsed.y ?? 0} ${titel}`,
            },
          },
        },
      },
    }),
    [tage, werte, max, farbe, titel],
  );

  const canvasRef = useChart(config);

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Text fontSize="12px" fontWeight={500} color="var(--cc-text-2)">
          {titel}
        </Text>
        <Text className="cc-num" fontSize="20px" fontWeight={600} lineHeight={1.1} color="var(--cc-text)">
          {summe.toLocaleString("de-DE")}
        </Text>
      </Stack>
      <Box h={hoehe} w="100%">
        <canvas ref={canvasRef} aria-label={`${titel} je Tag`} role="img" />
      </Box>
      {hinweis ? (
        <Text fontSize="11px" color="var(--cc-text-3)" lineHeight={1.45}>
          {hinweis}
        </Text>
      ) : null}
    </Stack>
  );
}

function kurzesDatum(tag: string | undefined): string {
  if (!tag) return "";
  const [, monat, t] = tag.split("-");
  return `${t}.${monat}.`;
}

function langesDatum(tag: string): string {
  try {
    return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(
      new Date(`${tag}T12:00:00Z`),
    );
  } catch {
    return tag;
  }
}
