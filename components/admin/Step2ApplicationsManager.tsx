"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Collapse,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Stack,
  Text,
  Textarea,
  useDisclosure,
} from "@chakra-ui/react";
import { Calendar, Check, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { STEP2_QUESTIONS, INVESTMENT_LABELS } from "@/config/insight-step2-questions";
import {
  ADMIN_CARD_CLASS,
  AdminCount,
  AdminLabel,
  StatusDot,
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminChipProps,
  adminDangerButtonProps,
  adminEmptyProps,
  adminInputProps,
  adminModalHeaderProps,
  adminModalProps,
  adminOverlayProps,
  type AdminTone,
} from "@/components/admin/adminUi";

type Status = "pending" | "approved" | "rejected";
type Tab = Status | "all";

interface Step2Row {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  answers: Record<string, string>;
  status: Status;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  rejectionReason: string | null;
  createdAt: string;
  calendlyBookedAt: string | null;
  calendlyEventUri: string | null;
}

interface Counters {
  pending: number;
  approved: number;
  rejected: number;
  all: number;
}

const TAB_ORDER: { id: Tab; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "Alle" },
];

const STATUS_TONE: Record<Status, AdminTone> = {
  pending: "attention",
  approved: "success",
  rejected: "danger",
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

function resolveAnswer(questionId: string, value: string): string {
  if (!value) return "—";
  if (questionId === "investment_budget") {
    return INVESTMENT_LABELS[value] ?? value;
  }
  return value;
}

export function Step2ApplicationsManager() {
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<Step2Row[]>([]);
  const [counters, setCounters] = useState<Counters>({ pending: 0, approved: 0, rejected: 0, all: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const rejectModal = useDisclosure();
  const [rejectTarget, setRejectTarget] = useState<Step2Row | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async (status: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/step2-applications?status=${status}`);
      const json = (await res.json()) as {
        ok?: boolean;
        items?: Step2Row[];
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
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        (r.name ?? "").toLowerCase().includes(q) ||
        Object.values(r.answers).some((v) => v.toLowerCase().includes(q)),
    );
  }, [items, search]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function approve(row: Step2Row) {
    setBusyIds((s) => new Set(s).add(row.id));
    try {
      const res = await fetch(`/api/admin/step2-applications/${row.id}/approve`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Annehmen fehlgeschlagen.");
        return;
      }
      await load(tab);
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(row.id);
        return next;
      });
    }
  }

  function openReject(row: Step2Row) {
    setRejectTarget(row);
    setRejectReason("");
    rejectModal.onOpen();
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      const res = await fetch(`/api/admin/step2-applications/${rejectTarget.id}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() || undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Ablehnen fehlgeschlagen.");
        return;
      }
      rejectModal.onClose();
      setRejectTarget(null);
      await load(tab);
    } finally {
      setRejecting(false);
    }
  }

  return (
    <Stack spacing={6}>
      <HStack spacing={2} flexWrap="wrap">
        {TAB_ORDER.map((t) => {
          const active = tab === t.id;
          const count =
            t.id === "all"
              ? counters.all
              : t.id === "pending"
                ? counters.pending
                : t.id === "approved"
                  ? counters.approved
                  : counters.rejected;
          return (
            <Button key={t.id} {...adminChipProps(active)} onClick={() => setTab(t.id)}>
              {t.label}
              <AdminCount active={active}>{count}</AdminCount>
            </Button>
          );
        })}
      </HStack>

      <InputGroup maxW="360px">
        <InputLeftElement pointerEvents="none" color="var(--cc-text-3)">
          <Search size={16} />
        </InputLeftElement>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nach E-Mail, Name oder Antwort suchen…"
          {...adminInputProps}
        />
      </InputGroup>

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
      ) : filtered.length === 0 ? (
        <Box {...adminEmptyProps}>Keine Step-2-Bewerbungen in dieser Ansicht.</Box>
      ) : (
        <Stack spacing={3}>
          {filtered.map((row) => (
            <Step2Card
              key={row.id}
              row={row}
              isOpen={expanded.has(row.id)}
              busy={busyIds.has(row.id)}
              onToggle={() => toggleExpand(row.id)}
              onApprove={() => approve(row)}
              onReject={() => openReject(row)}
            />
          ))}
        </Stack>
      )}

      <Modal isOpen={rejectModal.isOpen} onClose={rejectModal.onClose} isCentered>
        <ModalOverlay {...adminOverlayProps} />
        <ModalContent {...adminModalProps}>
          <ModalHeader {...adminModalHeaderProps}>Step-2-Bewerbung ablehnen</ModalHeader>
          <ModalCloseButton color="var(--cc-text-2)" />
          <ModalBody>
            <Stack spacing={3}>
              <Text fontSize="sm" color="var(--cc-text-2)">
                Der Grund ist nur intern sichtbar.
              </Text>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Optionaler interner Grund…"
                {...adminInputProps}
                minH="120px"
              />
            </Stack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" color="var(--cc-text-2)" onClick={rejectModal.onClose}>
              Abbrechen
            </Button>
            <Button
              {...adminDangerButtonProps}
              onClick={confirmReject}
              isLoading={rejecting}
              loadingText="Ablehnen…"
            >
              Endgültig ablehnen
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}

