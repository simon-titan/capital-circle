/**
 * Trading Journal v2 — alle Kennzahlen an einem Ort.
 *
 * Bewusst frei von Supabase- und React-Abhängigkeiten: die Funktionen sind rein
 * und lassen sich damit direkt aus einem Node-Script gegen echte CSV-Daten
 * prüfen (siehe scripts/verify-journal-import.mjs).
 *
 * Konvention über alle Raten hinweg:
 *   Gewinn   = pnl > 0
 *   Verlust  = pnl < 0
 *   Scratch  = pnl === 0  → zählt in tradeCount, aber weder in Zähler noch
 *                           Nenner der Win-Raten. Ein Nullsummen-Trade ist
 *                           weder gewonnen noch verloren.
 */

const EPSILON = 1e-9;

/** Ab wie vielen Trades der Performance Score aussagekräftig ist. */
export const MIN_TRADES_FOR_SCORE = 5;

/** Skalierung der Score-Achsen: welcher Wert entspricht 100 Punkten. */
export const SCORE_TARGETS = {
  profitFactor: 3,
  avgWinLossRatio: 3,
} as const;

export interface MetricTrade {
  /** Netto-P&L in Kontowährung. */
  pnl: number;
  /** Handelstag als YYYY-MM-DD (bereits in der Ziel-Zeitzone aufgelöst). */
  date: string;
  /** Exit-Zeitpunkt als ISO-String — bestimmt die chronologische Reihenfolge. */
  exitTime: string;
}

export interface DayAgg {
  date: string;
  pnl: number;
  count: number;
}

export interface EquityPoint {
  x: string;
  y: number;
}

export interface Drawdown {
  series: EquityPoint[];
  maxAbsolute: number;
  maxPercent: number;
}

export interface ScoreAxis {
  key: string;
  label: string;
  value: number;
}

export interface PerformanceScore {
  /** null, solange weniger als MIN_TRADES_FOR_SCORE Trades vorliegen. */
  total: number | null;
  axes: ScoreAxis[];
}

export interface Summary {
  tradeCount: number;
  winCount: number;
  lossCount: number;
  scratchCount: number;
  netPnl: number;
  grossWin: number;
  grossLoss: number;
  tradeWinRate: number;
  profitFactor: number | null;
  dayWinRate: number;
  avgWin: number;
  avgLoss: number;
  avgWinLossRatio: number;
  expectancy: number;
  bestTrade: number;
  worstTrade: number;
  maxDrawdown: number;
  tradingDays: number;
}

// ── Basis ──────────────────────────────────────────────────────────────────────

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const wins = (t: MetricTrade[]) => t.filter((x) => x.pnl > 0);
const losses = (t: MetricTrade[]) => t.filter((x) => x.pnl < 0);

/** Chronologisch nach Exit-Zeit, stabil bei Gleichstand. */
export function orderChrono(trades: MetricTrade[]): MetricTrade[] {
  return [...trades].sort((a, b) => {
    const d = Date.parse(a.exitTime) - Date.parse(b.exitTime);
    return d !== 0 ? d : a.date.localeCompare(b.date);
  });
}

export function netPnl(trades: MetricTrade[]): number {
  return trades.reduce((sum, t) => sum + t.pnl, 0);
}

export function grossWin(trades: MetricTrade[]): number {
  return wins(trades).reduce((sum, t) => sum + t.pnl, 0);
}

/** Positiver Betrag der Summe aller Verluste. */
export function grossLoss(trades: MetricTrade[]): number {
  return Math.abs(losses(trades).reduce((sum, t) => sum + t.pnl, 0));
}

export function tradeWinRate(trades: MetricTrade[]): number {
  const w = wins(trades).length;
  const l = losses(trades).length;
  return w + l === 0 ? 0 : (100 * w) / (w + l);
}

/** null, wenn es keine Verluste gibt — dann ist der Faktor unendlich. */
export function profitFactor(trades: MetricTrade[]): number | null {
  const loss = grossLoss(trades);
  return loss === 0 ? null : grossWin(trades) / loss;
}

export function avgWin(trades: MetricTrade[]): number {
  const w = wins(trades);
  return w.length === 0 ? 0 : grossWin(trades) / w.length;
}

/** Negativ (oder 0, wenn es keine Verluste gibt). */
export function avgLoss(trades: MetricTrade[]): number {
  const l = losses(trades);
  return l.length === 0 ? 0 : -grossLoss(trades) / l.length;
}

export function avgWinLossRatio(trades: MetricTrade[]): number {
  const loss = Math.abs(avgLoss(trades));
  return loss === 0 ? 0 : avgWin(trades) / loss;
}

/** Durchschnittlicher P&L pro Trade, Scratches eingeschlossen. */
export function expectancy(trades: MetricTrade[]): number {
  return trades.length === 0 ? 0 : netPnl(trades) / trades.length;
}

// ── Tages-Aggregation ──────────────────────────────────────────────────────────

