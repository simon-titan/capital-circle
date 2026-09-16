"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Grid,
  GridItem,
  HStack,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Mail,
  RefreshCw,
  TrendingDown,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ADMIN_CARD_CLASS,
  ADMIN_CHART,
  AdminCardTitle,
  AdminLabel,
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminCardPadding,
  adminChipProps,
  adminInputProps,
  adminInsetProps,
  adminOptionStyle,
  type AdminTone,
} from "@/components/admin/adminUi";

// ── Types ──────────────────────────────────────────────────────────────────

interface FunnelWindow {
  registrations: number;
  applicationsReviewed: number;
  approved: number;
  rejected: number;
  approvalRatePct: number;
  paidAfterApproval: number;
  paidConversionPct: number;
}

interface PaymentLogRow {
  id: string;
  userName: string | null;
  userEmail: string | null;
  amountEur: number;
  currency: string;
  status: string;
  type: "monthly" | "lifetime" | "unknown";
  createdAt: string;
  paidAt: string | null;
  stripeInvoiceId: string | null;
}

interface CancellationRow {
  id: string;
  userName: string | null;
  userEmail: string | null;
  structuredReason: string | null;
  reason: string | null;
  feedback: string | null;
  canceledAt: string;
}

interface EmailPerfRow {
  sequence: string;
  step: number;
  sent: number;
  opened: number;
  clicked: number;
  openRatePct: number;
  clickRatePct: number;
}

interface AnalyticsResponse {
  ok: true;
  generatedAt: string;
  mrr: {
    mrrEur: number;
    monthlyActiveSubs: number;
    lifetimeActive: number;
    lifetimeRevenue30dEur: number;
    monthlyPriceEur: number;
  };
  churn: {
    canceled30d: number;
    activeAtStart: number;
    churnRate30dPct: number;
  };
  funnel: { "7d": FunnelWindow; "30d": FunnelWindow };
  paymentsLog: PaymentLogRow[];
  cancellations: CancellationRow[];
  emailPerformance: EmailPerfRow[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const eurFmt = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const eurFmtCents = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateOnlyFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });

const STRUCTURED_REASON_LABELS: Record<string, string> = {
  too_expensive: "Zu teuer",
  not_enough_value: "Wenig Mehrwert",
  tech_issues: "Technische Probleme",
  other: "Anderer Grund",
};

const PAYMENT_STATUS_FILTERS = [
  { id: "all", label: "Alle" },
  { id: "succeeded", label: "Succeeded" },
  { id: "failed", label: "Failed" },
] as const;

type PaymentFilter = (typeof PAYMENT_STATUS_FILTERS)[number]["id"];

/** Kopfzeile der Grid-Tabellen (Payments, Email-Performance). */
const gridHeadProps = {
  gap: 0,
  px: 4,
  py: 2.5,
  fontSize: "12px",
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--cc-text-2)",
  borderBottom: "1px solid var(--cc-line-strong)",
  display: { base: "none", md: "grid" },
} as const;

/** Datenzeile der Grid-Tabellen. */
const gridRowProps = {
  px: 4,
  py: 3,
  borderBottom: "1px solid var(--cc-line)",
  fontSize: "14px",
  color: "var(--cc-text-soft)",
  alignItems: "center",
  transition: "background-color 120ms ease",
  _hover: { bg: "rgba(255, 255, 255, 0.03)" },
  _last: { borderBottom: "none" },
} as const;

