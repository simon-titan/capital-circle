/**
 * Adapter: TradingView-/Tradovate-Orders-Export → normalisierte Fills.
 *
 * Fallstricke des Formats, die hier abgefangen werden:
 *   - `Status` und `B/S` haben ein FÜHRENDES LEERZEICHEN (" Filled", " Sell").
 *   - Die Datei enthält Orders, keine Trades: `Canceled`-Zeilen sind zu verwerfen.
 *   - `Fill Time` ist die Ausführung, `Timestamp` nur die Order-Platzierung.
 *     Sortiert wird nach `Fill Time`.
 *   - `Notional Value` ist gequotet und enthält Tausendertrennzeichen.
 */

import { TICK_VALUE_USD } from "../instruments";
import { parseNumber } from "./csv";
import { parseFillTime, wallClockToIsoDate, wallClockToUtc } from "./time";

export interface Fill {
  account: string;
  contract: string;
  product: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
  /** Absoluter Ausführungszeitpunkt. */
  time: Date;
  /** Handelstag (YYYY-MM-DD) in der gewählten Import-Zeitzone. */
  localDate: string;
  /** $ pro Preispunkt. */
  pointValue: number;
  orderId: string;
}

export interface AdaptResult {
  fills: Fill[];
  /** Zeilen, die keine gefüllte Order waren (Canceled, Rejected, …). */
  ignoredRows: number;
  /** Gefüllte Zeilen, die wegen fehlender/kaputter Felder verworfen wurden. */
  invalidRows: number;
  /** Produkte ohne auflösbaren Punktwert — deren Zeilen zählen als invalid. */
  unresolvedProducts: string[];
}

/**
 * $ pro Preispunkt. Drei Quellen, absteigend nach Verlässlichkeit:
 *
 *  1. `Notional Value / (qty × price)` — steht direkt in der Datei und gilt für
 *     jedes Instrument, auch für solche, die TICK_VALUE_USD nicht kennt.
 *  2. `TICK_VALUE_USD[product] / tickSize` — unsere Tabelle, deckt 8 Futures ab.
 *  3. null → die Zeile wird verworfen, statt still mit 0 $ zu rechnen.
 */
export function resolvePointValue(args: {
  product: string;
  qty: number;
  price: number;
  notional: number | null;
  tickSize: number | null;
}): number | null {
  const { product, qty, price, notional, tickSize } = args;

  if (notional !== null && qty > 0 && price > 0) {
    const pv = notional / (qty * price);
    if (Number.isFinite(pv) && pv > 0) return pv;
  }

  const tickValue = TICK_VALUE_USD[product];
  if (tickValue !== undefined && tickSize !== null && tickSize > 0) {
    return tickValue / tickSize;
  }

  return null;
}

export function adaptTradovate(rows: Record<string, string>[], timeZone: string): AdaptResult {
  const fills: Fill[] = [];
  const unresolved = new Set<string>();
  let ignoredRows = 0;
  let invalidRows = 0;

  for (const row of rows) {
    if (row["Status"]?.trim() !== "Filled") {
      ignoredRows++;
      continue;
    }

    const side = row["B/S"]?.trim().toLowerCase();
    const wall = parseFillTime(row["Fill Time"]);
    const qty = parseNumber(row["Filled Qty"]) ?? parseNumber(row["filledQty"]);
    const price = parseNumber(row["Avg Fill Price"]) ?? parseNumber(row["avgPrice"]);
    const product = row["Product"]?.trim() ?? "";
    const contract = row["Contract"]?.trim() ?? product;

    if ((side !== "buy" && side !== "sell") || !wall || !qty || qty <= 0 || !price || !product) {
      invalidRows++;
      continue;
    }

    const pointValue = resolvePointValue({
      product,
      qty,
      price,
      notional: parseNumber(row["Notional Value"]),
      tickSize: parseNumber(row["_tickSize"]),
    });

    if (pointValue === null) {
      unresolved.add(product);
      invalidRows++;
      continue;
    }

    fills.push({
      account: row["Account"]?.trim() || "unknown",
      contract,
      product,
      side,
      qty,
      price,
      time: wallClockToUtc(wall, timeZone),
      localDate: wallClockToIsoDate(wall),
      pointValue,
      orderId: (row["Order ID"] || row["orderId"] || "").trim(),
    });
  }

  fills.sort((a, b) => a.time.getTime() - b.time.getTime());

  return { fills, ignoredRows, invalidRows, unresolvedProducts: [...unresolved] };
}
