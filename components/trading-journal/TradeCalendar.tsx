"use client";

import { Box, Button, Grid, HStack, Text } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { MONTHS_DE } from "@/components/trading-journal/constants";
import type { TradeRow } from "@/components/trading-journal/types";

const CAL_HEAD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

type Props = {
  trades: TradeRow[];
};

export function TradeCalendar({ trades }: Props) {
  const now = new Date();
  const [ym, setYm] = useState(() => [now.getFullYear(), now.getMonth()] as const);
  const calYear = ym[0];
  const calMonth = ym[1];

  const dayMap = useMemo(() => {
    const m: Record<string, { pnl: number; count: number }> = {};
    trades.forEach((t) => {
      const d = new Date(`${t.trade_date}T12:00:00`);
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        if (!m[t.trade_date]) m[t.trade_date] = { pnl: 0, count: 0 };
        m[t.trade_date].pnl += t.result_dollar;
        m[t.trade_date].count += 1;
      }
    });
    return m;
  }, [trades, calYear, calMonth]);

  const changeMonth = (dir: number) => {
    setYm(([y, mo]) => {
      let next = mo + dir;
      let yy = y;
      if (next < 0) {
        next = 11;
        yy--;
      } else if (next > 11) {
        next = 0;
        yy++;
      }
      return [yy, next] as const;
    });
  };

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayIso = new Date().toISOString().slice(0, 10);

  const monthPnl = Object.values(dayMap).reduce((s, v) => s + v.pnl, 0);

  type Cell = { d?: number; dateStr?: string; empty?: boolean };
  const rows: Cell[][] = [];
  let row: Cell[] = [];
  for (let i = 0; i < firstDay; i++) row.push({ empty: true });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    row.push({ d, dateStr });
    if (row.length === 7) {
      rows.push(row);
      row = [];
    }
  }
  while (row.length > 0 && row.length < 7) row.push({ empty: true });
  if (row.length > 0) rows.push(row);

  return (
    <Box bg="rgba(255,255,255,0.03)" border="1px solid rgba(255,255,255,0.08)" borderRadius="lg" p={5} mb={6}>
      <Text textAlign="center" fontWeight={700} fontSize="lg" mb={4} className="jetbrains-mono">
        Monatliches P&amp;L:{" "}
        <Text as="span" color={monthPnl >= 0 ? "var(--color-profit)" : "var(--color-loss)"}>
          {monthPnl >= 0 ? "+" : "-"}${Math.abs(monthPnl).toFixed(2)}
        </Text>
      </Text>
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
        <HStack>
          <Button size="sm" variant="outline" onClick={() => changeMonth(-1)}>
            ‹
          </Button>
          <Text fontWeight={700} minW="160px" textAlign="center" className="inter-semibold">
            {MONTHS_DE[calMonth]} {calYear}
          </Text>
          <Button size="sm" variant="outline" onClick={() => changeMonth(1)}>
            ›
          </Button>
        </HStack>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const t = new Date();
            setYm([t.getFullYear(), t.getMonth()] as const);
          }}
        >
          Heute
        </Button>
      </HStack>

      <Grid templateColumns="repeat(7, 1fr) 120px" gap="2px" mb="2px">
        {CAL_HEAD.map((d) => (
          <Text key={d} textAlign="center" fontSize="11px" fontWeight={600} color="var(--color-text-tertiary)" py={1}>
            {d}
          </Text>
        ))}
        <Text textAlign="center" fontSize="11px" fontWeight={700} color="var(--color-text-primary)" py={1}>
          Woche
        </Text>
      </Grid>

      {rows.map((cells, ri) => {
        const weekCells = cells.slice(0, 7);
        const rowPnl = weekCells.reduce((s, c) => s + (c.dateStr && dayMap[c.dateStr] ? dayMap[c.dateStr].pnl : 0), 0);
        const rowCnt = weekCells.reduce((s, c) => s + (c.dateStr && dayMap[c.dateStr] ? dayMap[c.dateStr].count : 0), 0);
        return (
          <Grid key={ri} templateColumns="repeat(7, 1fr) 120px" gap="2px" mb="2px">
            {weekCells.map((c, ci) => {
              if (c.empty || c.d == null) {
                return (
                  <Box key={ci} minH="72px" border="1px solid rgba(255,255,255,0.06)" borderRadius="sm" p={1} opacity={0.35} />
                );
              }
              const data = c.dateStr ? dayMap[c.dateStr] : undefined;
              const isToday = c.dateStr === todayIso;
              return (
                <Box
                  key={ci}
                  minH="72px"
                  borderWidth={isToday ? "2px" : "1px"}
                  borderColor={isToday ? "rgba(212, 175, 55, 0.6)" : "rgba(255,255,255,0.08)"}
                  borderRadius="sm"
                  p={1.5}
                  bg={data && data.pnl > 0 ? "rgba(34,197,94,0.08)" : data && data.pnl < 0 ? "rgba(239,68,68,0.08)" : "transparent"}
                >
                  <Text fontSize="11px" color="var(--color-text-tertiary)" mb={1}>
                    {c.d}
                  </Text>
                  {data ? (
                    <>
                      <Text fontSize="13px" fontWeight={700} color={data.pnl >= 0 ? "var(--color-profit)" : "var(--color-loss)"} className="jetbrains-mono">
                        {data.pnl >= 0 ? "+" : ""}
                        {data.pnl.toFixed(0)}$
                      </Text>
                      <Text fontSize="10px" color="var(--color-text-tertiary)">
                        {data.count} Trade{data.count !== 1 ? "s" : ""}
                      </Text>
                    </>
                  ) : null}
                </Box>
              );
            })}
            <Box border="1px solid rgba(255,255,255,0.08)" borderRadius="sm" p={2} bg="rgba(255,255,255,0.02)">
              <Text fontSize="10px" fontWeight={700} color="var(--color-text-tertiary)" mb={1}>
                Woche {ri + 1}
              </Text>
              <Text fontSize="14px" fontWeight={700} color={rowPnl >= 0 ? "var(--color-profit)" : "var(--color-loss)"} className="jetbrains-mono">
                {rowPnl >= 0 ? "+" : ""}
                {rowPnl.toFixed(2)}$
              </Text>
              <Text fontSize="10px" color="var(--color-text-tertiary)">
                {rowCnt} Trades
              </Text>
            </Box>
          </Grid>
        );
      })}
    </Box>
  );
}