// ── Main Component ─────────────────────────────────────────────────────────

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics", { cache: "no-store" });
      const json = (await res.json()) as
        | AnalyticsResponse
        | { ok: false; error: string };
      if (!res.ok || !("ok" in json) || !json.ok) {
        const msg =
          (json as { error?: string }).error ??
          "Analytics konnten nicht geladen werden.";
        setError(msg);
        return;
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <HStack py={20} justify="center">
        <Spinner color="var(--cc-gold)" />
      </HStack>
    );
  }

  if (error) {
    return (
      <Alert status="error" variant="subtle" {...adminAlertProps("error")}>
        <AlertIcon color={adminAlertIconColor("error")} />
        <Stack spacing={1}>
          <Text fontSize="sm">{error}</Text>
          <Button size="xs" variant="line" alignSelf="flex-start" onClick={() => void load()}>
            Erneut versuchen
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (!data) return null;

  return (
    <Stack spacing={6}>
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <Text fontSize="12px" color="var(--cc-text-2)" className="cc-num">
          Letzte Aktualisierung: {dateFmt.format(new Date(data.generatedAt))}
        </Text>
        <Button
          size="sm"
          variant="line"
          leftIcon={<RefreshCw size={14} />}
          onClick={() => void load()}
          isLoading={loading}
        >
          Aktualisieren
        </Button>
      </HStack>

      <KpiRow data={data} />
      <FunnelSection funnel={data.funnel} />
      <PaymentsSection payments={data.paymentsLog} />
      <CancellationsSection cancellations={data.cancellations} />
      <EmailPerformanceSection rows={data.emailPerformance} />
    </Stack>
  );
}

// ── KPI Row ────────────────────────────────────────────────────────────────

function KpiRow({ data }: { data: AnalyticsResponse }) {
  const churnIsPositive = data.churn.churnRate30dPct < 5; // unter 5 % = "ok"
  return (
    <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4}>
      <StatWidget
        icon={<Wallet size={16} strokeWidth={1.75} />}
        label="MRR (Monthly Recurring)"
        value={eurFmt.format(data.mrr.mrrEur)}
        sublabel={`${data.mrr.monthlyActiveSubs} aktive Monats-Abos · ${eurFmt.format(data.mrr.monthlyPriceEur)} / Monat`}
      />
      <StatWidget
        icon={<Wallet size={16} strokeWidth={1.75} />}
        label="Lifetime-Umsatz · 30d"
        value={eurFmt.format(data.mrr.lifetimeRevenue30dEur)}
        sublabel={`${data.mrr.lifetimeActive} aktive Lifetime-Mitglieder gesamt`}
      />
      <StatWidget
        icon={<TrendingDown size={16} strokeWidth={1.75} />}
        label="Churn-Rate · 30d"
        value={`${data.churn.churnRate30dPct.toFixed(1)} %`}
        sublabel={`${data.churn.canceled30d} Kündigungen · Basis: ${data.churn.activeAtStart} aktive`}
        trend={churnIsPositive ? "down" : "up"}
        trendInverted
      />
      <StatWidget
        icon={<Users size={16} strokeWidth={1.75} />}
        label="Registrierungen · 30d"
        value={String(data.funnel["30d"].registrations)}
        sublabel={`${data.funnel["7d"].registrations} in den letzten 7 Tagen`}
      />
    </SimpleGrid>
  );
}

