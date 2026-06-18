"use client";

import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Collapse,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import {
  Activity,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Filter,
  PercentCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DISCORD_FUNNEL_QUESTIONS,
  DISCORD_QUESTION_IDS,
} from "@/config/discord-funnel-questions";

// ── Types ──────────────────────────────────────────────────────────────────

type RangeId = "week" | "month" | "last_month" | "custom";
type ClosedValue = "pending" | "closed_won" | "closed_lost";

interface OptionDist {
  questionId: string;
  label: string;
  options: { option: string; count: number }[];
}

interface AnalyticsResponse {
  ok: true;
  generatedAt: string;
  range: { id: RangeId; from: string | null; to: string | null };
  kpis: {
    traffic: number;
    leads: number;
    landingCvrPct: number;
    videoCompletionRatePct: number;
    applicationRatePct: number;
    bookingRatePct: number;
    closeRatePct: number;
    revenueCents: number;
  };
  funnel: { key: string; label: string; value: number; isRevenue?: boolean }[];
  contentInsights: {
    biggestBlocker: OptionDist;
    triedBefore: OptionDist;
    channelLeads: OptionDist;
    channelCloses: OptionDist;
  };
  closerPerformance: {
    calls: number;
    showUps: number;
    showUpRatePct: number;
    closeRatePct: number;
    closedWon: number;
    closedLost: number;
    revenueCents: number;
  };
  perChannel: {
    utm_source: string;
    label: string;
    visits: number;
    leads: number;
    joins: number;
    bookings: number;
  }[];
  joined: number;
  closingReady: number;
}

interface ChannelRow {
  id: string;
  label: string;
  utm_source: string;
  utm_campaign: string | null;
  created_at: string;
}

interface LeadRow {
  id: string;
  token: string;
  name: string | null;
  email: string;
  phone: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  discord_invite_sent_at: string | null;
  discord_joined_at: string | null;
  discord_user_id: string | null;
  discord_username: string | null;
  answers: Record<string, string> | null;
  questions_completed_at: string | null;
  video_watch_seconds: number | null;
  video_max_percent: number | null;
  video_completed_at: string | null;
  calendly_booked_at: string | null;
  calendly_event_uri: string | null;
  qualified: boolean | null;
  no_show: boolean | null;
  closed: ClosedValue | null;
  product: string | null;
  revenue_cents: number | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Formatters ────────────────────────────────────────────────────────────

const eurFmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const dateFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return dateFmt.format(new Date(iso));
  } catch {
    return iso;
  }
}

const RANGE_OPTIONS: { id: RangeId; label: string }[] = [
  { id: "week", label: "Diese Woche" },
  { id: "month", label: "Dieser Monat" },
  { id: "last_month", label: "Letzter Monat" },
  { id: "custom", label: "Custom Range" },
];

const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "open", label: "Offen" },
  { id: "qualified", label: "Qualifiziert" },
  { id: "calls", label: "Calls" },
  { id: "closing", label: "Bereit fürs Closing" },
  { id: "won", label: "Closed Won" },
  { id: "lost", label: "Closed Lost" },
];

// ── Main Component ───────────────────────────────────────────────────────────

