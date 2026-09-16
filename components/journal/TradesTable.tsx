"use client";

import {
  Badge,
  Box,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { formatDate, formatMoney, formatPrice, formatTime, pnlColor } from "./format";
import type { JournalTradeRow } from "./types";

type ResultFilter = "all" | "win" | "loss" | "scratch";

const controlSx = {
  bg: "var(--j-panel-raised)",
  borderColor: "var(--j-line)",
  borderRadius: "8px",
  _hover: { borderColor: "var(--j-line-strong)" },
  _focusVisible: { borderColor: "var(--j-accent)", boxShadow: "0 0 0 1px var(--j-accent)" },
};

const opt = { background: "#0e1217" };

function DirectionBadge({ direction }: { direction: "long" | "short" }) {
  const long = direction === "long";
  return (
    <Badge
      bg={long ? "rgba(34,197,94,0.13)" : "rgba(239,68,68,0.13)"}
      color={long ? "var(--color-profit)" : "var(--color-loss)"}
      fontSize="10px"
      px={2}
      py={0.5}
      borderRadius="full"
      textTransform="none"
      className="inter-medium"
      fontWeight={500}
    >
      {long ? "Long" : "Short"}
    </Badge>
  );
}

export function TradesTable({ trades, limit }: { trades: JournalTradeRow[]; limit?: number }) {
  const [symbol, setSymbol] = useState("all");
  const [direction, setDirection] = useState("all");
  const [result, setResult] = useState<ResultFilter>("all");
  const [date, setDate] = useState("");

  const symbols = useMemo(() => [...new Set(trades.map((t) => t.symbol))].sort(), [trades]);

  const filtered = useMemo(() => {
    const rows = trades.filter((t) => {
      if (symbol !== "all" && t.symbol !== symbol) return false;
      if (direction !== "all" && t.direction !== direction) return false;
      if (date && t.trade_date !== date) return false;
      const pnl = Number(t.net_pnl);
      if (result === "win" && pnl <= 0) return false;
      if (result === "loss" && pnl >= 0) return false;
      if (result === "scratch" && pnl !== 0) return false;
      return true;
    });
    return limit ? rows.slice(0, limit) : rows;
  }, [trades, symbol, direction, result, date, limit]);

  const columns = ["Datum", "Zeit", "Symbol", "Richtung", "Kontr.", "Einstieg", "Ausstieg", "Netto-P&L", "Quelle"];

  return (
    <Box>
      {!limit && (
        <Stack
          direction={{ base: "column", md: "row" }}
          gap={2.5}
          mb={5}
          align={{ base: "stretch", md: "center" }}
          flexWrap="wrap"
        >
          <Select {...controlSx} size="sm" w={{ base: "100%", md: "auto" }} value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            <option value="all" style={opt}>Alle Instrumente</option>
            {symbols.map((s) => (
              <option key={s} value={s} style={opt}>{s}</option>
            ))}
          </Select>
          <Select {...controlSx} size="sm" w={{ base: "100%", md: "auto" }} value={direction} onChange={(e) => setDirection(e.target.value)}>
            <option value="all" style={opt}>Long &amp; Short</option>
            <option value="long" style={opt}>Long</option>
            <option value="short" style={opt}>Short</option>
          </Select>
          <Select {...controlSx} size="sm" w={{ base: "100%", md: "auto" }} value={result} onChange={(e) => setResult(e.target.value as ResultFilter)}>
            <option value="all" style={opt}>Alle Ergebnisse</option>
            <option value="win" style={opt}>Gewinne</option>
            <option value="loss" style={opt}>Verluste</option>
            <option value="scratch" style={opt}>Nullsummen</option>
          </Select>
          <Input {...controlSx} size="sm" w={{ base: "100%", md: "auto" }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Text fontSize="xs" color="var(--cc-text-3)" ml={{ md: "auto" }} className="cc-num" flexShrink={0}>
            {filtered.length} / {trades.length}
          </Text>
        </Stack>
      )}

      {/* Ab md die Tabelle — darunter wären neun Spalten nicht lesbar. */}
      <TableContainer display={{ base: "none", md: "block" }} overflowX="auto">
        <Table size="sm" variant="unstyled" sx={{ fontVariantNumeric: "tabular-nums" }}>
          <Thead>
            <Tr>
              {columns.map((head) => (
                <Th
                  key={head}
                  color="var(--cc-text-3)"
                  fontSize="10px"
                  fontWeight={600}
                  letterSpacing="0.06em"
                  borderBottom="1px solid var(--j-line)"
                  isNumeric={head === "Netto-P&L" || head === "Kontr."}
                  whiteSpace="nowrap"
                >
                  {head}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {filtered.map((trade) => {
              const pnl = Number(trade.net_pnl);
              const cellSx = { borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "sm", py: 3 };
              return (
                <Tr key={trade.id} transition="background 0.12s ease" _hover={{ bg: "rgba(212,176,128,0.05)" }}>
                  <Td {...cellSx} className="cc-num" whiteSpace="nowrap">
                    {formatDate(trade.trade_date)}
                  </Td>
                  <Td {...cellSx} className="cc-num" color="var(--cc-text-3)">
                    {formatTime(trade.exit_time)}
                  </Td>
                  <Td {...cellSx} className="inter-medium" whiteSpace="nowrap">
                    {trade.symbol}
                    {trade.contract && trade.contract !== trade.symbol && (
                      <Text as="span" color="var(--cc-text-3)" ml={1.5} fontSize="xs" className="cc-num">
                        {trade.contract}
                      </Text>
                    )}
                  </Td>
                  <Td {...cellSx}>
                    <DirectionBadge direction={trade.direction} />
                  </Td>
                  <Td {...cellSx} isNumeric className="cc-num">
                    {trade.qty}
                  </Td>
                  <Td {...cellSx} className="cc-num" color="var(--cc-text-2)">
                    {formatPrice(Number(trade.entry_price))}
                  </Td>
                  <Td {...cellSx} className="cc-num" color="var(--cc-text-2)">
                    {formatPrice(Number(trade.exit_price))}
                  </Td>
                  <Td {...cellSx} isNumeric>
                    <Text className="cc-num" fontSize="sm" color={pnlColor(pnl)}>
                      {formatMoney(pnl)}
                    </Text>
                  </Td>
                  <Td {...cellSx}>
                    <Text fontSize="xs" color="var(--cc-text-3)">
                      {trade.source === "manual" ? "Manuell" : "Import"}
                    </Text>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>

      {/* Unter md: eine Karte pro Trade. Alle Werte bleiben sichtbar. */}
      <Stack display={{ base: "flex", md: "none" }} gap={2.5}>
        {filtered.map((trade) => {
          const pnl = Number(trade.net_pnl);
          return (
            <Box
              key={trade.id}
              borderRadius="10px"
              border="1px solid var(--j-line)"
              bg="var(--j-panel-raised)"
              p={3.5}
            >
              <HStack justify="space-between" align="start" gap={3} mb={2.5}>
                <HStack gap={2} minW={0}>
                  <Text className="inter-semibold" fontSize="sm" color="var(--cc-text)">
                    {trade.symbol}
                  </Text>
                  <DirectionBadge direction={trade.direction} />
                </HStack>
                <Text className="cc-num" fontSize="md" color={pnlColor(pnl)} whiteSpace="nowrap">
                  {formatMoney(pnl)}
                </Text>
              </HStack>

              {/* 3 × 2 statt fünf Spalten: auf 375 px bleiben Datum und Preise vollständig lesbar. */}
              <SimpleGrid columns={3} gap={3} sx={{ fontVariantNumeric: "tabular-nums" }}>
                <MobileField label="Datum" value={formatDate(trade.trade_date)} />
                <MobileField label="Zeit" value={formatTime(trade.exit_time)} />
                <MobileField label="Kontr." value={String(trade.qty)} />
                <MobileField label="Einstieg" value={formatPrice(Number(trade.entry_price))} />
                <MobileField label="Ausstieg" value={formatPrice(Number(trade.exit_price))} />
              </SimpleGrid>
            </Box>
          );
        })}
      </Stack>

      {filtered.length === 0 && (
        <Text textAlign="center" py={10} fontSize="sm" color="var(--cc-text-3)">
          Keine Trades für diese Filter.
        </Text>
      )}
    </Box>
  );
}

function MobileField({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={0.5} minW={0}>
      <Text fontSize="10px" color="var(--cc-text-3)" letterSpacing="0.06em" textTransform="uppercase">
        {label}
      </Text>
      <Text fontSize="13px" className="cc-num" color="var(--cc-text-soft)" isTruncated>
        {value}
      </Text>
    </Stack>
  );
}
