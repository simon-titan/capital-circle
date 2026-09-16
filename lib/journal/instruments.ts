/**
 * Kontraktspezifikationen der unterstützten Futures.
 *
 * Einzige Quelle im Projekt — `components/trading-journal/constants.ts`
 * re-exportiert TICK_VALUE_USD von hier, damit das klassische Journal und der
 * Import nie auseinanderlaufen können.
 */

/** $ pro Tick (nicht pro Punkt!). */
export const TICK_VALUE_USD: Record<string, number> = {
  NQ: 5,
  MNQ: 0.5,
  ES: 12.5,
  MES: 1.25,
  GC: 10,
  MGC: 1,
  CL: 10,
  MCL: 1,
};

/** Kleinste Preisbewegung. */
export const TICK_SIZE: Record<string, number> = {
  NQ: 0.25,
  MNQ: 0.25,
  ES: 0.25,
  MES: 0.25,
  GC: 0.1,
  MGC: 0.1,
  CL: 0.01,
  MCL: 0.01,
};

/**
 * $ pro Preispunkt — abgeleitet, nie von Hand gepflegt.
 * Beispiel MNQ: 0,50 $ / 0,25 = 2,00 $ pro Punkt.
 */
export const POINT_VALUE_USD: Record<string, number> = Object.fromEntries(
  Object.entries(TICK_VALUE_USD).map(([symbol, tickValue]) => [symbol, tickValue / TICK_SIZE[symbol]]),
);

export function pointValueOf(symbol: string): number | null {
  return POINT_VALUE_USD[symbol] ?? null;
}