export function DiscordFunnelDashboard() {
  const [range, setRange] = useState<RangeId>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const rangeQuery = useMemo(() => {
    const params = new URLSearchParams({ range });
    if (range === "custom") {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    return params.toString();
  }, [range, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const leadParams = new URLSearchParams(rangeQuery);
      if (statusFilter && statusFilter !== "all") leadParams.set("status", statusFilter);
      if (search.trim()) leadParams.set("search", search.trim());

      const [aRes, lRes] = await Promise.all([
        fetch(`/api/admin/discord-funnel/analytics?${rangeQuery}`, { cache: "no-store" }),
        fetch(`/api/admin/discord-funnel/leads?${leadParams.toString()}`, {
          cache: "no-store",
        }),
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
  }, [rangeQuery, statusFilter, search]);

  // Range-Änderungen + initiales Laden triggern reload (Suche debounced separat).
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeQuery, statusFilter]);

  // initial load
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportCsv(scope: "all" | "qualified" | "calls" | "range") {
    const params = new URLSearchParams();
    if (scope === "range") {
      // aktueller Zeitraum, alle Scopes
      const rp = new URLSearchParams(rangeQuery);
      rp.forEach((v, k) => params.set(k, v));
      params.set("scope", "all");
    } else {
      params.set("scope", scope);
    }
    window.open(`/api/admin/discord-funnel/export?${params.toString()}`, "_blank");
  }

  async function patchLead(id: string, body: Record<string, unknown>) {
    // optimistisches Update
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...(body as Partial<LeadRow>) } : l)),
    );
    const res = await fetch(`/api/admin/discord-funnel/leads/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "Speichern fehlgeschlagen.");
      // bei Fehler neu laden, um konsistenten State zu haben
      void load();
    }
  }

  if (loading && !analytics) {
    return (
      <HStack py={20} justify="center">
        <Spinner color="var(--color-accent-gold)" />
      </HStack>
    );
  }

  return (
    <Stack spacing={8}>
      {/* Toolbar: Zeitfilter + Refresh + Export */}
      <Stack spacing={3}>
        <HStack justify="space-between" flexWrap="wrap" gap={3}>
          <HStack spacing={1} flexWrap="wrap">
            {RANGE_OPTIONS.map((r) => {
              const active = range === r.id;
              return (
                <Button
                  key={r.id}
                  size="sm"
                  onClick={() => setRange(r.id)}
                  bg={active ? "rgba(212,175,55,0.16)" : "transparent"}
                  color={active ? "var(--color-accent-gold-light, #E8C547)" : "var(--color-text-secondary)"}
                  border="1px solid"
                  borderColor={active ? "rgba(212,175,55,0.45)" : "rgba(255,255,255,0.10)"}
                  _hover={{ bg: "rgba(255,255,255,0.06)" }}
                  className="inter"
                >
                  {r.label}
                </Button>
              );
            })}
          </HStack>
          <HStack spacing={2}>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<RefreshCw size={14} />}
              onClick={() => void load()}
              isLoading={loading}
              borderColor="rgba(212,175,55,0.45)"
              color="var(--color-accent-gold-light, #E8C547)"
              _hover={{ bg: "rgba(212,175,55,0.10)" }}
              className="inter"
            >
              Aktualisieren
            </Button>
          </HStack>
        </HStack>

        {range === "custom" ? (
          <HStack spacing={3} flexWrap="wrap">
            <Stack spacing={1}>
              <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
                Von
              </Text>
              <Input
                type="date"
                size="sm"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                bg="rgba(255,255,255,0.04)"
                borderColor="rgba(255,255,255,0.12)"
                color="var(--color-text-primary)"
                maxW="180px"
                className="inter"
              />
            </Stack>
            <Stack spacing={1}>
              <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
                Bis
              </Text>
              <Input
                type="date"
                size="sm"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                bg="rgba(255,255,255,0.04)"
                borderColor="rgba(255,255,255,0.12)"
                color="var(--color-text-primary)"
                maxW="180px"
                className="inter"
              />
            </Stack>
            <Button
              size="sm"
              alignSelf="flex-end"
              onClick={() => void load()}
              bg="rgba(212,175,55,0.16)"
              color="var(--color-accent-gold-light, #E8C547)"
              border="1px solid rgba(212,175,55,0.45)"
              _hover={{ bg: "rgba(212,175,55,0.24)" }}
              className="inter"
            >
              Anwenden
            </Button>
          </HStack>
        ) : null}
      </Stack>

      {error ? (
        <Alert status="error" variant="subtle" bg="rgba(229,72,77,0.10)" borderRadius="12px">
          <AlertIcon />
          <Stack spacing={1}>
            <Text fontSize="sm" className="inter">{error}</Text>
            <Button size="xs" variant="ghost" onClick={() => void load()}>
              Erneut versuchen
            </Button>
          </Stack>
        </Alert>
      ) : null}

      {analytics ? (
        <>
          <KpiSection
            kpis={analytics.kpis}
            joined={analytics.joined}
            closingReady={analytics.closingReady}
          />
          <FunnelSection funnel={analytics.funnel} />
          <ChannelsSection channels={analytics.perChannel} />
          <ContentInsightsSection insights={analytics.contentInsights} />
          <CloserPerformanceSection perf={analytics.closerPerformance} />
        </>
      ) : null}

      <LeadsSection
        leads={leads}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onSearchSubmit={() => void load()}
        onPatch={patchLead}
        onExport={exportCsv}
      />
    </Stack>
  );
}

// ── KPI Section ──────────────────────────────────────────────────────────────

function KpiSection({
  kpis,
  joined,
  closingReady,
}: {
  kpis: AnalyticsResponse["kpis"];
  joined: number;
  closingReady: number;
}) {
  return (
    <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4}>
      <StatWidget icon={<Users size={18} />} label="Traffic gesamt" value={String(kpis.traffic)} />
      <StatWidget icon={<Users size={18} />} label="Leads gesamt" value={String(kpis.leads)} />
      <StatWidget
        icon={<Share2 size={18} />}
        label="Discord beigetreten"
        value={String(joined)}
        sublabel="Leads mit Server-Join"
      />
      <StatWidget
        icon={<CalendarCheck size={18} />}
        label="Bereit fürs Closing"
        value={String(closingReady)}
        sublabel="Beigetreten + gebucht + offen"
      />
      <StatWidget
        icon={<PercentCircle size={18} />}
        label="Landing-CVR"
        value={`${kpis.landingCvrPct.toFixed(1)} %`}
        sublabel="Leads / Traffic"
      />
      <StatWidget
        icon={<PlayCircle size={18} />}
        label="Video-Completion"
        value={`${kpis.videoCompletionRatePct.toFixed(1)} %`}
        sublabel="Video fertig / Leads"
      />
      <StatWidget
        icon={<Activity size={18} />}
        label="Application-Rate"
        value={`${kpis.applicationRatePct.toFixed(1)} %`}
        sublabel="Fragen ausgefüllt / Leads"
      />
      <StatWidget
        icon={<CalendarCheck size={18} />}
        label="Booking-Rate"
        value={`${kpis.bookingRatePct.toFixed(1)} %`}
        sublabel="Calls gebucht / Leads"
      />
      <StatWidget
        icon={<PercentCircle size={18} />}
        label="Close-Rate"
        value={`${kpis.closeRatePct.toFixed(1)} %`}
        sublabel="Closed Won / gebuchte Calls"
      />
      <StatWidget
        icon={<Wallet size={18} />}
        label="Revenue gesamt"
        value={eurFmt.format(kpis.revenueCents / 100)}
      />
    </SimpleGrid>
  );
}

function StatWidget(props: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
}) {
  const { icon, label, value, sublabel } = props;
  return (
    <Box
      bg="rgba(20, 21, 25, 0.82)"
      backdropFilter="blur(20px) saturate(1.6)"
      border="1px solid rgba(255,255,255,0.09)"
      borderRadius="20px"
      p="18px 20px"
      boxShadow="0 8px 32px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.06)"
      position="relative"
      overflow="hidden"
    >
      <Stack spacing={3}>
        <HStack spacing={2} color="var(--color-accent-gold-light, #E8C547)">
          {icon}
          <Text
            fontSize="11px"
            fontWeight={500}
            letterSpacing="0.08em"
            textTransform="uppercase"
            color="#606068"
            className="inter"
          >
            {label}
          </Text>
        </HStack>
        <Text className="jetbrains-mono" fontSize="28px" fontWeight={700} lineHeight="1" color="#F0F0F2">
          {value}
        </Text>
        {sublabel ? (
          <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
            {sublabel}
          </Text>
        ) : null}
      </Stack>
    </Box>
  );
}

// ── Funnel Section ───────────────────────────────────────────────────────────

function FunnelSection({ funnel }: { funnel: AnalyticsResponse["funnel"] }) {
  // Skalierung auf den größten Nicht-Revenue-Wert (Revenue eigene Einheit).
  const max = Math.max(
    1,
    ...funnel.filter((s) => !s.isRevenue).map((s) => s.value),
  );

  return (
    <SectionCard title="Funnel-Stufen" icon={<Activity size={16} />}>
      <Stack spacing={5}>
        {funnel.map((stage) => {
          if (stage.isRevenue) {
            return (
              <Stack key={stage.key} spacing={2}>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="var(--color-text-primary)" className="inter">
                    {stage.label}
                  </Text>
                  <Text className="jetbrains-mono" fontSize="sm" color="#E8C547" fontWeight={700}>
                    {eurFmt.format(stage.value / 100)}
                  </Text>
                </HStack>
              </Stack>
            );
          }
          const pct = max > 0 ? Math.max(stage.value > 0 ? 0.02 : 0, stage.value / max) : 0;
          return (
            <Stack key={stage.key} spacing={2}>
              <HStack justify="space-between">
                <Text fontSize="sm" color="var(--color-text-primary)" className="inter">
                  {stage.label}
                </Text>
                <Text className="jetbrains-mono" fontSize="sm" color="var(--color-text-primary)">
                  {stage.value}
                </Text>
              </HStack>
              <Box bg="#1A1B1F" borderRadius="9999px" overflow="hidden" h="8px">
                <Box
                  h="full"
                  w={`${(pct * 100).toFixed(2)}%`}
                  background="linear-gradient(90deg, #A67C00 0%, #D4AF37 100%)"
                  borderRadius="9999px"
                  boxShadow="0 0 8px rgba(212,175,55,0.30)"
                  transition="width 600ms cubic-bezier(0.16, 1, 0.3, 1)"
                />
              </Box>
            </Stack>
          );
        })}
      </Stack>
    </SectionCard>
  );
}

// ── Kanäle & Tracking-Links ──────────────────────────────────────────────────

function ChannelsSection({ channels }: { channels: AnalyticsResponse["perChannel"] }) {
  const [managed, setManaged] = useState<ChannelRow[]>([]);
  const [label, setLabel] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const statsBySource = useMemo(() => {
    const m = new Map<string, AnalyticsResponse["perChannel"][number]>();
    for (const c of channels) m.set(c.utm_source, c);
    return m;
  }, [channels]);

  const loadChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/discord-funnel/channels", { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; items?: ChannelRow[]; error?: string };
      if (json.ok && json.items) setManaged(json.items);
    } catch {
      // still ignorieren — Verwaltung ist optional
    }
  }, []);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  function buildLink(source: string, campaign: string | null): string {
    const u = new URLSearchParams({ utm_source: source });
    if (campaign) u.set("utm_campaign", campaign);
    return `${origin}/discord?${u.toString()}`;
  }

  async function addChannel() {
    if (!label.trim() || !utmSource.trim()) {
      setErr("Label und utm_source sind erforderlich.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/discord-funnel/channels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          utm_source: utmSource.trim(),
          utm_campaign: utmCampaign.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setErr(json.error ?? "Kanal konnte nicht angelegt werden.");
        return;
      }
      setLabel("");
      setUtmSource("");
      setUtmCampaign("");
      await loadChannels();
    } finally {
      setBusy(false);
    }
  }

  async function deleteChannel(id: string) {
    await fetch(`/api/admin/discord-funnel/channels?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await loadChannels();
  }

  async function copyLink(link: string, id: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    } catch {
      // Clipboard nicht verfügbar
    }
  }

  // Beobachtete Quellen ohne definierten Kanal (read-only).
  const managedSources = new Set(managed.map((m) => m.utm_source));
  const unmanaged = channels.filter(
    (c) => !managedSources.has(c.utm_source) && c.visits + c.leads > 0,
  );

  return (
    <SectionCard title="Kanäle & Tracking-Links" icon={<Share2 size={16} />}>
      <Stack spacing={5}>
        {/* Anlegen */}
        <Stack
          spacing={3}
          bg="#0C0D10"
          border="1px solid rgba(255,255,255,0.07)"
          borderRadius="12px"
          p={4}
        >
          <Text className="inter-semibold" fontSize="sm" color="var(--color-text-primary)">
            Neuen Kanal anlegen
          </Text>
          <HStack spacing={3} flexWrap="wrap" align="flex-end">
            <Stack spacing={1} flex="1" minW="140px">
              <FieldLabel>Label</FieldLabel>
              <Input
                size="sm"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="z. B. YouTube"
                bg="rgba(255,255,255,0.04)"
                borderColor="rgba(255,255,255,0.12)"
                color="var(--color-text-primary)"
                className="inter"
              />
            </Stack>
            <Stack spacing={1} flex="1" minW="140px">
              <FieldLabel>utm_source</FieldLabel>
              <Input
                size="sm"
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
                placeholder="z. B. youtube"
                bg="rgba(255,255,255,0.04)"
                borderColor="rgba(255,255,255,0.12)"
                color="var(--color-text-primary)"
                className="inter jetbrains-mono"
              />
            </Stack>
            <Stack spacing={1} flex="1" minW="140px">
              <FieldLabel>utm_campaign (optional)</FieldLabel>
              <Input
                size="sm"
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                placeholder="z. B. launch-juni"
                bg="rgba(255,255,255,0.04)"
                borderColor="rgba(255,255,255,0.12)"
                color="var(--color-text-primary)"
                className="inter jetbrains-mono"
              />
            </Stack>
            <Button
              size="sm"
              onClick={() => void addChannel()}
              isLoading={busy}
              leftIcon={<Plus size={14} />}
              bg="rgba(212,175,55,0.16)"
              color="var(--color-accent-gold-light, #E8C547)"
              border="1px solid rgba(212,175,55,0.45)"
              _hover={{ bg: "rgba(212,175,55,0.24)" }}
              className="inter"
            >
              Anlegen
            </Button>
          </HStack>
          {err ? (
            <Text fontSize="xs" color="#FCA5A5" className="inter">
              {err}
            </Text>
          ) : null}
        </Stack>

        {/* Verwaltete Kanäle */}
        {managed.length === 0 ? (
          <Text fontSize="sm" color="var(--color-text-secondary)" className="inter" fontStyle="italic">
            Noch keine Kanäle angelegt. Lege oben deine Quellen (YouTube, Instagram, TikTok …) an.
          </Text>
        ) : (
          <Stack spacing={2}>
            {managed.map((ch) => {
              const stats = statsBySource.get(ch.utm_source);
              const link = buildLink(ch.utm_source, ch.utm_campaign);
              return (
                <Box
                  key={ch.id}
                  bg="#0C0D10"
                  border="1px solid rgba(255,255,255,0.07)"
                  borderRadius="12px"
                  p={4}
                >
                  <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={3}>
                    <Stack spacing={1} flex="1" minW="200px">
                      <HStack spacing={2}>
                        <Text className="inter-semibold" color="var(--color-text-primary)">
                          {ch.label}
                        </Text>
                        <Badge
                          bg="rgba(255,255,255,0.06)"
                          color="#9A9AA4"
                          border="1px solid rgba(255,255,255,0.08)"
                          borderRadius="6px"
                          fontSize="10px"
                          px={2}
                          className="jetbrains-mono"
                        >
                          {ch.utm_source}
                        </Badge>
                      </HStack>
                      <HStack
                        spacing={2}
                        bg="rgba(255,255,255,0.03)"
                        border="1px solid rgba(255,255,255,0.08)"
                        borderRadius="8px"
                        px={3}
                        py={1.5}
                        maxW="full"
                      >
                        <Text
                          fontSize="xs"
                          color="var(--color-text-secondary)"
                          className="jetbrains-mono"
                          noOfLines={1}
                          flex="1"
                        >
                          {link}
                        </Text>
                        <Button
                          size="xs"
                          variant="ghost"
                          leftIcon={<Copy size={12} />}
                          onClick={() => void copyLink(link, ch.id)}
                          color="var(--color-accent-gold-light, #E8C547)"
                          className="inter"
                        >
                          {copied === ch.id ? "Kopiert" : "Kopieren"}
                        </Button>
                      </HStack>
                    </Stack>
                    <HStack spacing={4} align="center">
                      <ChannelStat label="Besucher" value={stats?.visits ?? 0} />
                      <ChannelStat label="Leads" value={stats?.leads ?? 0} />
                      <ChannelStat label="Joins" value={stats?.joins ?? 0} />
                      <ChannelStat label="Bookings" value={stats?.bookings ?? 0} />
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => void deleteChannel(ch.id)}
                        color="#FCA5A5"
                        _hover={{ bg: "rgba(229,72,77,0.12)" }}
                        aria-label="Kanal löschen"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </HStack>
                  </HStack>
                </Box>
              );
            })}
          </Stack>
        )}

        {/* Beobachtete, nicht definierte Quellen */}
        {unmanaged.length > 0 ? (
          <Stack spacing={2}>
            <Text fontSize="xs" letterSpacing="0.12em" textTransform="uppercase" color="#606068" className="inter">
              Weitere beobachtete Quellen
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
              {unmanaged.map((c) => (
                <HStack
                  key={c.utm_source}
                  justify="space-between"
                  bg="#0C0D10"
                  border="1px solid rgba(255,255,255,0.07)"
                  borderRadius="10px"
                  px={3}
                  py={2}
                >
                  <Text fontSize="xs" color="var(--color-text-secondary)" className="jetbrains-mono" noOfLines={1}>
                    {c.utm_source}
                  </Text>
                  <HStack spacing={3}>
                    <ChannelStat label="Besucher" value={c.visits} />
                    <ChannelStat label="Leads" value={c.leads} />
                    <ChannelStat label="Bookings" value={c.bookings} />
                  </HStack>
                </HStack>
              ))}
            </SimpleGrid>
          </Stack>
        ) : null}
      </Stack>
    </SectionCard>
  );
}

