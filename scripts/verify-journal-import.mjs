/**
 * Prüft die Import-Kette (CSV → Fills → Round-Trip-Trades → Kennzahlen) gegen
 * einen echten TradingView-Orders-Export.
 *
 * Aufruf:
 *   npm run verify:journal
 *   npm run verify:journal -- "C:/Pfad/zu/Orders (1).csv"
 *
 * Ohne Argument wird die mitgelieferte Fixture unter
 * scripts/fixtures/tradovate-orders-sample.csv verwendet.
 *
 * Es gibt kein Test-Framework im Projekt; dieses Script folgt dem Muster der
 * übrigen Utilities in scripts/ und beendet sich mit Exit-Code 1 bei Abweichung.
 */

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Erlaubt den direkten Import der .ts-Quellen (Alias @/ + Extension-Auflösung).
register("./ts-loader.mjs", import.meta.url);

const here = dirname(fileURLToPath(import.meta.url));
const csvPath = process.argv[2] ?? resolve(here, "fixtures/tradovate-orders-sample.csv");

// ── Erwartete Wahrheit für die Beispieldatei ──────────────────────────────────
const EXPECTED = {
  filledFills: 10,
  ignoredRows: 5,
  trades: 5,
  openPositions: 0,
  pnls: [-340, 0, 8, 668.5, 813],
  netPnl: 1149.5,
  grossWin: 1489.5,
  grossLoss: 340,
  profitFactor: 4.38,
  tradeWinRate: 75,
  dayWinRate: 100,
  tradingDays: 2,
  dailyPnl: { "2026-07-01": 336.5, "2026-07-02": 813 },
};

let failures = 0;

function check(label, actual, expected, tolerance = 1e-6) {
  const ok =
    typeof expected === "number" && typeof actual === "number"
      ? Math.abs(actual - expected) <= tolerance
      : JSON.stringify(actual) === JSON.stringify(expected);

  if (ok) {
    console.log(`  ✓ ${label}: ${JSON.stringify(actual)}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}\n      erwartet: ${JSON.stringify(expected)}\n      erhalten: ${JSON.stringify(actual)}`);
  }
}

const { parseCsv, toObjects } = await import("../lib/journal/import/csv.ts");
const { adaptTradovate } = await import("../lib/journal/import/tradovate.ts");
const { reconstructTrades } = await import("../lib/journal/import/reconstruct.ts");
const metrics = await import("../lib/journal/metrics.ts");

console.log(`\nCSV: ${csvPath}\n`);

const raw = readFileSync(csvPath, "utf8");
const rows = toObjects(parseCsv(raw));

console.log("Parsing");
check("Zeilen (ohne Header)", rows.length, EXPECTED.filledFills + EXPECTED.ignoredRows);
check("Notional Value quote-aware geparst", rows[0]["Notional Value"], "242,046.00");

const { fills, ignoredRows, invalidRows, unresolvedProducts } = adaptTradovate(rows, "Europe/Berlin");

console.log("\nAdapter");
check("gefüllte Orders", fills.length, EXPECTED.filledFills);
check("ignorierte Zeilen (Canceled)", ignoredRows, EXPECTED.ignoredRows);
check("ungültige Zeilen", invalidRows, 0);
check("Produkte ohne Punktwert", unresolvedProducts, []);
check("Punktwert MNQ aus Notional Value", fills[0].pointValue, 2);
check("Seite getrimmt", fills[0].side, "sell");

const { trades, openPositions } = reconstructTrades(fills);

console.log("\nRekonstruktion");
check("Trades", trades.length, EXPECTED.trades);
check("offene Positionen", openPositions.length, EXPECTED.openPositions);
check("P&L je Trade", trades.map((t) => t.grossPnl), EXPECTED.pnls);
check("Richtungen", trades.map((t) => t.direction), ["short", "short", "short", "short", "long"]);
check("Trade 1 Entry/Exit", [trades[0].entryPrice, trades[0].exitPrice], [30255.75, 30298.25]);
check("Trade 5 Menge", trades[4].qty, 6);
check("dedupe_key eindeutig", new Set(trades.map((t) => t.dedupeKey)).size, EXPECTED.trades);

const metricTrades = trades.map((t) => ({
  pnl: t.grossPnl,
  date: t.tradeDate,
  exitTime: t.exitTime.toISOString(),
}));

const summary = metrics.summarize(metricTrades);

console.log("\nKennzahlen");
check("Net P&L", summary.netPnl, EXPECTED.netPnl);
check("Gross Win", summary.grossWin, EXPECTED.grossWin);
check("Gross Loss", summary.grossLoss, EXPECTED.grossLoss);
check("Profit Factor", Number(summary.profitFactor.toFixed(2)), EXPECTED.profitFactor);
check("Trade Win %", summary.tradeWinRate, EXPECTED.tradeWinRate);
check("Day Win %", summary.dayWinRate, EXPECTED.dayWinRate);
check("Handelstage", summary.tradingDays, EXPECTED.tradingDays);
check("Scratches", summary.scratchCount, 1);
check("Best / Worst Trade", [summary.bestTrade, summary.worstTrade], [813, -340]);
check("Max Drawdown", summary.maxDrawdown, 340);

const daily = Object.fromEntries(metrics.dailyPnl(metricTrades).map((d) => [d.date, d.pnl]));
check("Tages-P&L", daily, EXPECTED.dailyPnl);

const equity = metrics.cumulativeEquity(metricTrades);
check("Equity-Endstand", equity[equity.length - 1].y, EXPECTED.netPnl);

const score = metrics.performanceScore(metricTrades);
check("Performance Score berechnet", typeof score.total, "number");
check("Score-Achsen", score.axes.length, 6);

