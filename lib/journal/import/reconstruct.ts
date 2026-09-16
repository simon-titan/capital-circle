/**
 * Round-Trip-Rekonstruktion: Fills → geschlossene Trades.
 *
 * Ein Broker-Export listet einzelne Ausführungen. Ein "Trade" im Sinne des
 * Journals ist der Weg von Position 0 zurück auf Position 0. Dazwischen darf
 * beliebig oft auf- und abgebaut werden.
 *
 * Verfahren: Durchschnittskosten (average cost) je Kombination aus Konto und
 * Kontrakt. Jeder Fill reduziert, vergrössert oder dreht die Position; sobald
 * sie exakt 0 erreicht, ist ein Trade fertig. Dreht die Position durch die Null
 * hindurch, wird zuerst der alte Trade geschlossen und der Rest eröffnet den
 * neuen — deshalb die innere while-Schleife.
 */

import type { Fill } from "./tradovate";

export interface ReconstructedTrade {
  account: string;
  contract: string;
  product: string;
  direction: "long" | "short";
  qty: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: Date;
  exitTime: Date;
  /** Handelstag des Exits, in der Import-Zeitzone. */
  tradeDate: string;
  pointValue: number;
  grossPnl: number;
  orderIds: string[];
  dedupeKey: string;
}

export interface OpenPosition {
  account: string;
  contract: string;
  product: string;
  direction: "long" | "short";
  qty: number;
  avgEntry: number;
}

export interface ReconstructResult {
  trades: ReconstructedTrade[];
  openPositions: OpenPosition[];
}

const round2 = (n: number) => Math.round(n * 1e2) / 1e2;
const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

export function reconstructTrades(fills: Fill[]): ReconstructResult {
  const groups = new Map<string, Fill[]>();
  for (const fill of fills) {
    const key = `${fill.account}::${fill.contract}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(fill);
    else groups.set(key, [fill]);
  }

  const trades: ReconstructedTrade[] = [];
  const openPositions: OpenPosition[] = [];

  for (const group of groups.values()) {
    group.sort((a, b) => a.time.getTime() - b.time.getTime());

    let position = 0; // vorzeichenbehaftet: >0 long, <0 short
    let direction = 0; // +1 / -1
    let avgEntry = 0;
    let entryQty = 0;
    let entryNotional = 0;
    let exitQty = 0;
    let exitNotional = 0;
    let realized = 0;
    let entryTime: Date | null = null;
    let exitTime: Date | null = null;
    let exitLocalDate = "";
    let orderIds: string[] = [];

    const reset = () => {
      position = 0;
      direction = 0;
      avgEntry = 0;
      entryQty = 0;
      entryNotional = 0;
      exitQty = 0;
      exitNotional = 0;
      realized = 0;
      entryTime = null;
      exitTime = null;
      exitLocalDate = "";
      orderIds = [];
    };

    const emit = (fill: Fill) => {
      const entry = entryTime;
      const exit = exitTime;
      // Kann nicht eintreten: emit() läuft nur, wenn die Position von != 0 auf 0
      // fällt, also nach mindestens einem Eröffnungs- und einem Schliessfill.
      if (!entry || !exit || entryQty === 0 || exitQty === 0) return;

      const entryPrice = round4(entryNotional / entryQty);
      const exitPrice = round4(exitNotional / exitQty);

      trades.push({
        account: fill.account,
        contract: fill.contract,
        product: fill.product,
        direction: direction > 0 ? "long" : "short",
        qty: entryQty,
        entryPrice,
        exitPrice,
        entryTime: entry,
        exitTime: exit,
        tradeDate: exitLocalDate,
        pointValue: fill.pointValue,
        grossPnl: round2(realized),
        orderIds: [...new Set(orderIds)],
        dedupeKey: [
          fill.account,
          fill.contract,
          entry.toISOString(),
          exit.toISOString(),
          entryQty,
          entryPrice,
          exitPrice,
        ].join("|"),
      });
    };

    for (const fill of group) {
      let remaining = fill.side === "buy" ? fill.qty : -fill.qty;
      orderIds.push(fill.orderId);

      while (remaining !== 0) {
        if (position === 0) {
          // Neue Position eröffnen.
          direction = Math.sign(remaining);
          avgEntry = fill.price;
          position = remaining;
          entryQty += Math.abs(remaining);
          entryNotional += Math.abs(remaining) * fill.price;
          entryTime = fill.time;
          remaining = 0;
        } else if (Math.sign(remaining) === Math.sign(position)) {
          // Aufstocken — gewichteter Durchschnittseinstieg.
          const added = Math.abs(remaining);
          avgEntry = (avgEntry * Math.abs(position) + fill.price * added) / (Math.abs(position) + added);
          position += remaining;
          entryQty += added;
          entryNotional += added * fill.price;
          remaining = 0;
        } else {
          // Reduzieren, schliessen oder drehen.
          const closeQty = Math.min(Math.abs(remaining), Math.abs(position));
          realized += closeQty * (fill.price - avgEntry) * direction * fill.pointValue;
          exitQty += closeQty;
          exitNotional += closeQty * fill.price;
          exitTime = fill.time;
          exitLocalDate = fill.localDate;

          position += Math.sign(remaining) * closeQty;
          remaining -= Math.sign(remaining) * closeQty;

          if (position === 0) {
            emit(fill);
            reset();
            // Ein etwaiger Rest von `remaining` eröffnet im nächsten
            // Schleifendurchlauf die Gegenposition.
            orderIds.push(fill.orderId);
          }
        }
      }
    }

    if (position !== 0) {
      const first = group[0];
      openPositions.push({
        account: first.account,
        contract: first.contract,
        product: first.product,
        direction: position > 0 ? "long" : "short",
        qty: Math.abs(position),
        avgEntry: round4(avgEntry),
      });
    }
  }

  trades.sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime());
  return { trades: disambiguate(trades), openPositions };
}

/**
 * Zwei identische Round-Trips (gleiche Zeiten, Menge und Preise) würden auf
 * denselben dedupe_key fallen und am Unique-Index scheitern. Das ist extrem
 * selten, aber nicht unmöglich — deshalb bekommt jede Wiederholung eine
 * laufende Nummer. Deterministisch, also stabil über Re-Importe hinweg.
 */
function disambiguate(trades: ReconstructedTrade[]): ReconstructedTrade[] {
  const seen = new Map<string, number>();
  for (const trade of trades) {
    const count = seen.get(trade.dedupeKey) ?? 0;
    seen.set(trade.dedupeKey, count + 1);
    if (count > 0) trade.dedupeKey = `${trade.dedupeKey}#${count}`;
  }
  return trades;
}