function ChannelStat({ label, value }: { label: string; value: number }) {
  return (
    <Stack spacing={0} align="center" minW="52px">
      <Text className="jetbrains-mono" fontSize="sm" color="var(--color-text-primary)" fontWeight={700}>
        {value}
      </Text>
      <Text fontSize="10px" color="#606068" className="inter" textTransform="uppercase" letterSpacing="0.06em">
        {label}
      </Text>
    </Stack>
  );
}

// ── Content Insights ─────────────────────────────────────────────────────────

function ContentInsightsSection({
  insights,
}: {
  insights: AnalyticsResponse["contentInsights"];
}) {
  return (
    <SectionCard title="Content-Insights" icon={<Filter size={16} />}>
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <DistChart title="Häufigster Pain-Point" dist={insights.biggestBlocker} />
        <DistChart title="Was am meisten versucht wurde" dist={insights.triedBefore} />
        <DistChart title="Bester Kanal — nach Leads" dist={insights.channelLeads} />
        <DistChart
          title="Bester Kanal — nach Closes"
          dist={insights.channelCloses}
          accent
        />
      </SimpleGrid>
    </SectionCard>
  );
}

function DistChart({
  title,
  dist,
  accent,
}: {
  title: string;
  dist: OptionDist;
  accent?: boolean;
}) {
  const total = dist.options.reduce((acc, o) => acc + o.count, 0);
  const max = Math.max(1, ...dist.options.map((o) => o.count));
  return (
    <Box
      bg="#0C0D10"
      border="1px solid rgba(255,255,255,0.07)"
      borderRadius="12px"
      p={4}
    >
      <Text className="inter-semibold" fontSize="sm" color="var(--color-text-primary)" mb={3}>
        {title}
      </Text>
      <Stack spacing={3}>
        {dist.options.map((o) => {
          const pct = max > 0 ? o.count / max : 0;
          return (
            <Stack key={o.option} spacing={1}>
              <HStack justify="space-between" align="flex-start" gap={2}>
                <Text fontSize="xs" color="var(--color-text-secondary)" className="inter" noOfLines={2}>
                  {o.option}
                </Text>
                <Text className="jetbrains-mono" fontSize="xs" color="var(--color-text-primary)" flexShrink={0}>
                  {o.count}
                </Text>
              </HStack>
              <Box bg="#1A1B1F" borderRadius="9999px" overflow="hidden" h="6px">
                <Box
                  h="full"
                  w={`${(pct * 100).toFixed(2)}%`}
                  background={
                    accent
                      ? "linear-gradient(90deg, #34D399 0%, #10B981 100%)"
                      : "linear-gradient(90deg, #A67C00 0%, #D4AF37 100%)"
                  }
                  borderRadius="9999px"
                  transition="width 500ms ease"
                />
              </Box>
            </Stack>
          );
        })}
        {total === 0 ? (
          <Text fontSize="xs" color="#3A3A40" className="inter" fontStyle="italic">
            Keine Daten im Zeitraum.
          </Text>
        ) : null}
      </Stack>
    </Box>
  );
}

