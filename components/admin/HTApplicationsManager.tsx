"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Collapse,
  HStack,
  Select,
  Spinner,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { Check, ChevronDown, ChevronUp, Flame, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HT_QUESTIONS, BUDGET_LABELS } from "@/config/ht-questions";
import {
  ADMIN_CARD_CLASS,
  AdminCount,
  AdminLabel,
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminChipProps,
  adminEmptyProps,
  adminInputProps,
  adminOptionStyle,
  type AdminTone,
} from "@/components/admin/adminUi";

type Outcome = "pending" | "closed_won" | "closed_lost" | "no_show";
type BudgetTier = "under_2000" | "over_2000";

interface HTApplicationRow {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  whatsappNumber: string | null;
  answers: Record<string, string>;
  budgetTier: BudgetTier;
  outcome: Outcome;
  internalNotes: string | null;
  contactedAt: string | null;
  callScheduledAt: string | null;
  createdAt: string;
}

interface Counters {
  all: number;
  over_2000: number;
  under_2000: number;
  pending: number;
  closed_won: number;
  closed_lost: number;
  no_show: number;
}

const OUTCOME_LABELS: Record<Outcome, string> = {
  pending: "Pending",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
  no_show: "No-Show",
};

const OUTCOME_TONE: Record<Outcome, AdminTone> = {
  pending: "attention",
  closed_won: "success",
  closed_lost: "danger",
  no_show: "neutral",
};

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `vor ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 48) return `vor ${h}h`;
  const d = Math.floor(h / 24);
  return `vor ${d}d`;
}

function whatsappHref(num: string | null): string | null {
  if (!num) return null;
  const digits = num.replace(/[^\d+]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits.replace(/^\+/, "")}`;
}