// ── Synthetische Fälle ────────────────────────────────────────────────────────
// Die Beispieldatei besteht nur aus glatten Round-Trips. Aufstocken, Teilausstieg,
// Positions-Drehung und offene Restpositionen sind aber genau die Pfade, an denen
// eine Positionsverfolgung falsch rechnet — also hier explizit geprüft.

let clock = 0;
const fill = (side, qty, price) => ({
  account: "A1",
  contract: "MNQU6",
  product: "MNQ",
  side,
  qty,
  price,
  time: new Date(Date.UTC(2026, 6, 3, 14, 0, clock++)),
  localDate: "2026-07-03",
  pointValue: 2,
  orderId: `o${clock}`,
});

console.log("\nSynthetische Fälle");

// Aufstocken: 2 @100, 2 @102 → Ø-Einstieg 101. Ausstieg 4 @106 → 5 Punkte × 4 × $2 = 40.
{
  const { trades, openPositions } = reconstructTrades([
    fill("buy", 2, 100),
    fill("buy", 2, 102),
    fill("sell", 4, 106),
  ]);
  check("Scale-in: ein Trade", trades.length, 1);
  check("Scale-in: Ø-Einstieg 101", trades[0].entryPrice, 101);
  check("Scale-in: P&L 40", trades[0].grossPnl, 40);
  check("Scale-in: keine offene Position", openPositions.length, 0);
}

// Teilausstieg: 4 @100, raus 2 @105 (+20), raus 2 @95 (−20) → ein Trade, P&L 0, Ø-Exit 100.
{
  const { trades } = reconstructTrades([fill("buy", 4, 100), fill("sell", 2, 105), fill("sell", 2, 95)]);
  check("Scale-out: ein Trade", trades.length, 1);
  check("Scale-out: P&L 0", trades[0].grossPnl, 0);
  check("Scale-out: Ø-Ausstieg 100", trades[0].exitPrice, 100);
}

// Drehung durch die Null: long 2 @100, dann sell 5 @110.
// → Trade 1 long 2 (+20 Punkte × 2 × $2 = 40), danach short 3 @110 offen.
{
  const { trades, openPositions } = reconstructTrades([fill("buy", 2, 100), fill("sell", 5, 110)]);
  check("Flip: ein geschlossener Trade", trades.length, 1);
  check("Flip: Richtung long", trades[0].direction, "long");
  check("Flip: P&L 40", trades[0].grossPnl, 40);
  check("Flip: Restposition short 3", [openPositions[0]?.direction, openPositions[0]?.qty], ["short", 3]);
}

// Offene Position am Dateiende wird nicht als Trade emittiert.
{
  const { trades, openPositions } = reconstructTrades([fill("buy", 1, 100)]);
  check("Offen: keine Trades", trades.length, 0);
  check("Offen: eine Restposition", openPositions.length, 1);
}

// Short-Round-Trip: sell 3 @200, buy 3 @190 → +10 Punkte × 3 × $2 = 60.
{
  const { trades } = reconstructTrades([fill("sell", 3, 200), fill("buy", 3, 190)]);
  check("Short: P&L 60", trades[0].grossPnl, 60);
  check("Short: Richtung short", trades[0].direction, "short");
}

// Zwei Kontrakte laufen unabhängig voneinander.
{
  const other = { ...fill("buy", 1, 50), contract: "MESU6", product: "MES" };
  const { trades } = reconstructTrades([
    fill("buy", 1, 100),
    other,
    fill("sell", 1, 101),
    { ...other, side: "sell", price: 52, time: new Date(Date.UTC(2026, 6, 3, 14, 1, 0)) },
  ]);
  check("Zwei Kontrakte: zwei Trades", trades.length, 2);
  check("Zwei Kontrakte getrennt", trades.map((t) => t.contract).sort(), ["MESU6", "MNQU6"]);
}

// Identische Round-Trips kollidieren nicht auf demselben dedupe_key.
{
  const pair = () => [fill("buy", 1, 100), fill("sell", 1, 101)];
  const fills = [...pair(), ...pair()].map((f, i) => ({
    ...f,
    time: new Date(Date.UTC(2026, 6, 3, 14, 0, i)),
  }));
  // Beide Trades absichtlich auf dieselben Zeiten zwingen.
  const forced = fills.map((f) => ({ ...f, time: new Date(Date.UTC(2026, 6, 3, 14, 0, 0)) }));
  const { trades } = reconstructTrades(forced);
  check("Duplikate: zwei Trades", trades.length, 2);
  check("Duplikate: dedupe_keys unterscheidbar", new Set(trades.map((t) => t.dedupeKey)).size, 2);
}

// Zeitzonen: dieselbe Wanduhrzeit ergibt je nach Zone einen anderen Zeitpunkt.
{
  const { wallClockToUtc, parseFillTime } = await import("../lib/journal/import/time.ts");
  const wall = parseFillTime("07/01/2026 16:03:03");
  const berlin = wallClockToUtc(wall, "Europe/Berlin");
  const utc = wallClockToUtc(wall, "UTC");
  check("Zeitzone: Berlin im Sommer = UTC+2", (utc.getTime() - berlin.getTime()) / 3600000, 2);
  check("Zeitzone: UTC-Instant korrekt", utc.toISOString(), "2026-07-01T16:03:03.000Z");
}

console.log(
  failures === 0
    ? "\n✅ Alle Prüfungen bestanden.\n"
    : `\n❌ ${failures} Prüfung(en) fehlgeschlagen.\n`,
);
process.exit(failures === 0 ? 0 : 1);
