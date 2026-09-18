"use client";

import { Box, Grid, HStack, IconButton, Stack, Text } from "@chakra-ui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { dailyPnl, type MetricTrade } from "@/lib/journal/metrics";
import { MONTHS_DE } from "./constants";
import { formatMoney, formatMoneyTight, pnlColor } from "./format";

const WEEKDAY_HEAD = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

interface Cell {
  day?: number;
  date?: string;
}

/** Lokales Heute als YYYY-MM-DD (nicht toISOString — das rechnet nach UTC um). */
function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Monatskalender mit Tages-P&L.
 *
 * Auf Mobil fällt die Wochenspalte weg und die Beträge werden kompakt gesetzt
 * (`+1,1k $`) — sieben Spalten auf 375 px lassen keinen vollen Betrag zu, und
 * ein abgeschnittener Wert ist schlechter als ein gerundeter.
 */
export function PnlCalendar({ trades }: { trades: MetricTrade[] }) {
  const now = new Date();
  const [ym, setYm] = useState<[number, number]>([now.getFullYear(), now.getMonth()]);
  const [year, month] = ym;

  const dayMap = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const map = new Map<string, { pnl: number; count: number }>();
    for (const day of dailyPnl(trades)) {
      if (day.date.startsWith(prefix)) map.set(day.date, { pnl: day.pnl, count: day.count });
    }
    return map;
  }, [trades, year, month]);

  const monthPnl = useMemo(() => [...dayMap.values()].reduce((sum, d) => sum + d.pnl, 0), [dayMap]);
  const monthTrades = useMemo(() => [...dayMap.values()].reduce((sum, d) => sum + d.count, 0), [dayMap]);

  const changeMonth = (delta: number) => {
    setYm(([y, m]) => {
      const next = m + delta;
      if (next < 0) return [y - 1, 11];
      if (next > 11) return [y + 1, 0];
      return [y, next];
    });
  };

  // Wochenstart Montag: getDay() liefert 0 für Sonntag.
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayIso();

  const weeks: Cell[][] = [];
  let week: Cell[] = Array.from({ length: firstWeekday }, () => ({}));
  for (let day = 1; day <= daysInMonth; day++) {
    week.push({ day, date: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push({});
    weeks.push(week);
  }

  const navSx = {
    variant: "ghost" as const,
    size: "sm" as const,
    color: "var(--cc-text-2)",
    _hover: { bg: "var(--j-accent-soft)", color: "var(--cc-text)" },
  };
  const gridCols = { base: "repeat(7, 1fr)", lg: "repeat(7, 1fr) 104px" };

  return (
    <Box>
      <Stack
        direction={{ base: "column", sm: "row" }}
        justify="space-between"
        align={{ base: "stretch", sm: "center" }}
        gap={3}
        mb={4}
      >
        <HStack gap={1}>
          <IconButton {...navSx} aria-label="Vorheriger Monat" icon={<ChevronLeft size={16} />} onClick={() => changeMonth(-1)} />
          <Text className="inter-semibold" fontSize="sm" minW="130px" textAlign="center" color="var(--cc-text)">
            {MONTHS_DE[month]} {year}
          </Text>
          <IconButton {...navSx} aria-label="Nächster Monat" icon={<ChevronRight size={16} />} onClick={() => changeMonth(1)} />
          <Box
            as="button"
            onClick={() => setYm([now.getFullYear(), now.getMonth()])}
            ml={1}
            px={2.5}
            py={1}
            borderRadius="md"
            fontSize="xs"
            color="var(--cc-text-2)"
            className="inter-medium"
            _hover={{ bg: "var(--j-accent-soft)", color: "var(--cc-text)" }}
          >
            Heute
          </Box>
        </HStack>

        <HStack gap={2.5} justify={{ base: "space-between", sm: "flex-end" }}>
          <Text fontSize="xs" color="var(--cc-text-3)">
            {monthTrades} {monthTrades === 1 ? "Trade" : "Trades"}
          </Text>
          <Text className="cc-num" fontSize="lg" color={monthTrades ? pnlColor(monthPnl) : "var(--cc-text-3)"} letterSpacing="-0.02em">
            {monthTrades ? formatMoney(monthPnl) : "—"}
          </Text>
        </HStack>
      </Stack>

      <Grid templateColumns={gridCols} gap="3px" mb="3px">
        {WEEKDAY_HEAD.map((day) => (
          <Text key={day} textAlign="center" fontSize="10px" color="var(--cc-text-3)" className="inter-semibold" py={1}>
            {day}
          </Text>
        ))}
        <Text
          display={{ base: "none", lg: "block" }}
          textAlign="center"
          fontSize="10px"
          color="var(--cc-text-3)"
          className="inter-semibold"
          py={1}
        >
          Woche
        </Text>
      </Grid>

      {weeks.map((cells, weekIndex) => {
        const weekPnl = cells.reduce((sum, c) => sum + (c.date ? (dayMap.get(c.date)?.pnl ?? 0) : 0), 0);
        const weekCount = cells.reduce((sum, c) => sum + (c.date ? (dayMap.get(c.date)?.count ?? 0) : 0), 0);

        return (
          <Grid key={cells.find((c) => c.date)?.date ?? weekIndex} templateColumns={gridCols} gap="3px" mb="3px">
            {cells.map((cell, cellIndex) => {
              if (!cell.date) {
                return (
                  <Box
                    key={`empty-${weekIndex}-${cellIndex}`}
                    minH={{ base: "52px", md: "72px" }}
                    borderRadius="8px"
                    bg="rgba(255,255,255,0.012)"
                  />
                );
              }

              const data = dayMap.get(cell.date);
              const isToday = cell.date === today;
              const hasPnl = Boolean(data);

              return (
                <Stack
                  key={cell.date}
                  gap={0.5}
                  minH={{ base: "52px", md: "72px" }}
                  borderRadius="8px"
                  borderWidth="1px"
                  borderColor={isToday ? "var(--j-line-strong)" : "rgba(255,255,255,0.05)"}
                  bg={
                    data && data.pnl > 0
                      ? "rgba(34,197,94,0.08)"
                      : data && data.pnl < 0
                        ? "rgba(239,68,68,0.08)"
                        : "rgba(255,255,255,0.015)"
                  }
                  p={{ base: 1, md: 2 }}
                  transition="border-color 0.12s ease"
                  _hover={hasPnl ? { borderColor: "var(--j-line-strong)" } : undefined}
                  title={data ? `${formatMoney(data.pnl)} · ${data.count} Trades` : undefined}
                >
                  <Text fontSize="10px" color={isToday ? "var(--cc-text)" : "var(--cc-text-3)"} lineHeight="1">
                    {cell.day}
                  </Text>
                  {data && (
                    <>
                      <Text
                        fontSize={{ base: "10px", md: "13px" }}
                        className="cc-num"
                        color={pnlColor(data.pnl)}
                        lineHeight="1.25"
                        noOfLines={1}
                      >
                        <Box as="span" display={{ base: "none", md: "inline" }}>{formatMoney(data.pnl)}</Box>
                        <Box as="span" display={{ base: "inline", md: "none" }}>{formatMoneyTight(data.pnl)}</Box>
                      </Text>
                      <Text fontSize="9px" color="var(--cc-text-3)" display={{ base: "none", md: "block" }}>
                        {data.count} {data.count === 1 ? "Trade" : "Trades"}
                      </Text>
                    </>
                  )}
                </Stack>
              );
            })}

            <Stack
              display={{ base: "none", lg: "flex" }}
              gap={0.5}
              borderRadius="8px"
              border="1px solid rgba(255,255,255,0.05)"
              bg="rgba(255,255,255,0.02)"
              p={2}
              justify="center"
            >
              {/* Laufende Woche innerhalb des Monats, nicht die ISO-Kalenderwoche. */}
              <Text fontSize="9px" color="var(--cc-text-3)" className="inter-semibold" letterSpacing="0.04em">
                WOCHE {weekIndex + 1}
              </Text>
              <Text fontSize="13px" className="cc-num" color={weekCount ? pnlColor(weekPnl) : "var(--cc-text-3)"}>
                {weekCount ? formatMoney(weekPnl) : "—"}
              </Text>
              <Text fontSize="9px" color="var(--cc-text-3)">
                {weekCount} {weekCount === 1 ? "Trade" : "Trades"}
              </Text>
            </Stack>
          </Grid>
        );
      })}
    </Box>
  );
}
