"use client";

import {
  Box,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ADMIN_CARD_CLASS,
  ADMIN_TONES,
  StatusDot,
  adminCardPadding,
  adminEmptyProps,
  adminInputProps,
  adminOptionStyle,
  adminTableSx,
  type AdminTone,
} from "@/components/admin/adminUi";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  formatDateTime,
  formatDuration,
  formatResponseTime,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/support/shared";

/** Offen = Champagner (zu tun), gelöst = grün, alles andere neutral. */
const STATUS_TONE: Record<TicketStatus, AdminTone> = {
  open: "attention",
  in_progress: "neutral",
  waiting_on_user: "neutral",
  resolved: "success",
  closed: "neutral",
};

const PRIORITY_TONE: Record<TicketPriority, AdminTone> = {
  low: "neutral",
  normal: "neutral",
  high: "attention",
};

interface AdminTicketRow {
  id: string;
  subject: string;
  category: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  updatedAt: string;
  userId: string | null;
  /** Ticket aus dem Kontaktformular (ohne Konto). */
  ohneKonto?: boolean;
  userEmail: string;
  userName: string | null;
}

interface Stats {
  avgResponseMs: number | null;
  respondedCount30d: number;
  openCount: number;
  totalCount: number;
}

export function AdminTicketsManager() {
  const router = useRouter();
  const [tickets, setTickets] = useState<AdminTicketRow[]>([]);
  const [stats, setStats] = useState<Stats>({ avgResponseMs: null, respondedCount30d: 0, openCount: 0, totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TicketPriority>("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tickets");
      const json = (await res.json()) as {
        ok?: boolean;
        tickets?: AdminTicketRow[];
        stats?: Stats;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Tickets konnten nicht geladen werden.");
        return;
      }
      setTickets(json.tickets ?? []);
      if (json.stats) setStats(json.stats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        t.subject.toLowerCase().includes(q) ||
        t.userEmail.toLowerCase().includes(q) ||
        (t.userName ?? "").toLowerCase().includes(q)
      );
    });
  }, [tickets, statusFilter, priorityFilter, search]);

  return (
    <Stack gap={6}>
      <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
        <KpiTile label="Offene Tickets" value={String(stats.openCount)} />
        <KpiTile
          label="Ø Antwortzeit (30 Tage)"
          value={stats.avgResponseMs != null ? formatDuration(stats.avgResponseMs) : "—"}
          hint={`${stats.respondedCount30d} beantwortet`}
          accent
        />
        <KpiTile label="Tickets gesamt" value={String(stats.totalCount)} />
      </SimpleGrid>

      <HStack gap={3} flexWrap="wrap">
        <Select
          w="auto"
          size="sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | TicketStatus)}
          {...adminInputProps}
        >
          <option value="all" style={adminOptionStyle}>
            Alle Status
          </option>
          {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
            <option key={s} value={s} style={adminOptionStyle}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select
          w="auto"
          size="sm"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as "all" | TicketPriority)}
          {...adminInputProps}
        >
          <option value="all" style={adminOptionStyle}>
            Alle Prioritäten
          </option>
          {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => (
            <option key={p} value={p} style={adminOptionStyle}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </Select>
        <Input
          size="sm"
          placeholder="Suche nach Betreff oder Nutzer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxW="320px"
          {...adminInputProps}
        />
      </HStack>

      {error ? (
        <Text color="var(--cc-danger)" fontSize="sm">
          {error}
        </Text>
      ) : null}

      {loading ? (
        <HStack py={10} justify="center">
          <Spinner size="sm" color="var(--cc-gold)" />
          <Text fontSize="sm" color="var(--cc-text-2)">
            Tickets werden geladen...
          </Text>
        </HStack>
      ) : filtered.length === 0 ? (
        <Box {...adminEmptyProps}>Keine Tickets gefunden.</Box>
      ) : (
        <Box className={ADMIN_CARD_CLASS} px={{ base: 2, md: 3 }} py={2}>
          <Box overflowX="auto">
            <Table variant="unstyled" size="sm" sx={adminTableSx}>
              <Thead>
                <Tr>
                  <Th>Betreff</Th>
                  <Th>Nutzer</Th>
                  <Th>Kategorie</Th>
                  <Th>Status</Th>
                  <Th>Priorität</Th>
                  <Th>Antwortzeit</Th>
                  <Th>Erstellt</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filtered.map((t) => {
                  const response = formatResponseTime(t.createdAt, t.firstResponseAt);
                  return (
                    <Tr key={t.id} onClick={() => router.push(`/admin/tickets/${t.id}`)} cursor="pointer">
                      <Td>
                        <Text fontWeight={500} color="var(--cc-text)" isTruncated maxW="260px">
                          {t.subject}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontSize="sm" color="var(--cc-text-soft)">
                          {t.userName ?? t.userEmail}
                        </Text>
                        {t.userName ? (
                          <Text fontSize="xs" color="var(--cc-text-3)">
                            {t.userEmail}
                          </Text>
                        ) : null}
                        {t.ohneKonto ? (
                          <Text fontSize="xs" color="var(--cc-gold-light)">
                            Ohne Konto (Kontaktformular)
                          </Text>
                        ) : null}
                      </Td>
                      <Td>
                        <Text fontSize="sm" color="var(--cc-text-2)">
                          {t.category ? CATEGORY_LABELS[t.category as TicketCategory] ?? t.category : "—"}
                        </Text>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <StatusDot tone={STATUS_TONE[t.status]} />
                          <Text fontSize="13px" color="var(--cc-text-soft)" whiteSpace="nowrap">
                            {STATUS_LABELS[t.status]}
                          </Text>
                        </HStack>
                      </Td>
                      <Td>
                        <Text fontSize="13px" fontWeight={500} color={ADMIN_TONES[PRIORITY_TONE[t.priority]].color}>
                          {PRIORITY_LABELS[t.priority]}
                        </Text>
                      </Td>
                      <Td>
                        <Text
                          className="cc-num"
                          fontSize="xs"
                          color={response.isPending ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
                          whiteSpace="nowrap"
                        >
                          {response.label}
                        </Text>
                      </Td>
                      <Td>
                        <Text className="cc-num" fontSize="xs" color="var(--cc-text-3)" whiteSpace="nowrap">
                          {formatDateTime(t.createdAt)}
                        </Text>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        </Box>
      )}
    </Stack>
  );
}

function KpiTile({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <Box className={ADMIN_CARD_CLASS} p={adminCardPadding}>
      <Text
        fontSize="12px"
        fontWeight={500}
        textTransform="uppercase"
        letterSpacing="0.06em"
        color={accent ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
        mb={1.5}
      >
        {label}
      </Text>
      <Text className="cc-num" fontSize="26px" fontWeight={600} lineHeight={1.15} color="var(--cc-text)">
        {value}
      </Text>
      {hint ? (
        <Text className="cc-num" fontSize="xs" color="var(--cc-text-2)" mt={1}>
          {hint}
        </Text>
      ) : null}
    </Box>
  );
}
