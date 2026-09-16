"use client";

import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { BookMarked, ChevronDown, Settings2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { JournalManager, type JournalRow } from "@/components/trading-journal/JournalManager";
import { TradeAnalytics } from "@/components/trading-journal/TradeAnalytics";
import { TradeDetailModal } from "@/components/trading-journal/TradeDetailModal";
import { TradeForm } from "@/components/trading-journal/TradeForm";
import { TradeHistory } from "@/components/trading-journal/TradeHistory";
import type { TradeRow } from "@/components/trading-journal/types";

/** Segment-Umschalter: aktiv mit Gold-Verlauf von links und Gold-Haarlinie. */
const tabSx = (active: boolean) => ({
  variant: "ghost" as const,
  h: "36px",
  px: 4,
  fontSize: "14px",
  fontWeight: 500,
  borderRadius: "8px",
  border: "1px solid",
  borderColor: active ? "var(--cc-gold-line)" : "transparent",
  bg: active ? "linear-gradient(90deg, rgba(212, 176, 128, 0.16), rgba(212, 176, 128, 0.03))" : "transparent",
  color: active ? "var(--cc-gold-light)" : "var(--cc-text-2)",
  boxShadow: active ? "0 0 14px rgba(212, 176, 128, 0.1)" : "none",
  _hover: active
    ? { bg: "linear-gradient(90deg, rgba(212, 176, 128, 0.2), rgba(212, 176, 128, 0.05))" }
    : { bg: "rgba(255, 255, 255, 0.04)", color: "var(--cc-text)" },
  _active: { bg: "rgba(212, 176, 128, 0.12)" },
});

const cardTitleSx = {
  fontSize: "13px",
  lineHeight: "18px",
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
};

export function JournalShell() {
  const supabase = createClient();
  const journalModal = useDisclosure();
  const [tab, setTab] = useState<"log" | "history" | "analytics">("log");
  const [journals, setJournals] = useState<JournalRow[]>([]);
  const [journalId, setJournalId] = useState<string>("");
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const detailOpen = useDisclosure();

  const loadJournals = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase
      .from("trading_journals")
      .select("id,name,created_at")
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: true });
    let list = (data ?? []) as JournalRow[];
    if (list.length === 0) {
      const { data: ins } = await supabase
        .from("trading_journals")
        .insert({ user_id: u.user.id, name: "Eigenkapital" })
        .select("id,name,created_at")
        .single();
      if (ins) list = [ins as JournalRow];
    }
    setJournals(list);
    if (list.length > 0) {
      setJournalId((prev) => (prev && list.some((j) => j.id === prev) ? prev : list[0].id));
    }
  }, [supabase]);

  const loadTrades = useCallback(async () => {
    if (!journalId) return;
    const { data, error } = await supabase
      .from("trading_journal_trades")
      .select("*")
      .eq("journal_id", journalId)
      .order("trade_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (!error && data) setTrades(data as TradeRow[]);
  }, [supabase, journalId]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await loadJournals();
      setLoading(false);
    })();
  }, [loadJournals]);

  /* eslint-disable react-hooks/set-state-in-effect -- Trades des gewählten Journals aus Supabase laden */
  useEffect(() => {
    void loadTrades();
  }, [loadTrades]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const stats = useMemo(() => {
    const pnl = trades.reduce((s, t) => s + t.result_dollar, 0);
    const wins = trades.filter((t) => t.result_dollar > 0).length;
    const wr = trades.length ? Math.round((wins / trades.length) * 100) : 0;
    const avgRR =
      trades.length > 0
        ? (
            trades.reduce((s, t) => {
              const n = parseFloat((t.rr || "0").split(":")[1]?.trim() || "0");
              return s + (Number.isFinite(n) ? n : 0);
            }, 0) / trades.length
          ).toFixed(2)
        : "0.00";
    const today = new Date().toISOString().slice(0, 10);
    const todayPnl = trades.filter((t) => t.trade_date === today).reduce((s, t) => s + t.result_dollar, 0);
    return { pnl, wr, total: trades.length, avgRR, todayPnl };
  }, [trades]);

  const selectedTrade = useMemo(
    () => trades.find((t) => t.id === selectedTradeId) ?? null,
    [trades, selectedTradeId],
  );

  const fmtD = (v: number) => {
    const abs = Math.abs(v).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${v >= 0 ? "+$" : "-$"}${abs}`;
  };

  const activeJournalName = journals.find((j) => j.id === journalId)?.name ?? "Journal wählen";

  if (loading && journals.length === 0) {
    return <Text color="var(--cc-text-2)">Lädt…</Text>;
  }

  return (
    <Stack gap={5} w="100%" maxW="1120px">
      <Flex
        direction={{ base: "column", lg: "row" }}
        align={{ base: "stretch", lg: "flex-start" }}
        justify="space-between"
        gap={{ base: 5, lg: 6 }}
      >
        <Flex
          className="cc-card cc-card--still"
          direction={{ base: "column", sm: "row" }}
          align={{ base: "stretch", sm: "flex-end" }}
          gap={3}
          flex="1"
          minW={0}
          p={{ base: 4, md: 5 }}
        >
          <Box flex="1" minW={0} maxW={{ base: "100%", sm: "320px" }}>
            <Text {...cardTitleSx} color="var(--cc-text-soft)" mb={3}>
              Aktives Journal
            </Text>
            <Menu placement="bottom-start" isLazy gutter={8}>
              <MenuButton
                as={Button}
                variant="line"
                w="100%"
                h="auto"
                minH="48px"
                py={2.5}
                px={4}
                justifyContent="space-between"
                rightIcon={<ChevronDown size={18} strokeWidth={1.75} />}
                leftIcon={<BookMarked size={18} strokeWidth={1.75} color="var(--cc-gold-light)" />}
                fontSize="sm"
                _expanded={{ bg: "rgba(212, 176, 128, 0.06)", borderColor: "var(--cc-gold-line)" }}
              >
                <Text as="span" noOfLines={1} textAlign="left" flex="1">
                  {activeJournalName}
                </Text>
              </MenuButton>
              <MenuList
                zIndex={20}
                bg="var(--cc-panel-solid)"
                borderColor="var(--cc-gold-line)"
                borderRadius="10px"
                boxShadow="0 16px 40px rgba(0, 0, 0, 0.5)"
                py={1}
                minW="260px"
              >
                {journals.map((j) => {
                  const active = j.id === journalId;
                  return (
                    <MenuItem
                      key={j.id}
                      onClick={() => setJournalId(j.id)}
                      bg={active ? "rgba(212, 176, 128, 0.1)" : "transparent"}
                      color={active ? "var(--cc-gold-light)" : "var(--cc-text)"}
                      fontWeight={active ? 600 : 500}
                      fontSize="sm"
                      _hover={{ bg: "rgba(212, 176, 128, 0.1)" }}
                      _focus={{ bg: "rgba(212, 176, 128, 0.12)" }}
                    >
                      {j.name}
                    </MenuItem>
                  );
                })}
              </MenuList>
            </Menu>
          </Box>
          <Button
            variant="line"
            size="md"
            h="48px"
            px={5}
            leftIcon={<Settings2 size={18} strokeWidth={1.75} />}
            alignSelf={{ base: "stretch", sm: "flex-end" }}
            fontSize="sm"
            onClick={journalModal.onOpen}
          >
            Journale verwalten
          </Button>
        </Flex>

        <HStack
          flexWrap="wrap"
          gap={1}
          p={1}
          justify={{ base: "center", lg: "flex-end" }}
          alignSelf={{ base: "stretch", lg: "flex-start" }}
          flexShrink={0}
          border="1px solid var(--cc-line)"
          borderRadius="10px"
          bg="rgba(255, 255, 255, 0.02)"
        >
          {(
            [
              ["log", "Trade erfassen"],
              ["history", "Verlauf"],
              ["analytics", "Auswertung"],
            ] as const
          ).map(([id, label]) => (
            <Button key={id} {...tabSx(tab === id)} onClick={() => setTab(id)}>
              {label}
            </Button>
          ))}
        </HStack>
      </Flex>

      <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(5, 1fr)" }} gap={3}>
        {[
          ["Gesamt P&L", fmtD(stats.pnl), stats.pnl >= 0 ? "var(--color-profit)" : "var(--color-loss)"],
          ["Win Rate", `${stats.wr}%`, "var(--cc-gold-light)"],
          ["Trades gesamt", String(stats.total), "var(--cc-text)"],
          ["Ø RR", stats.avgRR, "var(--cc-text)"],
          ["Heute P&L", fmtD(stats.todayPnl), stats.todayPnl >= 0 ? "var(--color-profit)" : "var(--color-loss)"],
        ].map(([label, val, col], i) => {
          const hero = i === 0;
          return (
            <GridItem
              key={String(label)}
              className={hero ? "cc-card cc-card--still cc-card--hero" : "cc-card cc-card--still"}
              p={{ base: 4, md: 5 }}
              minW={0}
            >
              <Text
                {...cardTitleSx}
                fontSize="12px"
                color={hero ? "var(--cc-gold-light)" : "var(--cc-text-soft)"}
                mb={2}
                noOfLines={1}
              >
                {label}
              </Text>
              <Text fontSize={{ base: "20px", md: "22px" }} fontWeight={600} letterSpacing="-0.01em" color={col} className="cc-num">
                {val}
              </Text>
            </GridItem>
          );
        })}
      </Grid>

      <Box className="cc-card cc-card--still" p={{ base: 4, md: 6 }}>
        {tab === "log" && journalId ? <TradeForm journalId={journalId} onSaved={() => void loadTrades()} /> : null}
        {tab === "history" ? (
          <TradeHistory
            trades={trades}
            onOpenTrade={(id) => {
              setSelectedTradeId(id);
              detailOpen.onOpen();
            }}
          />
        ) : null}
        {tab === "analytics" ? <TradeAnalytics trades={trades} /> : null}
      </Box>

      <JournalManager
        isOpen={journalModal.isOpen}
        onClose={journalModal.onClose}
        journals={journals}
        currentId={journalId}
        onSelect={setJournalId}
        onChanged={() => void loadJournals().then(() => void loadTrades())}
      />

      <TradeDetailModal
        isOpen={detailOpen.isOpen}
        onClose={detailOpen.onClose}
        trade={selectedTrade}
        journalId={journalId}
        onUpdated={() => void loadTrades()}
      />
    </Stack>
  );
}
