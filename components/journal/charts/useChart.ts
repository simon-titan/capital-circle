"use client";

import type { ChartConfiguration } from "chart.js";
import { useEffect, useRef } from "react";
import { Chart } from "./chartSetup";

/**
 * Bindet eine chart.js-Instanz an ein <canvas>.
 *
 * Das `destroy()` vor dem Neuaufbau ist nicht optional: React 19 mountet
 * Effekte im StrictMode doppelt, und chart.js verweigert eine zweite Instanz
 * auf demselben Canvas ("Canvas is already in use").
 *
 * Aufrufer müssen `config` per useMemo stabil halten, sonst baut sich das
 * Diagramm bei jedem Render neu auf.
 */
export function useChart(config: ChartConfiguration) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvas, config);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [config]);

  return canvasRef;
}