export function dailyPnl(trades: MetricTrade[]): DayAgg[] {
  const map = new Map<string, DayAgg>();
  for (const t of trades) {
    const day = map.get(t.date);
    if (day) {
      day.pnl += t.pnl;
      day.count += 1;
    } else {
      map.set(t.date, { date: t.date, pnl: t.pnl, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Grüne Tage / (grüne + rote Tage). Nulltage bleiben aussen vor, analog zu tradeWinRate. */
export function dayWinRate(trades: MetricTrade[]): number {
  const days = dailyPnl(trades);
  const green = days.filter((d) => d.pnl > 0).length;
  const red = days.filter((d) => d.pnl < 0).length;
  return green + red === 0 ? 0 : (100 * green) / (green + red);
}

// ── Equity & Drawdown ──────────────────────────────────────────────────────────

/** Laufende Summe pro Trade — Basis für die Drawdown-Kurve. */
export function cumulativeEquity(trades: MetricTrade[]): EquityPoint[] {
  let running = 0;
  return orderChrono(trades).map((t) => {
    running += t.pnl;
    return { x: t.exitTime, y: running };
  });
}

/** Laufende Summe pro Handelstag — Basis für die Flächenkurve im Dashboard. */
export function dailyCumulative(trades: MetricTrade[]): EquityPoint[] {
  let running = 0;
  return dailyPnl(trades).map((d) => {
    running += d.pnl;
    return { x: d.date, y: running };
  });
}

/**
 * Drawdown gegen den laufenden Höchststand. Startkapital ist 0, deshalb beginnt
 * der Peak bei 0 und ein sofortiger Verlust zählt bereits als Drawdown.
 * maxPercent bleibt 0, solange der Peak nicht positiv ist (Division sinnlos).
 */
export function drawdown(equity: EquityPoint[]): Drawdown {
  let peak = 0;
  let maxAbsolute = 0;
  let maxPercent = 0;

  const series = equity.map((p) => {
    peak = Math.max(peak, p.y);
    const dd = peak - p.y;
    if (dd > maxAbsolute) maxAbsolute = dd;
    if (peak > 0) maxPercent = Math.max(maxPercent, (100 * dd) / peak);
    return { x: p.x, y: -dd };
  });

  return { series, maxAbsolute, maxPercent };
}

// ── Performance Score ──────────────────────────────────────────────────────────

function stdev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Sechs Achsen, je 0–100 normalisiert, Gesamtwert als ungewichtetes Mittel.
 * Die Zielwerte (SCORE_TARGETS) sind bewusst exportiert, damit sich die Skala
 * später justieren lässt, ohne die Formel anzufassen.
 */
export function performanceScore(trades: MetricTrade[]): PerformanceScore {
  const pf = profitFactor(trades);
  const days = dailyPnl(trades).map((d) => d.pnl);
  const maxAbsDay = Math.max(0, ...days.map(Math.abs));
  const maxDd = drawdown(cumulativeEquity(trades)).maxAbsolute;
  const gw = grossWin(trades);

  const axes: ScoreAxis[] = [
    {
      key: "winRate",
      label: "Win %",
      value: clamp(tradeWinRate(trades), 0, 100),
    },
    {
      key: "profitFactor",
      // Kein Verlust → perfekter Faktor, nicht 0.
      label: "Profit Factor",
      value: clamp(((pf ?? SCORE_TARGETS.profitFactor) / SCORE_TARGETS.profitFactor) * 100, 0, 100),
    },
    {
      key: "avgWinLoss",
      label: "Avg Win/Loss",
      value: clamp((avgWinLossRatio(trades) / SCORE_TARGETS.avgWinLossRatio) * 100, 0, 100),
    },
    {
      key: "consistency",
      label: "Konsistenz",
      value: clamp(100 * (1 - stdev(days) / (maxAbsDay + EPSILON)), 0, 100),
    },
    {
      key: "drawdownControl",
      label: "Drawdown-Kontrolle",
      value: clamp(100 * (1 - maxDd / (gw + EPSILON)), 0, 100),
    },
    {
      key: "dayWinRate",
      label: "Day Win %",
      value: clamp(dayWinRate(trades), 0, 100),
    },
  ];

  const total =
    trades.length < MIN_TRADES_FOR_SCORE
      ? null
      : Math.round(axes.reduce((sum, a) => sum + a.value, 0) / axes.length);

  return { total, axes };
}

// ── Bündel für die KPI-Zeile ───────────────────────────────────────────────────

export function summarize(trades: MetricTrade[]): Summary {
  const pnls = trades.map((t) => t.pnl);
  const w = wins(trades).length;
  const l = losses(trades).length;

  return {
    tradeCount: trades.length,
    winCount: w,
    lossCount: l,
    scratchCount: trades.length - w - l,
    netPnl: netPnl(trades),
    grossWin: grossWin(trades),
    grossLoss: grossLoss(trades),
    tradeWinRate: tradeWinRate(trades),
    profitFactor: profitFactor(trades),
    dayWinRate: dayWinRate(trades),
    avgWin: avgWin(trades),
    avgLoss: avgLoss(trades),
    avgWinLossRatio: avgWinLossRatio(trades),
    expectancy: expectancy(trades),
    bestTrade: pnls.length ? Math.max(...pnls) : 0,
    worstTrade: pnls.length ? Math.min(...pnls) : 0,
    maxDrawdown: drawdown(cumulativeEquity(trades)).maxAbsolute,
    tradingDays: dailyPnl(trades).length,
  };
}
