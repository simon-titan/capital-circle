import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
} from "chart.js";

/**
 * Nur die tatsächlich genutzten chart.js-Bausteine registrieren — `registerables`
 * zieht jeden Controller und jede Skala mit ins Bundle.
 *
 * Je Diagrammtyp braucht es den Controller UND seine Elemente/Skalen:
 *   doughnut → DoughnutController + ArcElement          (Reserve; aktuell ungenutzt)
 *   radar    → RadarController + RadialLinearScale       (Performance Score)
 *   line     → LineController + LineElement + PointElement + Filler
 *   bar      → BarController + BarElement
 */
Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
);

Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = "rgba(255,255,255,0.45)";

/**
 * Nur `duration` überschreiben, das Objekt NICHT ersetzen.
 *
 * `Animations.configure()` kopiert die Animationsoptionen über
 * `Object.keys(defaults.animation)`. Das Objekt trägt die Schlüssel `type`,
 * `fn` und `easing` mit dem Wert `undefined` — ein Ersatzobjekt `{duration}`
 * verliert sie. Ohne `type` fällt chart.js auf `interpolators[typeof from]`
 * zurück, und für Farben (`typeof 'string'`) existiert kein Interpolator:
 * `this._fn is not a function`.
 */
if (Chart.defaults.animation) {
  Chart.defaults.animation.duration = 400;
}

/**
 * Gewinn und Verlust sind eine Status-/Polaritätsachse, keine kategoriale Reihe —
 * deshalb die reservierten Status-Farben. Der Palette-Validator misst zwischen
 * ihnen ΔE 12,7 unter Deuteranopie; das liegt knapp über der Schwelle und wird
 * zusätzlich durch Sekundär-Encoding abgesichert (Vorzeichen, Lage zur Nulllinie).
 *
 * `accent` ist Brand-Gold und markiert nie ein Ergebnis — es trägt neutrale Reihen
 * (Equity-Kurve, Radar). Grün und Rot bleiben ausschließlich Gewinn und Verlust.
 */
export const CHART_COLORS = {
  accent: "#d4b080",
  accentDim: "rgba(212,176,128,0.65)",
  profit: "#22c55e",
  loss: "#ef4444",
  grid: "rgba(255,255,255,0.05)",
  text: "rgba(255,255,255,0.4)",
} as const;

/** Flächen sind ein Hauch, kein Block — Gold darf etwas mehr leuchten. */
export const FILL_ALPHA = { top: 0.22, bottom: 0 } as const;

export const TOOLTIP_STYLE = {
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
} as const;

/** Hairline, durchgezogen, einen Schritt von der Fläche entfernt — nie gestrichelt. */
export const AXIS_STYLE = {
  ticks: { color: CHART_COLORS.text, font: { size: 10 }, padding: 6 },
  grid: { color: CHART_COLORS.grid, drawTicks: false },
  border: { display: false },
} as const;

/** Vertikaler Farbverlauf für Flächenkurven; null solange die Zeichenfläche fehlt. */
export function verticalFade(chart: Chart, rgb: string): CanvasGradient | string {
  const { ctx, chartArea } = chart;
  if (!chartArea) return "transparent";
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, `rgba(${rgb}, ${FILL_ALPHA.top})`);
  gradient.addColorStop(1, `rgba(${rgb}, ${FILL_ALPHA.bottom})`);
  return gradient;
}

export const RGB = {
  profit: "34,197,94",
  loss: "239,68,68",
  accent: "212,176,128",
} as const;

export { Chart };
