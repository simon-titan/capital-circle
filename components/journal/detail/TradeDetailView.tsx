"use client";

import {
  Box,
  Button,
  Collapse,
  Grid,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  formatDate,
  formatDateLong,
  formatDuration,
  formatMoney,
  formatMoneyParts,
  formatPrice,
  formatTimeSeconds,
  pnlColor,
} from "../format";
import { useJournal } from "../JournalProvider";
import { JournalSkeleton } from "../JournalSkeleton";
import { Panel } from "../Panel";
import { SectionCard } from "../SectionCard";
import { TradeLoeschenDialog } from "../TradeLoeschenDialog";
import { DirectionBadge, tradeHref } from "../TradesTable";
import type { JournalTradeRow } from "../types";
import { TradeBilder } from "./TradeBilder";
import { TradeNotizen } from "./TradeNotizen";

type ImportInfo = { file_name: string | null; created_at: string; timezone: string | null };

/**
 * Ein Trade als eigener Journal-Eintrag: Kopf mit Ergebnis, Kennzahlen,
 * Zeitleiste, Quelle — darunter Notizen und Bilder.
 *
 * Der Trade kommt zuerst aus dem Provider (schon geladen, kein Warten). Liegt
 * er dort nicht — Direktaufruf, anderes Konto aktiv —, wird er einzeln geholt;
 * RLS sorgt dafür, dass nur eigene Trades zurückkommen.
 */