function StatWidget(props: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  trend?: "up" | "down";
  /** Wenn true, wird `up` rot und `down` grün dargestellt (z. B. für Churn). */
  trendInverted?: boolean;
}) {
  const { icon, label, value, sublabel, trend, trendInverted } = props;

  let trendColor: string | undefined;
  if (trend) {
    const positive = trendInverted ? trend === "down" : trend === "up";
    trendColor = positive ? "var(--cc-success)" : "var(--cc-danger)";
  }

  return (
    <Box className={ADMIN_CARD_CLASS} p={adminCardPadding}>
      <Stack spacing={3}>
        <HStack justify="space-between">
          <HStack spacing={2} color="var(--cc-text-2)">
            {icon}
            <AdminLabel>{label}</AdminLabel>
          </HStack>
          {trend && trendColor ? (
            <HStack spacing={1} color={trendColor}>
              {trend === "up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            </HStack>
          ) : null}
        </HStack>
        <Text
          className="cc-num"
          fontSize="28px"
          fontWeight={600}
          letterSpacing="-0.02em"
          lineHeight="1"
          color="var(--cc-text)"
        >
          {value}
        </Text>
        {sublabel ? (
          <Text fontSize="12px" color="var(--cc-text-2)" className="cc-num">
            {sublabel}
          </Text>
        ) : null}
      </Stack>
    </Box>
  );
}

// ── Funnel ─────────────────────────────────────────────────────────────────

function FunnelSection({ funnel }: { funnel: AnalyticsResponse["funnel"] }) {
  const [tab, setTab] = useState<"7d" | "30d">("30d");
  const w = funnel[tab];

  const max = Math.max(
    w.registrations,
    w.applicationsReviewed,
    w.approved,
    w.paidAfterApproval,
    1,
  );

  return (
    <SectionCard
      title="Funnel-Konversion"
      icon={<Activity size={16} strokeWidth={1.75} />}
      right={
        <HStack spacing={1.5}>
          {(["7d", "30d"] as const).map((id) => {
            const active = tab === id;
            return (
              <Button key={id} {...adminChipProps(active)} size="xs" onClick={() => setTab(id)}>
                {id === "7d" ? "7 Tage" : "30 Tage"}
              </Button>
            );
          })}
        </HStack>
      }
    >
      <Stack spacing={5}>
        <FunnelBar label="Registrierungen" value={w.registrations} max={max} />
        <FunnelBar
          label="Bewerbungen reviewed"
          value={w.applicationsReviewed}
          max={max}
          subtext={`${w.approved} angenommen · ${w.rejected} abgelehnt`}
        />
        <FunnelBar
          label="Approved"
          value={w.approved}
          max={max}
          subtext={`Approval-Rate ${w.approvalRatePct.toFixed(1)} %`}
        />
        <FunnelBar
          label="Paid nach Approval"
          value={w.paidAfterApproval}
          max={max}
          subtext={`Paid-Konversion ${w.paidConversionPct.toFixed(1)} %`}
        />
      </Stack>
    </SectionCard>
  );
}

function FunnelBar(props: {
  label: string;
  value: number;
  max: number;
  subtext?: string;
}) {
  const { label, value, max, subtext } = props;
  const pct = max > 0 ? Math.max(0.02, value / max) : 0;

  return (
    <Stack spacing={2}>
      <HStack justify="space-between">
        <Text fontSize="14px" color="var(--cc-text-soft)">
          {label}
        </Text>
        <Text className="cc-num" fontSize="14px" fontWeight={600} color="var(--cc-text)">
          {value}
        </Text>
      </HStack>
      <Box bg={ADMIN_CHART.track} borderRadius="full" overflow="hidden" h="8px">
        <Box
          h="full"
          w={`${(pct * 100).toFixed(2)}%`}
          bg={ADMIN_CHART.gold}
          borderRadius="full"
          transition="width 600ms var(--cc-ease)"
        />
      </Box>
      {subtext ? (
        <Text fontSize="12px" color="var(--cc-text-2)" className="cc-num">
          {subtext}
        </Text>
      ) : null}
    </Stack>
  );
}

// ── Payments ───────────────────────────────────────────────────────────────

function PaymentsSection({ payments }: { payments: PaymentLogRow[] }) {
  const [filter, setFilter] = useState<PaymentFilter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return payments;
    if (filter === "succeeded")
      return payments.filter((p) => p.status === "succeeded");
    return payments.filter(
      (p) => p.status === "failed" || p.status.startsWith("payment_failed"),
    );
  }, [payments, filter]);

  return (
    <SectionCard
      title="Payments-Log · letzte 30 Tage"
      icon={<Wallet size={16} strokeWidth={1.75} />}
      right={
        <HStack spacing={1.5}>
          {PAYMENT_STATUS_FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <Button key={f.id} {...adminChipProps(active)} size="xs" onClick={() => setFilter(f.id)}>
                {f.label}
              </Button>
            );
          })}
        </HStack>
      }
    >
      <Box {...adminInsetProps} overflow="hidden">
        <Grid templateColumns={{ base: "1fr", md: "140px 1.5fr 100px 110px 110px 60px" }} {...gridHeadProps}>
          <GridItem>Datum</GridItem>
          <GridItem>User</GridItem>
          <GridItem>Typ</GridItem>
          <GridItem textAlign="right">Betrag</GridItem>
          <GridItem>Status</GridItem>
          <GridItem textAlign="right">Invoice</GridItem>
        </Grid>

        {filtered.length === 0 ? (
          <Text px={4} py={6} fontSize="14px" color="var(--cc-text-2)">
            Keine Zahlungen in dieser Ansicht.
          </Text>
        ) : (
          filtered.map((p) => (
            <Grid
              key={p.id}
              templateColumns={{ base: "1fr", md: "140px 1.5fr 100px 110px 110px 60px" }}
              gap={2}
              {...gridRowProps}
            >
              <GridItem className="cc-num" fontSize="13px" color="var(--cc-text-2)">
                {dateFmt.format(new Date(p.createdAt))}
              </GridItem>
              <GridItem minW={0}>
                <Stack spacing={0}>
                  <Text noOfLines={1} color="var(--cc-text)" fontSize="14px">
                    {p.userName ?? p.userEmail ?? "—"}
                  </Text>
                  {p.userEmail && p.userName ? (
                    <Text noOfLines={1} fontSize="12px" color="var(--cc-text-2)">
                      {p.userEmail}
                    </Text>
                  ) : null}
                </Stack>
              </GridItem>
              <GridItem>
                <StatusPill
                  tone="neutral"
                  textTransform="capitalize"
                  color={p.type === "lifetime" ? "var(--cc-text)" : undefined}
                >
                  {p.type === "unknown" ? "—" : p.type}
                </StatusPill>
              </GridItem>
              <GridItem
                textAlign={{ base: "left", md: "right" }}
                className="cc-num"
                color="var(--cc-text)"
                fontWeight={600}
              >
                {eurFmtCents.format(p.amountEur)}
              </GridItem>
              <GridItem>
                <PaymentStatusBadge status={p.status} />
              </GridItem>
              <GridItem textAlign={{ base: "left", md: "right" }}>
                {p.stripeInvoiceId ? (
                  <Box
                    as="a"
                    href={`https://dashboard.stripe.com/invoices/${p.stripeInvoiceId}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Rechnung in Stripe öffnen"
                    color="var(--cc-text-2)"
                    display="inline-flex"
                    alignItems="center"
                    transition="color 150ms var(--cc-ease)"
                    _hover={{ color: "var(--cc-gold-light)" }}
                  >
                    <ExternalLink size={14} />
                  </Box>
                ) : (
                  <Text fontSize="12px" color="var(--cc-text-3)">—</Text>
                )}
              </GridItem>
            </Grid>
          ))
        )}
      </Box>
    </SectionCard>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase();
  const tone: AdminTone =
    lower === "succeeded"
      ? "success"
      : lower === "failed" || lower.startsWith("payment_failed")
        ? "danger"
        : "neutral";
  return (
    <StatusPill tone={tone} textTransform="capitalize">
      {status}
    </StatusPill>
  );
}

// ── Cancellations ──────────────────────────────────────────────────────────

function CancellationsSection({ cancellations }: { cancellations: CancellationRow[] }) {
  return (
    <SectionCard
      title="Cancellations-Inbox"
      icon={<XCircle size={16} strokeWidth={1.75} />}
    >
      {cancellations.length === 0 ? (
        <Text fontSize="14px" color="var(--cc-text-2)">
          Noch keine Kündigungs-Antworten.
        </Text>
      ) : (
        <Stack spacing={2.5}>
          {cancellations.map((c) => (
            <Box key={c.id} {...adminInsetProps} p={4}>
              <HStack justify="space-between" mb={2} flexWrap="wrap" gap={2}>
                <Stack spacing={0}>
                  <Text fontWeight={600} color="var(--cc-text)" fontSize="14px">
                    {c.userName ?? c.userEmail ?? "Unbekannt"}
                  </Text>
                  {c.userEmail && c.userName ? (
                    <Text fontSize="12px" color="var(--cc-text-2)">
                      {c.userEmail}
                    </Text>
                  ) : null}
                </Stack>
                <HStack spacing={2}>
                  {c.structuredReason ? (
                    <StatusPill tone="neutral">
                      {STRUCTURED_REASON_LABELS[c.structuredReason] ?? c.structuredReason}
                    </StatusPill>
                  ) : null}
                  <Text fontSize="12px" color="var(--cc-text-2)" className="cc-num">
                    {dateOnlyFmt.format(new Date(c.canceledAt))}
                  </Text>
                </HStack>
              </HStack>
              {(c.feedback ?? c.reason) ? (
                <Text
                  fontSize="14px"
                  color="var(--cc-text-soft)"
                  whiteSpace="pre-wrap"
                  lineHeight="1.6"
                >
                  {c.feedback ?? c.reason}
                </Text>
              ) : (
                <Text fontSize="12px" color="var(--cc-text-3)" fontStyle="italic">
                  Kein Freitext angegeben.
                </Text>
              )}
            </Box>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

// ── Email Performance ──────────────────────────────────────────────────────

function EmailPerformanceSection({ rows }: { rows: EmailPerfRow[] }) {
  const [groupBy, setGroupBy] = useState<"sequence" | "step">("sequence");

  // Aggregation auf Sequence-Ebene (alle Steps zusammen)
  const aggregated = useMemo(() => {
    if (groupBy === "step") return rows;
    const map = new Map<string, EmailPerfRow>();
    for (const r of rows) {
      const cur = map.get(r.sequence) ?? {
        sequence: r.sequence,
        step: -1,
        sent: 0,
        opened: 0,
        clicked: 0,
        openRatePct: 0,
        clickRatePct: 0,
      };
      cur.sent += r.sent;
      cur.opened += r.opened;
      cur.clicked += r.clicked;
      map.set(r.sequence, cur);
    }
    return Array.from(map.values()).map((r) => ({
      ...r,
      openRatePct: r.sent > 0 ? (r.opened / r.sent) * 100 : 0,
      clickRatePct: r.sent > 0 ? (r.clicked / r.sent) * 100 : 0,
    }));
  }, [rows, groupBy]);

  return (
    <SectionCard
      title="Email-Performance · letzte 60 Tage"
      icon={<Mail size={16} strokeWidth={1.75} />}
      right={
        <Select
          size="xs"
          maxW="180px"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as "sequence" | "step")}
          {...adminInputProps}
          borderRadius="6px"
        >
          <option value="sequence" style={adminOptionStyle}>Pro Sequence</option>
          <option value="step" style={adminOptionStyle}>Pro Step</option>
        </Select>
      }
    >
      {aggregated.length === 0 ? (
        <Text fontSize="14px" color="var(--cc-text-2)">
          Noch keine Email-Logs. Daten werden befüllt, sobald Sequencen versenden
          und der Resend-Webhook Events liefert.
        </Text>
      ) : (
        <Box {...adminInsetProps} overflow="hidden">
          <Grid templateColumns={{ base: "1fr", md: "1.5fr 80px 110px 110px 110px 110px" }} {...gridHeadProps}>
            <GridItem>Sequence</GridItem>
            <GridItem textAlign="right">Step</GridItem>
            <GridItem textAlign="right">Gesendet</GridItem>
            <GridItem textAlign="right">Geöffnet</GridItem>
            <GridItem textAlign="right">Open-Rate</GridItem>
            <GridItem textAlign="right">Click-Rate</GridItem>
          </Grid>
          {aggregated.map((row) => (
            <Grid
              key={`${row.sequence}-${row.step}`}
              templateColumns={{ base: "1fr", md: "1.5fr 80px 110px 110px 110px 110px" }}
              {...gridRowProps}
            >
              <GridItem color="var(--cc-text)">
                {row.sequence}
              </GridItem>
              <GridItem
                textAlign={{ base: "left", md: "right" }}
                className="cc-num"
                color="var(--cc-text-2)"
              >
                {row.step === -1 ? "·" : row.step}
              </GridItem>
              <GridItem
                textAlign={{ base: "left", md: "right" }}
                className="cc-num"
                color="var(--cc-text)"
              >
                {row.sent}
              </GridItem>
              <GridItem
                textAlign={{ base: "left", md: "right" }}
                className="cc-num"
                color="var(--cc-text-2)"
              >
                {row.opened}
              </GridItem>
              <GridItem
                textAlign={{ base: "left", md: "right" }}
                className="cc-num"
                color="var(--cc-text)"
                fontWeight={500}
              >
                {row.openRatePct.toFixed(1)} %
              </GridItem>
              <GridItem
                textAlign={{ base: "left", md: "right" }}
                className="cc-num"
                color="var(--cc-text)"
                fontWeight={500}
              >
                {row.clickRatePct.toFixed(1)} %
              </GridItem>
            </Grid>
          ))}
        </Box>
      )}
    </SectionCard>
  );
}

// ── Section Card ───────────────────────────────────────────────────────────

function SectionCard(props: {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box as="section" className={ADMIN_CARD_CLASS} p={adminCardPadding}>
      <HStack justify="space-between" flexWrap="wrap" gap={2} mb={4}>
        <HStack spacing={2}>
          {props.icon ? (
            <Box color="var(--cc-text-2)" aria-hidden>{props.icon}</Box>
          ) : null}
          <AdminCardTitle>{props.title}</AdminCardTitle>
        </HStack>
        {props.right}
      </HStack>
      <Box>{props.children}</Box>
    </Box>
  );
}