// ── Closer Performance ───────────────────────────────────────────────────────

function CloserPerformanceSection({
  perf,
}: {
  perf: AnalyticsResponse["closerPerformance"];
}) {
  return (
    <SectionCard title="Closer-Performance" icon={<CalendarCheck size={16} />}>
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        <MiniStat label="Calls" value={String(perf.calls)} />
        <MiniStat label="Show-Up-Rate" value={`${perf.showUpRatePct.toFixed(1)} %`} sub={`${perf.showUps} erschienen`} />
        <MiniStat label="Close-Rate" value={`${perf.closeRatePct.toFixed(1)} %`} sub={`${perf.closedWon} won · ${perf.closedLost} lost`} />
        <MiniStat label="Revenue" value={eurFmt.format(perf.revenueCents / 100)} />
      </SimpleGrid>
    </SectionCard>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Box
      bg="#0C0D10"
      border="1px solid rgba(255,255,255,0.07)"
      borderRadius="12px"
      p={4}
    >
      <Text
        fontSize="11px"
        fontWeight={500}
        letterSpacing="0.08em"
        textTransform="uppercase"
        color="#606068"
        className="inter"
        mb={2}
      >
        {label}
      </Text>
      <Text className="jetbrains-mono" fontSize="22px" fontWeight={700} color="#F0F0F2" lineHeight="1">
        {value}
      </Text>
      {sub ? (
        <Text fontSize="xs" color="var(--color-text-secondary)" className="inter" mt={2}>
          {sub}
        </Text>
      ) : null}
    </Box>
  );
}