export function TradeDetailView({ tradeId }: { tradeId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { trades, loading, replaceTrade } = useJournal();

  const ausProvider = trades.find((t) => t.id === tradeId) ?? null;
  const [einzeln, setEinzeln] = useState<JournalTradeRow | null>(null);
  const [nichtGefunden, setNichtGefunden] = useState(false);
  const trade = ausProvider ?? einzeln;

  useEffect(() => {
    if (ausProvider || loading) return;
    let abgebrochen = false;
    void (async () => {
      const { data } = await supabase.from("journal_trades").select("*").eq("id", tradeId).maybeSingle();
      if (abgebrochen) return;
      if (data) setEinzeln(data as JournalTradeRow);
      else setNichtGefunden(true);
    })();
    return () => {
      abgebrochen = true;
    };
  }, [ausProvider, loading, supabase, tradeId]);

  const [importInfo, setImportInfo] = useState<ImportInfo | null>(null);
  const batchId = trade?.import_batch_id ?? null;
  useEffect(() => {
    if (!batchId) return;
    let abgebrochen = false;
    void (async () => {
      const { data } = await supabase
        .from("journal_import_batches")
        .select("file_name,created_at,timezone")
        .eq("id", batchId)
        .maybeSingle();
      if (!abgebrochen && data) setImportInfo(data as ImportInfo);
    })();
    return () => {
      abgebrochen = true;
    };
  }, [batchId, supabase]);

  const [zuLoeschen, setZuLoeschen] = useState<JournalTradeRow | null>(null);

  // Nachbarn in der Reihenfolge der Trades-Liste (neueste zuerst).
  const index = trades.findIndex((t) => t.id === tradeId);
  const neuerer = index > 0 ? trades[index - 1] : null;
  const aelterer = index >= 0 && index < trades.length - 1 ? trades[index + 1] : null;

  const aktualisiert = (row: JournalTradeRow) => {
    replaceTrade(row);
    if (!ausProvider) setEinzeln(row);
  };

  if (!trade) {
    if (nichtGefunden) {
      return (
        <Panel>
          <Stack align="center" gap={3} py={10} textAlign="center">
            <Text fontSize="lg" fontWeight={600} color="var(--cc-text)">
              Trade nicht gefunden
            </Text>
            <Text fontSize="sm" color="var(--cc-text-2)">
              Vielleicht wurde er gelöscht, oder der Link ist unvollständig.
            </Text>
            <Button as={NextLink} href="/trading-journal/trades" variant="line" size="sm">
              Zu allen Trades
            </Button>
          </Stack>
        </Panel>
      );
    }
    return <JournalSkeleton />;
  }

  const pnl = Number(trade.net_pnl);
  const brutto = Number(trade.gross_pnl);
  const entry = Number(trade.entry_price);
  const exit = Number(trade.exit_price);
  // Punkte pro Kontrakt, richtungsbereinigt: positiv heißt „für mich gelaufen“.
  const punkte = trade.direction === "long" ? exit - entry : entry - exit;
  const dauerMs = new Date(trade.exit_time).getTime() - new Date(trade.entry_time).getTime();
  const hero = formatMoneyParts(pnl);
  const ergebnis = pnl > 0 ? "Gewinn" : pnl < 0 ? "Verlust" : "Break-even";

  return (
    <Stack gap={{ base: 3, md: 4 }}>
      {/* Navigation */}
      <HStack justify="space-between" gap={3} className="cc-rise">
        <Button
          as={NextLink}
          href="/trading-journal/trades"
          variant="ghost"
          size="sm"
          px={0}
          h="auto"
          leftIcon={<ArrowLeft size={15} strokeWidth={2} />}
          color="var(--cc-text-2)"
          fontWeight={500}
          _hover={{ color: "var(--cc-gold-light)", bg: "transparent" }}
        >
          Alle Trades
        </Button>
        <HStack gap={1}>
          <IconButton
            aria-label="Neuerer Trade"
            icon={<ChevronLeft size={16} />}
            size="sm"
            variant="line"
            isDisabled={!neuerer}
            onClick={() => neuerer && router.push(tradeHref(neuerer.id))}
          />
          <IconButton
            aria-label="Älterer Trade"
            icon={<ChevronRight size={16} />}
            size="sm"
            variant="line"
            isDisabled={!aelterer}
            onClick={() => aelterer && router.push(tradeHref(aelterer.id))}
          />
        </HStack>
      </HStack>

      {/* Kopf: was, wann, Ergebnis */}
      <Panel raised>
        <Stack
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align={{ base: "flex-start", md: "center" }}
          gap={{ base: 4, md: 6 }}
        >
          <Stack gap={2} minW={0}>
            <HStack gap={2.5} flexWrap="wrap">
              <Box as="h1" fontSize={{ base: "24px", md: "30px" }} fontWeight={600} lineHeight={1.15} color="var(--cc-text)">
                {trade.symbol}
              </Box>
              {trade.contract && trade.contract !== trade.symbol ? (
                <Text className="cc-num" fontSize="sm" color="var(--cc-text-3)">
                  {trade.contract}
                </Text>
              ) : null}
              <DirectionBadge direction={trade.direction} />
            </HStack>
            <Text fontSize="sm" color="var(--cc-text-2)">
              {formatDateLong(trade.trade_date)}
              <Box as="span" className="cc-num" color="var(--cc-text-3)" ml={2}>
                {formatTimeSeconds(trade.entry_time)} – {formatTimeSeconds(trade.exit_time)}
              </Box>
            </Text>
          </Stack>

          <HStack gap={{ base: 4, md: 6 }} align="center" w={{ base: "100%", md: "auto" }} justify="space-between">
            <Stack gap={0.5} align={{ base: "flex-start", md: "flex-end" }}>
              <Text fontSize="xs" color="var(--cc-text-2)" className="inter-medium">
                {ergebnis} · Netto
              </Text>
              <HStack align="baseline" gap="0.3em" color={pnlColor(pnl)}>
                <Text className="cc-num" fontSize={{ base: "30px", md: "36px" }} lineHeight={1.1} letterSpacing="-0.03em">
                  {hero.amount}
                </Text>
                <Text className="cc-num" fontSize="1rem" opacity={0.55}>
                  {hero.currency}
                </Text>
              </HStack>
            </Stack>
            <IconButton
              aria-label="Trade löschen"
              icon={<Trash2 size={16} strokeWidth={2} />}
              variant="ghost"
              color="var(--cc-text-3)"
              _hover={{ color: "var(--cc-danger)", bg: "rgba(248, 113, 113, 0.1)" }}
              onClick={() => setZuLoeschen(trade)}
            />
          </HStack>
        </Stack>
      </Panel>

      {/* Kennzahlen + Zeitleiste/Quelle */}
      <Grid templateColumns={{ base: "1fr", xl: "1.4fr 1fr" }} gap={{ base: 3, md: 4 }}>
        <SectionCard title="Kennzahlen">
          <Grid templateColumns={{ base: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" }} gap={{ base: 4, md: 5 }}>
            <Kennzahl label="Kontrakte" wert={String(trade.qty)} />
            <Kennzahl label="Entry" wert={formatPrice(entry)} />
            <Kennzahl label="Exit" wert={formatPrice(exit)} />
            <Kennzahl
              label="Punkte"
              wert={`${punkte > 0 ? "+" : ""}${formatPrice(punkte)}`}
              farbe={pnlColor(punkte)}
            />
            <Kennzahl label="Brutto-P&L" wert={formatMoney(brutto)} farbe={pnlColor(brutto)} />
            {/* key: ändert sich der gespeicherte Wert, startet das Feld mit ihm neu. */}
            <GebuehrenFeld key={`${trade.id}-${trade.fees ?? ""}`} trade={trade} onGespeichert={aktualisiert} />
            <Kennzahl label="Netto-P&L" wert={formatMoney(pnl)} farbe={pnlColor(pnl)} />
            <Kennzahl label="Punktwert" wert={`${formatPrice(Number(trade.point_value))} $`} />
          </Grid>
        </SectionCard>

        <SectionCard title="Ablauf">
          <Stack gap={4}>
            <Zeitleiste
              entry={formatTimeSeconds(trade.entry_time)}
              exit={formatTimeSeconds(trade.exit_time)}
              dauer={formatDuration(dauerMs)}
            />
            <Quelle trade={trade} importInfo={importInfo} />
          </Stack>
        </SectionCard>
      </Grid>

      <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr" }} gap={{ base: 3, md: 4 }} alignItems="start">
        <TradeNotizen trade={trade} onGespeichert={aktualisiert} />
        <TradeBilder tradeId={trade.id} />
      </Grid>

      <TradeLoeschenDialog
        trade={zuLoeschen}
        onClose={() => setZuLoeschen(null)}
        onGeloescht={() => router.push("/trading-journal/trades")}
      />
    </Stack>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="10px" color="var(--cc-text-3)" letterSpacing="0.08em" textTransform="uppercase">
      {children}
    </Text>
  );
}

function Kennzahl({ label, wert, farbe }: { label: string; wert: string; farbe?: string }) {
  return (
    <Stack gap={1} minW={0}>
      <Label>{label}</Label>
      <Text className="cc-num" fontSize="16px" color={farbe ?? "var(--cc-text)"} isTruncated>
        {wert}
      </Text>
    </Stack>
  );
}

/**
 * Gebühren sind beim Import leer (der Orders-Export kennt sie nicht) — deshalb
 * hier direkt nachtragbar. Gespeichert wird beim Verlassen des Felds oder mit
 * Enter; `net_pnl` rechnet die Datenbank selbst neu.
 */
function GebuehrenFeld({
  trade,
  onGespeichert,
}: {
  trade: JournalTradeRow;
  onGespeichert: (row: JournalTradeRow) => void;
}) {
  const gespeichert = trade.fees === null ? "" : String(Number(trade.fees)).replace(".", ",");
  const [wert, setWert] = useState(gespeichert);
  const [status, setStatus] = useState<"ruhe" | "speichert" | "fehler">("ruhe");

  const speichern = async () => {
    const roh = wert.trim().replace(/\s|\$/g, "").replace(",", ".");
    if (roh === gespeichert.replace(",", ".")) return;
    const fees = roh === "" ? null : Number(roh);
    if (fees !== null && (!Number.isFinite(fees) || fees < 0)) {
      setStatus("fehler");
      return;
    }
    setStatus("speichert");
    try {
      const res = await fetch(`/api/journal/trades/${trade.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fees }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; trade?: JournalTradeRow } | null;
      if (!res.ok || !json?.ok || !json.trade) {
        setStatus("fehler");
        return;
      }
      onGespeichert(json.trade);
      setStatus("ruhe");
    } catch {
      setStatus("fehler");
    }
  };

  return (
    <Stack gap={1} minW={0}>
      <Label>Gebühren</Label>
      <InputGroup size="sm">
        <Input
          value={wert}
          onChange={(e) => {
            setWert(e.target.value);
            if (status === "fehler") setStatus("ruhe");
          }}
          onBlur={() => void speichern()}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder="—"
          inputMode="decimal"
          aria-label="Gebühren in Dollar"
          className="cc-num"
          fontSize="16px"
          h="28px"
          px={2}
          bg="var(--j-panel-raised)"
          borderColor={status === "fehler" ? "var(--cc-danger)" : "var(--j-line)"}
          borderRadius="6px"
          _hover={{ borderColor: "var(--j-line-strong)" }}
          _focusVisible={{ borderColor: "var(--j-accent)", boxShadow: "0 0 0 1px var(--j-accent)" }}
        />
        <InputRightElement h="28px" pointerEvents="none" color="var(--cc-text-3)" fontSize="xs">
          {status === "speichert" ? "…" : "$"}
        </InputRightElement>
      </InputGroup>
      {status === "fehler" ? (
        <Text fontSize="11px" color="var(--cc-danger)">
          Bitte eine Zahl ≥ 0 eingeben.
        </Text>
      ) : null}
    </Stack>
  );
}

function Zeitleiste({ entry, exit, dauer }: { entry: string; exit: string; dauer: string }) {
  return (
    <Stack gap={2}>
      <HStack justify="space-between" gap={3}>
        <Stack gap={0.5}>
          <Label>Entry</Label>
          <Text className="cc-num" fontSize="15px" color="var(--cc-text)">
            {entry}
          </Text>
        </Stack>
        <Stack gap={0.5} align="flex-end">
          <Label>Exit</Label>
          <Text className="cc-num" fontSize="15px" color="var(--cc-text)">
            {exit}
          </Text>
        </Stack>
      </HStack>
      <Box position="relative" h="18px" aria-hidden>
        <Box position="absolute" left="5px" right="5px" top="8px" h="2px" bg="var(--cc-line)" borderRadius="full" />
        <Box position="absolute" left={0} top="4px" w="10px" h="10px" borderRadius="full" bg="var(--cc-gold)" />
        <Box position="absolute" right={0} top="4px" w="10px" h="10px" borderRadius="full" border="2px solid var(--cc-gold)" bg="var(--cc-panel-solid)" />
      </Box>
      <Text fontSize="sm" color="var(--cc-text-2)" textAlign="center">
        Haltedauer{" "}
        <Box as="span" className="cc-num" color="var(--cc-text)">
          {dauer}
        </Box>
      </Text>
    </Stack>
  );
}

function orderIdsAus(externalIds: unknown): string[] {
  if (Array.isArray(externalIds)) return externalIds.map(String);
  if (externalIds && typeof externalIds === "object") {
    return Object.entries(externalIds as Record<string, unknown>).map(([k, v]) => `${k}: ${String(v)}`);
  }
  return [];
}

function Quelle({ trade, importInfo }: { trade: JournalTradeRow; importInfo: ImportInfo | null }) {
  const { isOpen, onToggle } = useDisclosure();
  const orderIds = orderIdsAus(trade.external_ids);
  const importiert = trade.source === "tradovate_csv";

  return (
    <Stack gap={2} pt={4} borderTop="1px solid var(--j-line)">
      <Label>Quelle</Label>
      <Text fontSize="sm" color="var(--cc-text)">
        {importiert ? "Tradovate-Import" : "Manuell erfasst"}
      </Text>
      {importiert && importInfo ? (
        <Text fontSize="xs" color="var(--cc-text-3)" wordBreak="break-all">
          {importInfo.file_name ?? "Datei"} · importiert am{" "}
          <span className="cc-num">{formatDate(importInfo.created_at.slice(0, 10))}</span>
          {importInfo.timezone ? ` · Zeitzone ${importInfo.timezone}` : ""}
        </Text>
      ) : null}
      {!importiert ? (
        <Text fontSize="xs" color="var(--cc-text-3)">
          Angelegt am <span className="cc-num">{formatDate(trade.created_at.slice(0, 10))}</span>
        </Text>
      ) : null}
      {orderIds.length > 0 ? (
        <Box>
          <Button
            variant="ghost"
            size="xs"
            px={0}
            color="var(--cc-text-2)"
            rightIcon={
              <ChevronDown
                size={14}
                style={{ transform: isOpen ? "rotate(180deg)" : undefined, transition: "transform 150ms ease" }}
              />
            }
            _hover={{ color: "var(--cc-gold-light)", bg: "transparent" }}
            onClick={onToggle}
          >
            Import-Details ({orderIds.length} {orderIds.length === 1 ? "Order" : "Orders"})
          </Button>
          <Collapse in={isOpen} animateOpacity>
            <Stack gap={1} mt={2}>
              {orderIds.map((oid) => (
                <Text key={oid} className="cc-num" fontSize="xs" color="var(--cc-text-3)" wordBreak="break-all">
                  Order {oid}
                </Text>
              ))}
            </Stack>
          </Collapse>
        </Box>
      ) : null}
    </Stack>
  );
}
