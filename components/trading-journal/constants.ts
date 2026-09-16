/**
 * Tick-Wert in $ pro Tick. Kanonisch in lib/journal/instruments.ts —
 * hier nur re-exportiert, damit klassisches Journal und Import dieselbe
 * Quelle nutzen.
 */
export { TICK_VALUE_USD } from "@/lib/journal/instruments";

export const WEEKDAYS_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

export const MONTHS_DE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

export function weekdayFromDate(isoDate: string): string {
  if (!isoDate) return "—";
  const d = new Date(`${isoDate}T12:00:00`);
  return WEEKDAYS_DE[d.getDay()] ?? "—";
}

export function strategyLabel(s: string): string {
  if (s === "scalp") return "Scalping";
  if (s === "ocrr") return "NYSE OCRR";
  if (s === "naked") return "Naked";
  return s;
}

export const SCALP_ZONE_DEFAULTS = [
  "Range High",
  "Range Low",
  "Absorption",
  "Trapped Buyers",
  "Trapped Sellers",
];

export const SCALP_PA_DEFAULTS = ["1m Body Close Candle", "5m Body Close Candle"];

export const OCRR_BIAS = ["Bullish", "Bearish", "Rotation"];

export const OCRR_CONF_DEFAULTS = [
  "ORB Breakout Long",
  "ORB Breakout Short",
  "ORB Retest Long",
  "ORB Retest Short",
  "FRVP VAL",
  "FRVP POC",
  "FRVP VAH",
  "ORB Breakout + New Balance / Price Acceptance / Erneuter Breakout",
];

export const OCRR_VOL = ["Ja — über Range", "Ja — unter Range", "Nein"];

export const NAKED_ZONE_DEFAULTS = [
  "PDVAH",
  "PDVAL",
  "PDPOC",
  "DPOC",
  "DVAL",
  "DVAH",
  "OVNVAH",
  "OVNVAL",
  "OVNPOC",
  "WPOC",
  "WVAL",
  "WVAH",
  "HVN",
  "LVN",
];

export const NAKED_BONUS_DEFAULTS = [
  "PA Zone",
  "Big Trades / Absorptionen",
  "Trapped Buyers",
  "Trapped Sellers",
];

export const NAKED_VP = ["B Profile (Balance)", "P Profile (Bullish)", "D Profile (Bearish)", "Keine Zuordnung / Unklar"];

export const NEWS_EVENTS = [
  "FOMC",
  "CPI",
  "PPI",
  "NFP",
  "GDP",
  "JOLTS",
  "PMI",
  "Unemployment Claims",
  "Average Hourly Earnings m/m",
  "Core Retail Sales m/m",
  "Kein News-Event",
];

export const ASSETS = ["NQ", "MNQ", "ES", "MES", "GC", "MGC", "CL", "MCL"] as const;

export type StrategyKey = "scalp" | "ocrr" | "naked";
