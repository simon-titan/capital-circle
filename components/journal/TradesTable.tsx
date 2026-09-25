"use client";

import {
  Badge,
  Box,
  HStack,
  IconButton,
  Input,
  Link,
  LinkBox,
  LinkOverlay,
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
import { NotebookPen, Trash2 } from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatDate, formatMoney, formatPrice, formatTime, pnlColor } from "./format";
import { TradeLoeschenDialog } from "./TradeLoeschenDialog";
import type { JournalTradeRow } from "./types";

/** Adresse der Detailansicht eines Trades. */
export function tradeHref(id: string): string {
  return `/trading-journal/trades/${id}`;
}

type ResultFilter = "all" | "win" | "loss" | "scratch";

const controlSx = {
  bg: "var(--j-panel-raised)",
  borderColor: "var(--j-line)",
  borderRadius: "8px",
  _hover: { borderColor: "var(--j-line-strong)" },
  _focusVisible: { borderColor: "var(--j-accent)", boxShadow: "0 0 0 1px var(--j-accent)" },
};

const opt = { background: "#0e1217" };

export function DirectionBadge({ direction }: { direction: "long" | "short" }) {
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

/**
 * Trades als Tabelle (ab md) bzw. Karten (darunter). Jede Zeile öffnet die
 * Detailansicht des Trades. In der vollen Liste (ohne `limit`) sitzt am
 * Zeilenende zusätzlich der Mülleimer — in der kompakten Vorschau auf dem
 * Dashboard nicht, dort wäre er zu nah an „mal eben reinschauen“.
 */
export function TradesTable({ trades, limit }: { trades: JournalTradeRow[]; limit?: number }) {
  const router = useRouter();
  const [zuLoeschen, setZuLoeschen] = useState<JournalTradeRow | null>(null);
  const mitLoeschen = !limit;
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
  if (mitLoeschen) columns.push("");

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
                <Tr
                  key={trade.id}
                  transition="background 0.12s ease"
                  _hover={{ bg: "rgba(212,176,128,0.05)" }}
                  cursor="pointer"
                  onClick={() => router.push(tradeHref(trade.id))}
                >
                  <Td {...cellSx} className="cc-num" whiteSpace="nowrap">
                    {/* Echter Link für Tastatur und Mittelklick; der Zeilenklick deckt die Maus ab. */}
                    <Link
                      as={NextLink}
                      href={tradeHref(trade.id)}
                      onClick={(e) => e.stopPropagation()}
                      _hover={{ textDecoration: "none" }}
                      _focusVisible={{ outline: "2px solid var(--cc-gold)", outlineOffset: "2px", borderRadius: "4px" }}
                    >
                      {formatDate(trade.trade_date)}
                    </Link>
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
                    {trade.notes ? <NotizMarke /> : null}
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
                  {mitLoeschen ? (
                    <Td {...cellSx} py={1} textAlign="right">
                      <LoeschKnopf
                        onClick={(e) => {
                          e.stopPropagation();
                          setZuLoeschen(trade);
                        }}
                      />
                    </Td>
                  ) : null}
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
            <LinkBox
              key={trade.id}
              borderRadius="10px"
              border="1px solid var(--j-line)"
              bg="var(--j-panel-raised)"
              p={3.5}
              _active={{ bg: "rgba(212,176,128,0.05)" }}
            >
              <HStack justify="space-between" align="start" gap={3} mb={2.5}>
                <HStack gap={2} minW={0}>
                  <LinkOverlay as={NextLink} href={tradeHref(trade.id)}>
                    <Text className="inter-semibold" fontSize="sm" color="var(--cc-text)">
                      {trade.symbol}
                    </Text>
                  </LinkOverlay>
                  <DirectionBadge direction={trade.direction} />
                  {trade.notes ? <NotizMarke /> : null}
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
                {mitLoeschen ? (
                  <Box display="flex" justifyContent="flex-end" alignItems="end" position="relative" zIndex={1}>
                    <LoeschKnopf onClick={() => setZuLoeschen(trade)} />
                  </Box>
                ) : null}
              </SimpleGrid>
            </LinkBox>
          );
        })}
      </Stack>

      {filtered.length === 0 && (
        <Text textAlign="center" py={10} fontSize="sm" color="var(--cc-text-3)">
          Keine Trades für diese Filter.
        </Text>
      )}

      {mitLoeschen ? <TradeLoeschenDialog trade={zuLoeschen} onClose={() => setZuLoeschen(null)} /> : null}
    </Box>
  );
}

/** Kleiner Hinweis „zu diesem Trade gibt es eine Notiz“. */
function NotizMarke() {
  return (
    <Box
      as="span"
      display="inline-flex"
      verticalAlign="middle"
      ml={1.5}
      color="var(--cc-gold-light)"
      title="Mit Notiz"
      aria-label="Mit Notiz"
    >
      <NotebookPen size={13} strokeWidth={2} />
    </Box>
  );
}

function LoeschKnopf({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <IconButton
      aria-label="Trade löschen"
      icon={<Trash2 size={15} strokeWidth={2} />}
      size="sm"
      variant="ghost"
      color="var(--cc-text-3)"
      _hover={{ color: "var(--cc-danger)", bg: "rgba(248, 113, 113, 0.1)" }}
      onClick={onClick}
    />
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