export function HTApplicationsManager() {
  const [budgetFilter, setBudgetFilter] = useState<"all" | BudgetTier>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | Outcome>("all");
  const [items, setItems] = useState<HTApplicationRow[]>([]);
  const [counters, setCounters] = useState<Counters>({
    all: 0,
    over_2000: 0,
    under_2000: 0,
    pending: 0,
    closed_won: 0,
    closed_lost: 0,
    no_show: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        budget: budgetFilter,
        outcome: outcomeFilter,
      });
      const res = await fetch(`/api/admin/ht-applications?${params}`);
      const json = (await res.json()) as {
        ok?: boolean;
        items?: HTApplicationRow[];
        counters?: Counters;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Bewerbungen konnten nicht geladen werden.");
        return;
      }
      setItems(json.items ?? []);
      if (json.counters) setCounters(json.counters);
    } finally {
      setLoading(false);
    }
  }, [budgetFilter, outcomeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedItems = useMemo(() => items, [items]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function patchOutcome(
    row: HTApplicationRow,
    update: { outcome?: Outcome; internal_notes?: string | null },
  ) {
    setBusyIds((s) => new Set(s).add(row.id));
    try {
      const res = await fetch(`/api/admin/ht-applications/${row.id}/outcome`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(update),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Update fehlgeschlagen.");
        return false;
      }
      // Lokal patchen — schneller als komplettes Reload
      setItems((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                outcome: (update.outcome as Outcome | undefined) ?? r.outcome,
                internalNotes:
                  update.internal_notes !== undefined
                    ? update.internal_notes
                    : r.internalNotes,
              }
            : r,
        ),
      );
      return true;
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(row.id);
        return next;
      });
    }
  }

  async function activateAccess(row: HTApplicationRow) {
    setBusyIds((s) => new Set(s).add(row.id));
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/ht-applications/${row.id}/activate-access`,
        { method: "POST" },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Zugang konnte nicht aktiviert werden.");
        return;
      }
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(row.id);
        return next;
      });
    }
  }

  return (
    <Stack spacing={6}>
      <FilterBar
        budgetFilter={budgetFilter}
        outcomeFilter={outcomeFilter}
        counters={counters}
        onBudget={setBudgetFilter}
        onOutcome={setOutcomeFilter}
      />

      {error && (
        <Alert status="error" variant="subtle" {...adminAlertProps("error")}>
          <AlertIcon color={adminAlertIconColor("error")} />
          <Text fontSize="sm">{error}</Text>
        </Alert>
      )}

      {loading ? (
        <HStack py={12} justify="center">
          <Spinner color="var(--cc-gold)" />
        </HStack>
      ) : sortedItems.length === 0 ? (
        <Box {...adminEmptyProps}>Keine HT-Bewerbungen für diesen Filter.</Box>
      ) : (
        <Stack spacing={3}>
          {sortedItems.map((row) => (
            <HTApplicationCard
              key={row.id}
              row={row}
              isOpen={expanded.has(row.id)}
              busy={busyIds.has(row.id)}
              onToggle={() => toggleExpand(row.id)}
              onChangeOutcome={(o) => patchOutcome(row, { outcome: o })}
              onChangeNotes={(n) => patchOutcome(row, { internal_notes: n })}
              onActivateAccess={() => activateAccess(row)}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// ---------- Filter Bar ----------

function FilterBar(props: {
  budgetFilter: "all" | BudgetTier;
  outcomeFilter: "all" | Outcome;
  counters: Counters;
  onBudget: (v: "all" | BudgetTier) => void;
  onOutcome: (v: "all" | Outcome) => void;
}) {
  const { budgetFilter, outcomeFilter, counters, onBudget, onOutcome } = props;

  const budgetTabs: { id: "all" | BudgetTier; label: string; count: number }[] = [
    { id: "all", label: "Alle", count: counters.all },
    { id: "over_2000", label: "🔥 Über 2k", count: counters.over_2000 },
    { id: "under_2000", label: "Unter 2k", count: counters.under_2000 },
  ];

  const outcomeTabs: { id: "all" | Outcome; label: string; count: number }[] = [
    { id: "all", label: "Alle", count: counters.all },
    { id: "pending", label: "Pending", count: counters.pending },
    { id: "closed_won", label: "Won", count: counters.closed_won },
    { id: "closed_lost", label: "Lost", count: counters.closed_lost },
    { id: "no_show", label: "No-Show", count: counters.no_show },
  ];

  return (
    <Stack spacing={3}>
      <Stack spacing={2}>
        <AdminLabel>Budget</AdminLabel>
        <HStack spacing={2} flexWrap="wrap">
          {budgetTabs.map((t) => (
            <FilterPill
              key={t.id}
              active={budgetFilter === t.id}
              onClick={() => onBudget(t.id)}
              label={t.label}
              count={t.count}
            />
          ))}
        </HStack>
      </Stack>

      <Stack spacing={2}>
        <AdminLabel>Outcome</AdminLabel>
        <HStack spacing={2} flexWrap="wrap">
          {outcomeTabs.map((t) => (
            <FilterPill
              key={t.id}
              active={outcomeFilter === t.id}
              onClick={() => onOutcome(t.id)}
              label={t.label}
              count={t.count}
            />
          ))}
        </HStack>
      </Stack>
    </Stack>
  );
}

function FilterPill(props: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  const { active, onClick, label, count } = props;
  return (
    <Button {...adminChipProps(active)} onClick={onClick}>
      {label}
      <AdminCount active={active}>{count}</AdminCount>
    </Button>
  );
}

// ---------- Card ----------

function HTApplicationCard(props: {
  row: HTApplicationRow;
  isOpen: boolean;
  busy: boolean;
  onToggle: () => void;
  onChangeOutcome: (o: Outcome) => Promise<boolean>;
  onChangeNotes: (n: string | null) => Promise<boolean>;
  onActivateAccess: () => Promise<void>;
}) {
  const { row, isOpen, busy, onToggle, onChangeOutcome, onChangeNotes, onActivateAccess } = props;
  const isPriority = row.budgetTier === "over_2000";
  const wa = whatsappHref(row.whatsappNumber);

  const [notesDraft, setNotesDraft] = useState<string>(row.internalNotes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Sync wenn Server-Wert sich ändert
  useEffect(() => {
    setNotesDraft(row.internalNotes ?? "");
  }, [row.internalNotes]);

  async function saveNotes() {
    const next = notesDraft.trim();
    const current = row.internalNotes ?? "";
    if (next === current) return;
    setSavingNotes(true);
    const ok = await onChangeNotes(next.length > 0 ? next : null);
    setSavingNotes(false);
    if (ok) {
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1500);
    }
  }

  return (
    <Box
      className={ADMIN_CARD_CLASS}
      // Priority-Leads: Gold-Haarlinie als Rahmen (inline, damit sie über `.cc-card` liegt)
      style={isPriority ? { borderColor: "var(--cc-gold-line)" } : undefined}
    >
      <HStack
        as="button"
        onClick={onToggle}
        w="full"
        px={4}
        py={3.5}
        spacing={4}
        align="center"
        justifyContent="space-between"
        textAlign="left"
        borderTopRadius="12px"
        borderBottomRadius={isOpen ? 0 : "12px"}
        transition="background-color 120ms ease"
        _hover={{ bg: "rgba(255, 255, 255, 0.02)" }}
      >
        <HStack spacing={3} align="center" flex="1" minW={0}>
          {isPriority ? (
            <Box color="var(--cc-gold-light)" flexShrink={0}>
              <Flame size={18} strokeWidth={1.75} />
            </Box>
          ) : (
            <Box w="18px" h="18px" flexShrink={0} />
          )}
          <Stack spacing={0.5} flex="1" minW={0}>
            <HStack spacing={2}>
              <Text fontWeight={600} color="var(--cc-text)" noOfLines={1}>
                {row.name || "(Kein Name)"}
              </Text>
              <Text fontSize="xs" className="cc-num" color="var(--cc-text-2)" flexShrink={0}>
                · {relativeTime(row.createdAt)}
              </Text>
            </HStack>
            <Text fontSize="xs" color="var(--cc-text-2)" noOfLines={1}>
              {row.email}
            </Text>
          </Stack>
        </HStack>

        <HStack spacing={2}>
          <BudgetBadge tier={row.budgetTier} />
          <OutcomeBadge outcome={row.outcome} />
          <Box color="var(--cc-text-2)">
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Box>
        </HStack>
      </HStack>

      <Collapse in={isOpen} animateOpacity>
        <Box px={5} pb={5} pt={4} borderTop="1px solid var(--cc-line)">
          <Stack spacing={5}>
            {/* Quick Actions Bar */}
            <HStack spacing={3} flexWrap="wrap">
              {wa ? (
                <Button
                  as="a"
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="sm"
                  variant="line"
                  leftIcon={<MessageCircle size={14} />}
                >
                  WhatsApp: <Box as="span" className="cc-num" ml={1}>{row.whatsappNumber}</Box>
                </Button>
              ) : null}
              <Text fontSize="xs" color="var(--cc-text-2)">
                Eingegangen:{" "}
                <Box as="span" className="cc-num">
                  {formatDate(row.createdAt)}
                </Box>
              </Text>
            </HStack>

            {/* Antworten */}
            <Stack spacing={4}>
              {HT_QUESTIONS.map((q) => {
                const answer = row.answers[q.id] ?? "";
                if (q.id === "budget") return null; // separat als Badge angezeigt
                if (q.id === "whatsapp_number") return null; // bereits oben als Quick-Action
                return (
                  <AnswerBlock
                    key={q.id}
                    label={q.question}
                    value={answer || "—"}
                  />
                );
              })}
            </Stack>

            {/* Outcome + Notes */}
            <Box borderTop="1px solid var(--cc-line)" pt={4}>
              <Stack spacing={4}>
                <HStack spacing={3} flexWrap="wrap" align="center">
                  <AdminLabel>Outcome</AdminLabel>
                  <Select
                    size="sm"
                    maxW="200px"
                    value={row.outcome}
                    onChange={(e) => void onChangeOutcome(e.target.value as Outcome)}
                    isDisabled={busy}
                    {...adminInputProps}
                  >
                    <option value="pending" style={adminOptionStyle}>Pending</option>
                    <option value="closed_won" style={adminOptionStyle}>Closed Won</option>
                    <option value="closed_lost" style={adminOptionStyle}>Closed Lost</option>
                    <option value="no_show" style={adminOptionStyle}>No-Show</option>
                  </Select>

                  {row.outcome === "closed_won" ? (
                    <Button
                      size="sm"
                      variant="gold"
                      onClick={() => void onActivateAccess()}
                      isDisabled={busy || !row.userId}
                      leftIcon={<Check size={14} />}
                      title={
                        row.userId
                          ? "Setzt membership_tier='ht_1on1' + is_paid=true (idempotent)."
                          : "Diese Bewerbung ist mit keinem registrierten User verknüpft."
                      }
                    >
                      Zugang aktivieren
                    </Button>
                  ) : null}
                </HStack>

                <Stack spacing={2}>
                  <HStack justify="space-between">
                    <AdminLabel>Interne Notizen</AdminLabel>
                    {savedFlash ? (
                      <Text fontSize="xs" color="var(--cc-success)">
                        ✓ gespeichert
                      </Text>
                    ) : null}
                  </HStack>
                  <Textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    onBlur={saveNotes}
                    placeholder="Notizen zum Call, Einwände, Follow-Up-Datum…"
                    minH="80px"
                    {...adminInputProps}
                    isDisabled={savingNotes || busy}
                    fontSize="sm"
                  />
                  <Text fontSize="xs" color="var(--cc-text-2)">
                    Speichern beim Verlassen des Felds.
                  </Text>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}

function AnswerBlock({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={1}>
      <AdminLabel>{label}</AdminLabel>
      <Text fontSize="sm" color="var(--cc-text)" whiteSpace="pre-wrap" lineHeight="1.6">
        {value}
      </Text>
    </Stack>
  );
}

function BudgetBadge({ tier }: { tier: BudgetTier }) {
  if (tier === "over_2000") {
    return <StatusPill tone="attention">🔥 {BUDGET_LABELS.over_2000}</StatusPill>;
  }
  return <StatusPill tone="neutral">{BUDGET_LABELS.under_2000}</StatusPill>;
}

function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  return <StatusPill tone={OUTCOME_TONE[outcome]}>{OUTCOME_LABELS[outcome]}</StatusPill>;
}
