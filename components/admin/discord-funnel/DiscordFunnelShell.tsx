"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  HStack,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  type AnalyticsResponse,
  type ExportType,
  type FunnelFilterState,
  type LeadPatchBody,
  type LeadRow,
} from "./types";
import { FilterBar } from "./FilterBar";

/* ── Context ──────────────────────────────────────────────────────────────── */

interface FunnelContextValue {
  filter: FunnelFilterState;
  setFilter: (patch: Partial<FunnelFilterState>) => void;
  search: string;
  setSearch: (v: string) => void;
  analytics: AnalyticsResponse | null;
  leads: LeadRow[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  patchLead: (id: string, body: LeadPatchBody) => Promise<void>;
  exportCsv: (type: ExportType) => void;
  channelSlugs: string[];
}

const FunnelContext = createContext<FunnelContextValue | null>(null);

/** Zugriff auf den geteilten Funnel-Datenstand (Filter, analytics, leads, Aktionen). */
export function useFunnel(): FunnelContextValue {
  const ctx = useContext(FunnelContext);
  if (!ctx) throw new Error("useFunnel must be used within <DiscordFunnelShell>");
  return ctx;
}

const INITIAL_FILTER: FunnelFilterState = {
  range: "month",
  from: "",
  to: "",
  sourceOrigin: "all",
  closer: "all",
  channel: "all",
  status: "all",
};

/** Baut die gemeinsamen Query-Params (Range + Segment-Filter) für API-Calls. */
function buildBaseParams(filter: FunnelFilterState): URLSearchParams {
  const params = new URLSearchParams({ range: filter.range });
  if (filter.range === "custom") {
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to);
  }
  if (filter.sourceOrigin !== "all") params.set("source_origin", filter.sourceOrigin);
  if (filter.closer !== "all") params.set("closer", filter.closer);
  if (filter.channel !== "all") params.set("utm_source", filter.channel);
  return params;
}

/* ── Sub-Navigation ───────────────────────────────────────────────────────── */

const TABS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/admin/discord-funnel", label: "Übersicht", exact: true },
  { href: "/admin/discord-funnel/closer", label: "Closer" },
  { href: "/admin/discord-funnel/engagement", label: "Video & Traffic" },
  { href: "/admin/discord-funnel/channels", label: "Kanäle" },
  { href: "/admin/discord-funnel/leads", label: "Leads" },
];

function SubNav() {
  const pathname = usePathname();
  return (
    <HStack
      spacing={1}
      flexWrap="wrap"
      bg="rgba(20, 21, 25, 0.55)"
      border="1px solid rgba(255,255,255,0.07)"
      borderRadius="14px"
      p={1.5}
    >
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Button
            key={t.href}
            as={Link}
            href={t.href}
            size="sm"
            className="inter-semibold"
            fontSize="sm"
            bg={active ? "rgba(212,175,55,0.16)" : "transparent"}
            color={active ? "var(--color-accent-gold-light, #E8C547)" : "var(--color-text-secondary)"}
            border="1px solid"
            borderColor={active ? "rgba(212,175,55,0.40)" : "transparent"}
            _hover={{ bg: active ? "rgba(212,175,55,0.22)" : "rgba(255,255,255,0.06)", color: "var(--color-text-primary)" }}
            borderRadius="10px"
          >
            {t.label}
          </Button>
        );
      })}
    </HStack>
  );
}

/* ── Shell (Provider + Layout-Chrome) ─────────────────────────────────────── */