// ── Leads Section ────────────────────────────────────────────────────────────

function LeadsSection(props: {
  leads: LeadRow[];
  search: string;
  setSearch: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  onSearchSubmit: () => void;
  onPatch: (id: string, body: Record<string, unknown>) => void;
  onExport: (scope: "all" | "qualified" | "calls" | "range") => void;
}) {
  const { leads, search, setSearch, statusFilter, setStatusFilter, onSearchSubmit, onPatch, onExport } =
    props;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <SectionCard
      title={`Leads (${leads.length})`}
      icon={<Users size={16} />}
      right={
        <HStack spacing={2} flexWrap="wrap">
          <Select
            size="sm"
            maxW="200px"
            value="placeholder"
            onChange={(e) => {
              const v = e.target.value as "all" | "qualified" | "calls" | "range";
              if (v === "all" || v === "qualified" || v === "calls" || v === "range") onExport(v);
            }}
            bg="rgba(255,255,255,0.04)"
            borderColor="rgba(255,255,255,0.10)"
            color="var(--color-text-primary)"
            className="inter"
            icon={<Download size={14} />}
          >
            <option value="placeholder" disabled>
              CSV-Export…
            </option>
            <option value="all">Alle Leads</option>
            <option value="qualified">Nur qualifiziert</option>
            <option value="calls">Nur Calls</option>
            <option value="range">Aktueller Zeitraum</option>
          </Select>
        </HStack>
      }
    >
      <Stack spacing={4}>
        <HStack spacing={2} flexWrap="wrap">
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.id;
            return (
              <Button
                key={f.id}
                size="xs"
                onClick={() => setStatusFilter(f.id)}
                bg={active ? "rgba(212,175,55,0.16)" : "transparent"}
                color={active ? "var(--color-accent-gold-light, #E8C547)" : "var(--color-text-secondary)"}
                border="1px solid"
                borderColor={active ? "rgba(212,175,55,0.45)" : "rgba(255,255,255,0.10)"}
                _hover={{ bg: "rgba(255,255,255,0.06)" }}
                className="inter"
              >
                {f.label}
              </Button>
            );
          })}
        </HStack>

        <InputGroup maxW="360px">
          <InputLeftElement pointerEvents="none">
            <Search size={16} color="rgba(255,255,255,0.4)" />
          </InputLeftElement>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearchSubmit();
            }}
            placeholder="Name oder E-Mail suchen… (Enter)"
            bg="rgba(255,255,255,0.04)"
            borderColor="rgba(255,255,255,0.12)"
            _hover={{ borderColor: "rgba(212,175,55,0.4)" }}
            _focus={{ borderColor: "rgba(212,175,55,0.65)", boxShadow: "0 0 0 1px rgba(212,175,55,0.45)" }}
            color="var(--color-text-primary)"
            className="inter"
          />
        </InputGroup>

        {leads.length === 0 ? (
          <Box
            py={12}
            textAlign="center"
            color="var(--color-text-secondary)"
            className="inter"
            fontSize="sm"
            border="1px dashed rgba(255,255,255,0.08)"
            borderRadius="12px"
          >
            Keine Leads in dieser Ansicht.
          </Box>
        ) : (
          <Stack spacing={2}>
            {leads.map((lead) => (
              <LeadCard
                key={`${lead.id}:${lead.product ?? ""}:${lead.revenue_cents ?? ""}:${lead.internal_notes ?? ""}`}
                lead={lead}
                isOpen={expanded.has(lead.id)}
                onToggle={() => toggle(lead.id)}
                onPatch={onPatch}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </SectionCard>
  );
}

function LeadCard(props: {
  lead: LeadRow;
  isOpen: boolean;
  onToggle: () => void;
  onPatch: (id: string, body: Record<string, unknown>) => void;
}) {
  const { lead, isOpen, onToggle, onPatch } = props;

  // lokaler State für Text-/Number-Felder (commit onBlur)
  const [product, setProduct] = useState(lead.product ?? "");
  const [revenueEur, setRevenueEur] = useState(
    lead.revenue_cents != null ? String(lead.revenue_cents / 100) : "",
  );
  const [notes, setNotes] = useState(lead.internal_notes ?? "");

  const qualifiedValue =
    lead.qualified === true ? "yes" : lead.qualified === false ? "no" : "offen";

  return (
    <Box
      borderRadius="14px"
      border="1px solid rgba(255,255,255,0.09)"
      bg="rgba(255,255,255,0.04)"
      overflow="hidden"
      transition="border-color .2s ease"
      _hover={{ borderColor: "rgba(212,175,55,0.30)" }}
    >
      <HStack
        as="button"
        onClick={onToggle}
        w="full"
        p={4}
        spacing={4}
        align="center"
        justifyContent="space-between"
        textAlign="left"
        _hover={{ bg: "rgba(255,255,255,0.02)" }}
      >
        <Stack spacing={0} flex="1" minW={0}>
          <HStack spacing={2}>
            <Text className="inter-semibold" color="var(--color-text-primary)" noOfLines={1}>
              {lead.name || "(Kein Name)"}
            </Text>
            {lead.utm_source ? (
              <Badge
                bg="rgba(255,255,255,0.06)"
                color="#9A9AA4"
                border="1px solid rgba(255,255,255,0.08)"
                borderRadius="6px"
                fontSize="10px"
                px={2}
                className="inter"
              >
                {lead.utm_source}
              </Badge>
            ) : null}
          </HStack>
          <Text fontSize="xs" className="inter" color="var(--color-text-secondary)" noOfLines={1}>
            {lead.email}
          </Text>
        </Stack>

        <HStack spacing={3} flexShrink={0} display={{ base: "none", md: "flex" }}>
          <MetaPill label="Video" value={`${lead.video_max_percent ?? 0}%`} />
          <MetaPill
            label="Fragen"
            value={lead.questions_completed_at ? "✓" : "—"}
          />
          {lead.calendly_booked_at ? (
            <Badge
              bg="rgba(52,211,153,0.12)"
              color="#34D399"
              border="1px solid rgba(52,211,153,0.3)"
              borderRadius="full"
              px={2}
              py={0.5}
              textTransform="none"
              className="inter"
            >
              Call gebucht
            </Badge>
          ) : null}
          <ClosedBadge closed={lead.closed} />
        </HStack>
        <Box color="var(--color-text-secondary)" flexShrink={0}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Box>
      </HStack>

      <Collapse in={isOpen} animateOpacity>
        <Box px={5} pb={5} pt={2} borderTop="1px solid rgba(255,255,255,0.06)">
          <Stack spacing={5}>
            {/* Meta-Zeile */}
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
              <MetaBlock label="Telefon" value={lead.phone ?? "—"} />
              <MetaBlock label="UTM Medium" value={lead.utm_medium ?? "—"} />
              <MetaBlock label="UTM Campaign" value={lead.utm_campaign ?? "—"} />
              <MetaBlock label="Erstellt" value={fmtDate(lead.created_at)} />
              <MetaBlock label="Invite gesendet" value={fmtDate(lead.discord_invite_sent_at)} />
              <MetaBlock label="Discord beigetreten" value={fmtDate(lead.discord_joined_at)} />
              <MetaBlock label="Discord-Name" value={lead.discord_username ?? "—"} />
              <MetaBlock label="Call gebucht" value={fmtDate(lead.calendly_booked_at)} />
              <MetaBlock
                label="Video"
                value={`${lead.video_max_percent ?? 0}% · ${lead.video_watch_seconds ?? 0}s${lead.video_completed_at ? " · fertig" : ""}`}
              />
            </SimpleGrid>

            {/* Antworten */}
            <Stack spacing={3}>
              <Text fontSize="xs" letterSpacing="0.12em" textTransform="uppercase" color="var(--color-accent-gold)" className="inter-semibold">
                Antworten (Closer-Kontext)
              </Text>
              {DISCORD_FUNNEL_QUESTIONS.map((q) => (
                <Stack key={q.id} spacing={1}>
                  <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
                    {q.question}
                  </Text>
                  <Text fontSize="sm" color="var(--color-text-primary)" className="inter">
                    {lead.answers?.[q.id] ?? "—"}
                  </Text>
                  <Text fontSize="11px" color="#606068" className="inter" fontStyle="italic">
                    Closer sieht: {q.closerNote}
                  </Text>
                </Stack>
              ))}
              {DISCORD_QUESTION_IDS.length === 0 ? null : null}
            </Stack>

            {/* Closer-Felder (inline editierbar) */}
            <Box
              bg="#0C0D10"
              border="1px solid rgba(255,255,255,0.07)"
              borderRadius="12px"
              p={4}
            >
              <Text fontSize="xs" letterSpacing="0.12em" textTransform="uppercase" color="var(--color-accent-gold)" className="inter-semibold" mb={3}>
                Closer-Management
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Stack spacing={1}>
                  <FieldLabel>Qualifiziert</FieldLabel>
                  <Select
                    size="sm"
                    value={qualifiedValue}
                    onChange={(e) => {
                      const v = e.target.value;
                      onPatch(lead.id, { qualified: v === "yes" ? true : v === "no" ? false : null });
                    }}
                    bg="rgba(255,255,255,0.04)"
                    borderColor="rgba(255,255,255,0.12)"
                    color="var(--color-text-primary)"
                    className="inter"
                  >
                    <option value="offen">Offen</option>
                    <option value="yes">Ja</option>
                    <option value="no">Nein</option>
                  </Select>
                </Stack>

                <Stack spacing={1}>
                  <FieldLabel>No-Show</FieldLabel>
                  <Button
                    size="sm"
                    onClick={() => onPatch(lead.id, { no_show: !lead.no_show })}
                    bg={lead.no_show ? "rgba(229,72,77,0.18)" : "rgba(255,255,255,0.04)"}
                    color={lead.no_show ? "#FCA5A5" : "var(--color-text-secondary)"}
                    border="1px solid"
                    borderColor={lead.no_show ? "rgba(229,72,77,0.45)" : "rgba(255,255,255,0.12)"}
                    _hover={{ bg: "rgba(255,255,255,0.06)" }}
                    className="inter"
                    justifyContent="flex-start"
                  >
                    {lead.no_show ? "No-Show: Ja" : "No-Show: Nein"}
                  </Button>
                </Stack>

                <Stack spacing={1}>
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    size="sm"
                    value={lead.closed ?? "pending"}
                    onChange={(e) => onPatch(lead.id, { closed: e.target.value })}
                    bg="rgba(255,255,255,0.04)"
                    borderColor="rgba(255,255,255,0.12)"
                    color="var(--color-text-primary)"
                    className="inter"
                  >
                    <option value="pending">Pending</option>
                    <option value="closed_won">Closed Won</option>
                    <option value="closed_lost">Closed Lost</option>
                  </Select>
                </Stack>

                <Stack spacing={1}>
                  <FieldLabel>Produkt</FieldLabel>
                  <Input
                    size="sm"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    onBlur={() => {
                      if (product !== (lead.product ?? "")) onPatch(lead.id, { product: product || null });
                    }}
                    placeholder="z. B. Mentoring"
                    bg="rgba(255,255,255,0.04)"
                    borderColor="rgba(255,255,255,0.12)"
                    color="var(--color-text-primary)"
                    className="inter"
                  />
                </Stack>

                <Stack spacing={1}>
                  <FieldLabel>Revenue (€)</FieldLabel>
                  <Input
                    size="sm"
                    type="number"
                    min={0}
                    step="0.01"
                    value={revenueEur}
                    onChange={(e) => setRevenueEur(e.target.value)}
                    onBlur={() => {
                      const cents = revenueEur === "" ? null : Math.round(parseFloat(revenueEur) * 100);
                      if (revenueEur !== "" && (cents === null || Number.isNaN(cents))) return;
                      if (cents !== lead.revenue_cents) onPatch(lead.id, { revenue_cents: cents });
                    }}
                    placeholder="0.00"
                    bg="rgba(255,255,255,0.04)"
                    borderColor="rgba(255,255,255,0.12)"
                    color="var(--color-text-primary)"
                    className="inter jetbrains-mono"
                  />
                </Stack>

                <Stack spacing={1} gridColumn={{ md: "1 / -1" }}>
                  <FieldLabel>Interne Notizen</FieldLabel>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={() => {
                      if (notes !== (lead.internal_notes ?? "")) onPatch(lead.id, { internal_notes: notes || null });
                    }}
                    placeholder="Gesprächsnotizen, nächste Schritte…"
                    bg="rgba(255,255,255,0.04)"
                    borderColor="rgba(255,255,255,0.12)"
                    color="var(--color-text-primary)"
                    minH="90px"
                    className="inter"
                  />
                </Stack>
              </SimpleGrid>
            </Box>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text fontSize="11px" letterSpacing="0.06em" textTransform="uppercase" color="#606068" className="inter">
      {children}
    </Text>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0} align="flex-end">
      <Text fontSize="10px" color="#606068" className="inter" textTransform="uppercase" letterSpacing="0.06em">
        {label}
      </Text>
      <Text fontSize="xs" color="var(--color-text-primary)" className="jetbrains-mono">
        {value}
      </Text>
    </Stack>
  );
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={1}>
      <FieldLabel>{label}</FieldLabel>
      <Text fontSize="sm" color="var(--color-text-primary)" className="inter" noOfLines={1}>
        {value}
      </Text>
    </Stack>
  );
}

function ClosedBadge({ closed }: { closed: ClosedValue | null }) {
  if (closed === "closed_won") {
    return (
      <Badge bg="rgba(52,211,153,0.14)" color="#34D399" border="1px solid rgba(52,211,153,0.4)" borderRadius="full" px={2} py={0.5} textTransform="none" className="inter">
        Won
      </Badge>
    );
  }
  if (closed === "closed_lost") {
    return (
      <Badge bg="rgba(248,113,113,0.14)" color="#F87171" border="1px solid rgba(248,113,113,0.4)" borderRadius="full" px={2} py={0.5} textTransform="none" className="inter">
        Lost
      </Badge>
    );
  }
  return (
    <Badge bg="rgba(245,200,74,0.14)" color="#F5C84A" border="1px solid rgba(245,200,74,0.4)" borderRadius="full" px={2} py={0.5} textTransform="none" className="inter">
      Pending
    </Badge>
  );
}

// ── Section Card ─────────────────────────────────────────────────────────────

function SectionCard(props: {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Stack spacing={4}>
      <HStack justify="space-between" flexWrap="wrap" gap={2}>
        <HStack spacing={2}>
          {props.icon ? <Box color="var(--color-accent-gold-light, #E8C547)">{props.icon}</Box> : null}
          <Text className="radley-regular" fontSize="lg" color="whiteAlpha.950">
            {props.title}
          </Text>
        </HStack>
        {props.right}
      </HStack>
      <Box>{props.children}</Box>
    </Stack>
  );
}
