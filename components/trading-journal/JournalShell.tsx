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

  useEffect(() => {
    void loadTrades();
  }, [loadTrades]);

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

  const menuListSx = {
    bg: "rgba(12, 13, 16, 0.98)",
    borderColor: "rgba(212, 175, 55, 0.35)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
    py: 1,
    minW: "260px",
  };

  const menuItemSx = {
    bg: "transparent",
    color: "var(--color-text-primary)",
    _hover: { bg: "rgba(212, 175, 55, 0.12)" },
    _focus: { bg: "rgba(212, 175, 55, 0.14)" },
    className: "inter-medium",
  };

  if (loading && journals.length === 0) {
    return (
      <Text color="var(--color-text-tertiary)" className="inter">
        Lädt…
      </Text>
    );
  }

  return (
    <Stack gap={6} w="100%" maxW="1120px">
      <Flex
        direction={{ base: "column", lg: "row" }}
        align={{ base: "stretch", lg: "flex-start" }}
        justify="space-between"
        gap={{ base: 5, lg: 6 }}
      >
        <Flex
          direction={{ base: "column", sm: "row" }}
          align={{ base: "stretch", sm: "flex-end" }}
          gap={3}
          flex="1"
          minW={0}
          p={{ base: 4, md: 5 }}
          borderRadius="xl"
          border="1px solid rgba(212, 175, 55, 0.22)"
          bg="linear-gradient(165deg, rgba(212, 175, 55, 0.08) 0%, rgba(7, 8, 10, 0.65) 55%)"
          boxShadow="0 4px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)"
          sx={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
        >
          <Box flex="1" minW={0} maxW={{ base: "100%", sm: "320px" }}>
            <Text
              fontSize="10px"
              fontWeight={600}
              letterSpacing="0.1em"
              textTransform="uppercase"
              color="rgba(212, 175, 55, 0.85)"
              mb={2}
              className="inter-semibold"
            >
              Aktives Journal
            </Text>
            <Menu placement="bottom-start" isLazy gutter={8}>
              <MenuButton
                as={Button}
                w="100%"
                h="auto"
                minH="48px"
                py={2.5}
                px={4}
                justifyContent="space-between"
                rightIcon={<ChevronDown size={18} strokeWidth={2} />}
                leftIcon={<BookMarked size={20} strokeWidth={2} />}
                bg="rgba(255,255,255,0.05)"
                borderWidth="1px"
                borderColor="rgba(255,255,255,0.12)"
                color="var(--color-text-primary)"
                fontWeight={500}
                fontSize="sm"
                className="inter-medium"
                _hover={{
                  bg: "rgba(255,255,255,0.08)",
                  borderColor: "rgba(212, 175, 55, 0.4)",
                }}
                _active={{ bg: "rgba(212, 175, 55, 0.12)" }}
                _expanded={{ bg: "rgba(212, 175, 55, 0.1)", borderColor: "rgba(212, 175, 55, 0.45)" }}
              >
                <Text as="span" noOfLines={1} textAlign="left" flex="1">
                  {activeJournalName}
                </Text>
              </MenuButton>
              <MenuList zIndex={20} {...menuListSx}>
                {journals.map((j) => (
                  <MenuItem
                    key={j.id}
                    {...menuItemSx}
                    onClick={() => setJournalId(j.id)}
                    bg={j.id === journalId ? "rgba(212, 175, 55, 0.12)" : "transparent"}
                    fontWeight={j.id === journalId ? 600 : 500}
                  >
                    {j.name}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </Box>
          <Button
            size="md"
            h="48px"
            px={5}
            variant="outline"
            leftIcon={<Settings2 size={18} strokeWidth={2} />}
            alignSelf={{ base: "stretch", sm: "flex-end" }}
            borderColor="rgba(212, 175, 55, 0.4)"
            color="var(--color-text-primary)"
            bg="rgba(212, 175, 55, 0.06)"
            fontWeight={600}
            fontSize="sm"
            className="inter-medium"
            _hover={{
              bg: "rgba(212, 175, 55, 0.14)",
              borderColor: "rgba(212, 175, 55, 0.65)",
              boxShadow: "0 0 20px rgba(212, 175, 55, 0.15)",
            }}
            _active={{ bg: "rgba(212, 175, 55, 0.2)" }}
            onClick={journalModal.onOpen}
          >
            Journale verwalten
          </Button>
        </Flex>

        <HStack flexWrap="wrap" gap={1} justify={{ base: "center", lg: "flex-end" }} flexShrink={0}>
          {(
            [
              ["log", "Trade erfassen"],
              ["history", "Verlauf"],
              ["analytics", "Auswertung"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant={tab === id ? "solid" : "ghost"}
              {...(tab === id
                ? {
                    bg: "linear-gradient(135deg, #D4AF37 0%, #A67C00 100%)",
                    color: "white",
                    _hover: { bg: "linear-gradient(135deg, #E8C547 0%, #D4AF37 100%)" },
                  }
                : { color: "var(--color-text-tertiary)" })}
              onClick={() => setTab(id)}
              className="inter-medium"
            >
              {label}
            </Button>
          ))}
        </HStack>
      </Flex>

      <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(5, 1fr)" }} gap={3}>
        {[
          ["Gesamt P&L", fmtD(stats.pnl), stats.pnl >= 0 ? "var(--color-profit)" : "var(--color-loss)"],
          ["Win Rate", `${stats.wr}%`, "rgba(212, 175, 55, 0.95)"],
          ["Trades gesamt", String(stats.total), "var(--color-text-primary)"],
          ["Ø RR", stats.avgRR, "var(--color-text-primary)"],
          ["Heute P&L", fmtD(stats.todayPnl), stats.todayPnl >= 0 ? "var(--color-profit)" : "var(--color-loss)"],
        ].map(([label, val, col]) => (
          <GridItem key={String(label)} bg="rgba(20, 21, 25, 0.82)" border="1px solid rgba(255,255,255,0.09)" borderRadius="xl" p={4} backdropFilter="blur(20px)">
            <Text fontSize="11px" color="var(--color-text-tertiary)" textTransform="uppercase" letterSpacing="0.08em" mb={2} fontWeight={500}>
              {label}
            </Text>
            <Text fontSize="xl" fontWeight={700} color={col} className="jetbrains-mono">
              {val}
            </Text>
          </GridItem>
        ))}
      </Grid>

      <Box bg="rgba(255,255,255,0.03)" border="1px solid rgba(255,255,255,0.08)" borderRadius="2xl" p={{ base: 4, md: 6 }}>
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