export function DiscordFunnelShell({ children }: { children: ReactNode }) {
  const [filter, setFilterState] = useState<FunnelFilterState>(INITIAL_FILTER);
  const [search, setSearch] = useState("");

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchRef = useRef(search);
  searchRef.current = search;

  const setFilter = useCallback((patch: Partial<FunnelFilterState>) => {
    setFilterState((prev) => ({ ...prev, ...patch }));
  }, []);

  // Filter-Felder, die einen Auto-Reload auslösen (Custom-Datum erst per Apply).
  const reloadKey = useMemo(
    () =>
      JSON.stringify({
        range: filter.range,
        sourceOrigin: filter.sourceOrigin,
        closer: filter.closer,
        channel: filter.channel,
        status: filter.status,
        from: filter.range === "custom" ? filter.from : "",
        to: filter.range === "custom" ? filter.to : "",
      }),
    [filter],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const baseParams = buildBaseParams(filter);

      const leadParams = new URLSearchParams(baseParams);
      if (filter.status && filter.status !== "all") leadParams.set("status", filter.status);
      const searchValue = searchRef.current.trim();
      if (searchValue) leadParams.set("search", searchValue);

      const [aRes, lRes] = await Promise.all([
        fetch(`/api/admin/discord-funnel/analytics?${baseParams.toString()}`, { cache: "no-store" }),
        fetch(`/api/admin/discord-funnel/leads?${leadParams.toString()}`, { cache: "no-store" }),
      ]);

      const aJson = (await aRes.json()) as AnalyticsResponse | { ok: false; error: string };
      const lJson = (await lRes.json()) as
        | { ok: true; items: LeadRow[] }
        | { ok: false; error: string };

      if (!aRes.ok || !("ok" in aJson) || !aJson.ok) {
        setError((aJson as { error?: string }).error ?? "Analytics konnten nicht geladen werden.");
        return;
      }
      if (!lRes.ok || !lJson.ok) {
        setError((lJson as { error?: string }).error ?? "Leads konnten nicht geladen werden.");
        return;
      }
      setAnalytics(aJson);
      setLeads(lJson.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const exportCsv = useCallback(
    (type: ExportType) => {
      const params = buildBaseParams(filter);
      params.set("type", type);
      if (type === "leads") {
        if (filter.status && filter.status !== "all") params.set("status", filter.status);
        const searchValue = searchRef.current.trim();
        if (searchValue) params.set("search", searchValue);
      }
      window.open(`/api/admin/discord-funnel/export?${params.toString()}`, "_blank");
    },
    [filter],
  );

  const patchLead = useCallback(
    async (id: string, body: LeadPatchBody) => {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...(body as Partial<LeadRow>) } : l)));
      const res = await fetch(`/api/admin/discord-funnel/leads/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? "Speichern fehlgeschlagen.");
        void load();
      }
    },
    [load],
  );

  const channelSlugs = useMemo(() => {
    const set = new Set<string>();
    for (const c of analytics?.perChannel ?? []) set.add(c.utm_source);
    return [...set].sort();
  }, [analytics]);

  const value = useMemo<FunnelContextValue>(
    () => ({
      filter,
      setFilter,
      search,
      setSearch,
      analytics,
      leads,
      loading,
      error,
      reload: () => void load(),
      patchLead,
      exportCsv,
      channelSlugs,
    }),
    [filter, setFilter, search, analytics, leads, loading, error, load, patchLead, exportCsv, channelSlugs],
  );

  return (
    <FunnelContext.Provider value={value}>
      <Box maxW="1440px" mx="auto" px={{ base: 4, md: 6 }} py={8}>
        <Stack spacing={6}>
          {/* Header */}
          <Stack spacing={1.5}>
            <Text
              as="h1"
              className="inter-bold"
              fontSize={{ base: "2xl", md: "3xl" }}
              color="whiteAlpha.950"
              letterSpacing="-0.01em"
            >
              Discord Funnel
            </Text>
            <Text fontSize="sm" color="var(--color-text-secondary)" className="inter">
              Cold-Traffic-Funnel (Instagram/TikTok/YouTube → Discord → Call). Übersicht,
              Closer-Performance, Video &amp; Traffic, Kanäle und Lead-Management.
            </Text>
          </Stack>

          <SubNav />

          <FilterBar
            filter={filter}
            setFilter={setFilter}
            channels={channelSlugs}
            loading={loading}
            onApply={() => void load()}
          />

          {error ? (
            <Alert status="error" variant="subtle" bg="rgba(229,72,77,0.10)" borderRadius="12px">
              <AlertIcon />
              <Stack spacing={1}>
                <Text fontSize="sm" className="inter">
                  {error}
                </Text>
                <Button size="xs" variant="ghost" onClick={() => void load()} className="inter">
                  Erneut versuchen
                </Button>
              </Stack>
            </Alert>
          ) : null}

          {/* Content (Sub-Page). Erstes Laden zeigt einen Spinner. */}
          {loading && !analytics ? (
            <HStack py={20} justify="center">
              <Spinner color="var(--color-accent-gold)" />
            </HStack>
          ) : (
            children
          )}
        </Stack>
      </Box>
    </FunnelContext.Provider>
  );
}