function Step2Card(props: {
  row: Step2Row;
  isOpen: boolean;
  busy: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { row, isOpen, busy, onToggle, onApprove, onReject } = props;

  return (
    <Box className={ADMIN_CARD_CLASS}>
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
          <StatusDot tone={STATUS_TONE[row.status]} />
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
          {row.calendlyBookedAt && (
            <StatusPill tone="success" className="cc-num" display="inline-flex" alignItems="center" gap={1}>
              <Calendar size={11} />
              Termin {formatDate(row.calendlyBookedAt)}
            </StatusPill>
          )}
          <StatusBadge status={row.status} />
          <Box color="var(--cc-text-2)">
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Box>
        </HStack>
      </HStack>

      <Collapse in={isOpen} animateOpacity>
        <Box px={5} pb={5} pt={4} borderTop="1px solid var(--cc-line)">
          <Stack spacing={4}>
            {STEP2_QUESTIONS.map((q) => (
              <AnswerBlock
                key={q.id}
                label={q.question}
                value={resolveAnswer(q.id, row.answers[q.id] ?? "")}
              />
            ))}

            {row.status === "pending" ? (
              <HStack justify="flex-end" pt={2} spacing={2}>
                <Button
                  {...adminDangerButtonProps}
                  onClick={onReject}
                  isDisabled={busy}
                  leftIcon={<X size={16} />}
                >
                  Ablehnen
                </Button>
                <Button
                  variant="gold"
                  onClick={onApprove}
                  isLoading={busy}
                  loadingText="Annehmen…"
                  leftIcon={<Check size={16} />}
                >
                  Annehmen
                </Button>
              </HStack>
            ) : (
              <Stack spacing={1} pt={2}>
                <Text fontSize="xs" color="var(--cc-text-2)">
                  {row.status === "approved" ? "✓ Angenommen" : "✗ Abgelehnt"} am{" "}
                  <Box as="span" className="cc-num">
                    {formatDate(row.reviewedAt)}
                  </Box>
                  {row.reviewedByName ? ` durch ${row.reviewedByName}` : ""}
                </Text>
                {row.status === "rejected" && row.rejectionReason && (
                  <Text fontSize="xs" color="var(--cc-text-2)">
                    Interner Grund: {row.rejectionReason}
                  </Text>
                )}
              </Stack>
            )}
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

function StatusBadge({ status }: { status: Status }) {
  const label = status === "pending" ? "Pending" : status === "approved" ? "Angenommen" : "Abgelehnt";
  return <StatusPill tone={STATUS_TONE[status]}>{label}</StatusPill>;
}
