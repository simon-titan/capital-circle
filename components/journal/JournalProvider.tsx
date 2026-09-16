"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { MetricTrade, Summary } from "@/lib/journal/metrics";
import { summarize } from "@/lib/journal/metrics";
import { createClient } from "@/lib/supabase/client";
import type { JournalAccountRow, JournalTradeRow } from "./types";

/**
 * Lädt Konten und Trades einmalig im Journal-Layout. Weil der Provider im
 * Layout hängt, überlebt der State den Wechsel zwischen Home, Dashboard,
 * Trades und Tages-Ansicht — kein Nachladen bei jedem Tab-Klick.
 */

interface JournalContextValue {
  accounts: JournalAccountRow[];
  activeAccountId: string;
  activeAccount: JournalAccountRow | null;
  setActiveAccountId: (id: string) => void;
  trades: JournalTradeRow[];
  metricTrades: MetricTrade[];
  summary: Summary;
  loading: boolean;
  reload: () => Promise<void>;
  reloadAccounts: () => Promise<void>;
  /** Öffnet den "Trade hinzufügen"-Dialog — Sidebar, Home und Empty-State teilen ihn. */
  addTradeOpen: boolean;
  openAddTrade: () => void;
  closeAddTrade: () => void;
}

const JournalContext = createContext<JournalContextValue | null>(null);

const STORAGE_KEY = "cc:journal:activeAccount";

export function toMetricTrade(row: JournalTradeRow): MetricTrade {
  return {
    // net_pnl ist eine generierte Spalte; der Fallback greift nur, falls eine
    // Zeile älter als Migration 060 wäre.
    pnl: Number(row.net_pnl ?? row.gross_pnl),
    date: row.trade_date,
    exitTime: row.exit_time,
  };
}

export function JournalProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [accounts, setAccounts] = useState<JournalAccountRow[]>([]);
  const [activeAccountId, setActiveAccountIdState] = useState("");
  const [trades, setTrades] = useState<JournalTradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  // „Trade erfassen“ im Dashboard verlinkt /trading-journal?neu=1 — dann startet der Dialog offen.
  const [addTradeOpen, setAddTradeOpen] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("neu") === "1",
  );

  const openAddTrade = useCallback(() => setAddTradeOpen(true), []);
  const closeAddTrade = useCallback(() => setAddTradeOpen(false), []);

  // `?neu=1` nach dem Öffnen aus der URL nehmen, damit ein Reload den Dialog nicht erneut öffnet.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("neu")) return;
    url.searchParams.delete("neu");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const setActiveAccountId = useCallback((id: string) => {
    setActiveAccountIdState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Private-Mode o. ä. — die Auswahl gilt dann nur für diese Sitzung.
    }
  }, []);

  const reloadAccounts = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data } = await supabase
      .from("journal_accounts")
      .select("id,name,broker,currency,created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: true });

    let list = (data ?? []) as JournalAccountRow[];

    // Erstes Betreten: ein Standardkonto anlegen, damit der Import sofort
    // ein Ziel hat und der Nutzer nichts konfigurieren muss.
    if (list.length === 0) {
      const { data: created } = await supabase
        .from("journal_accounts")
        .insert({ user_id: auth.user.id, name: "Eigenkapital" })
        .select("id,name,broker,currency,created_at")
        .single();
      if (created) list = [created as JournalAccountRow];
    }

    setAccounts(list);
    if (list.length === 0) return;

    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }

    setActiveAccountIdState((prev) => {
      if (prev && list.some((a) => a.id === prev)) return prev;
      if (stored && list.some((a) => a.id === stored)) return stored;
      return list[0].id;
    });
  }, [supabase]);

  /** Reines Laden ohne State-Effekt — der Aufrufer entscheidet, ob er das Ergebnis noch will. */
  const fetchTrades = useCallback(
    async (accountId: string): Promise<JournalTradeRow[]> => {
      if (!accountId) return [];
      const { data, error } = await supabase
        .from("journal_trades")
        .select("*")
        .eq("account_id", accountId)
        .order("exit_time", { ascending: false });
      return error ? [] : ((data ?? []) as JournalTradeRow[]);
    },
    [supabase],
  );

  const reload = useCallback(async () => {
    await reloadAccounts();
    setTrades(await fetchTrades(activeAccountId));
  }, [reloadAccounts, fetchTrades, activeAccountId]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await reloadAccounts();
      setLoading(false);
    })();
  }, [reloadAccounts]);

  useEffect(() => {
    // Abbruch-Guard: wechselt der Nutzer schnell das Konto, darf die langsamere
    // Antwort des alten Kontos die des neuen nicht überschreiben.
    let cancelled = false;
    void (async () => {
      const rows = await fetchTrades(activeAccountId);
      if (!cancelled) setTrades(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeAccountId, fetchTrades]);

  const metricTrades = useMemo(() => trades.map(toMetricTrade), [trades]);
  const summary = useMemo(() => summarize(metricTrades), [metricTrades]);
  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === activeAccountId) ?? null,
    [accounts, activeAccountId],
  );

  const value = useMemo<JournalContextValue>(
    () => ({
      accounts,
      activeAccountId,
      activeAccount,
      setActiveAccountId,
      trades,
      metricTrades,
      summary,
      loading,
      reload,
      reloadAccounts,
      addTradeOpen,
      openAddTrade,
      closeAddTrade,
    }),
    [
      accounts,
      activeAccountId,
      activeAccount,
      setActiveAccountId,
      trades,
      metricTrades,
      summary,
      loading,
      reload,
      reloadAccounts,
      addTradeOpen,
      openAddTrade,
      closeAddTrade,
    ],
  );

  return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
}

export function useJournal(): JournalContextValue {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error("useJournal muss innerhalb von <JournalProvider> verwendet werden.");
  return ctx;
}
