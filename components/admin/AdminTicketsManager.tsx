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
  CATEGORY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  formatDateTime,
  formatDuration,
  formatResponseTime,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/support/shared";

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
  userId: string;
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | TicketStatus)}
          bg="whiteAlpha.50"
        >
          <option value="all">Alle Status</option>
          {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select
          w="auto"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as "all" | TicketPriority)}
          bg="whiteAlpha.50"
        >
          <option value="all">Alle Prioritäten</option>
          {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Suche nach Betreff oder Nutzer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          bg="whiteAlpha.50"
          maxW="320px"
        />
      </HStack>

      {error ? (
        <Text color="red.300" fontSize="sm">
          {error}
        </Text>
      ) : null}

      {loading ? (
        <HStack py={10} justify="center">
          <Spinner size="sm" color="yellow.400" />
          <Text fontSize="sm" color="gray.400">
            Tickets werden geladen...
          </Text>
        </HStack>
      ) : filtered.length === 0 ? (
        <Text fontSize="sm" color="gray.500" py={6}>
          Keine Tickets gefunden.
        </Text>
      ) : (
        <Box overflowX="auto">
          <Table variant="unstyled" size="sm">
            <Thead>
              <Tr>
                <AdminTh>Betreff</AdminTh>
                <AdminTh>Nutzer</AdminTh>
                <AdminTh>Kategorie</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh>Priorität</AdminTh>
                <AdminTh>Antwortzeit</AdminTh>
                <AdminTh>Erstellt</AdminTh>
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map((t) => {
                const response = formatResponseTime(t.createdAt, t.firstResponseAt);
                return (
                  <Tr
                    key={t.id}
                    onClick={() => router.push(`/admin/tickets/${t.id}`)}
                    cursor="pointer"
                    _hover={{ bg: "whiteAlpha.50" }}
                    transition="background 120ms ease"
                  >
                    <AdminTd>
                      <Text className="inter-medium" color="whiteAlpha.900" isTruncated maxW="260px">
                        {t.subject}
                      </Text>
                    </AdminTd>
                    <AdminTd>
                      <Text fontSize="sm" color="whiteAlpha.800">
                        {t.userName ?? t.userEmail}
                      </Text>
                      {t.userName ? (
                        <Text fontSize="xs" color="gray.500">
                          {t.userEmail}
                        </Text>
                      ) : null}
                    </AdminTd>
                    <AdminTd>
                      <Text fontSize="sm" color="gray.400">
                        {t.category ? CATEGORY_LABELS[t.category as TicketCategory] ?? t.category : "—"}
                      </Text>
                    </AdminTd>
                    <AdminTd>
                      <HStack spacing={2}>
                        <Box w="8px" h="8px" borderRadius="full" bg={STATUS_COLORS[t.status]} flexShrink={0} />
                        <Text fontSize="13px" color="whiteAlpha.800">
                          {STATUS_LABELS[t.status]}
                        </Text>
                      </HStack>
                    </AdminTd>
                    <AdminTd>
                      <Text fontSize="13px" color={PRIORITY_COLORS[t.priority]} className="inter-medium">
                        {PRIORITY_LABELS[t.priority]}
                      </Text>
                    </AdminTd>
                    <AdminTd>
                      <Text
                        fontFamily="var(--font-mono)"
                        fontSize="xs"
                        color={response.isPending ? "var(--color-accent-gold-light)" : "whiteAlpha.700"}
                      >
                        {response.label}
                      </Text>
                    </AdminTd>
                    <AdminTd>
                      <Text fontSize="xs" color="gray.500">
                        {formatDateTime(t.createdAt)}
                      </Text>
                    </AdminTd>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>
      )}
    </Stack>
  );
}

function KpiTile({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <Box
      p={4}
      borderRadius="14px"
      borderWidth="1px"
      borderColor={accent ? "rgba(212,175,55,0.35)" : "whiteAlpha.200"}
      bg={accent ? "rgba(212,175,55,0.06)" : "whiteAlpha.50"}
    >
      <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500" mb={1}>
        {label}
      </Text>
      <Text
        fontFamily="var(--font-mono)"
        fontSize="2xl"
        fontWeight={600}
        color={accent ? "var(--color-accent-gold-light)" : "whiteAlpha.900"}
      >
        {value}
      </Text>
      {hint ? (
        <Text fontSize="xs" color="gray.500" mt={1}>
          {hint}
        </Text>
      ) : null}
    </Box>
  );
}

function AdminTh({ children }: { children: React.ReactNode }) {
  return (
    <Th
      borderBottom="1px solid rgba(255,255,255,0.08)"
      color="gray.500"
      className="inter-semibold"
      fontSize="11px"
      letterSpacing="0.06em"
      textTransform="uppercase"
      px={3}
      py={3}
    >
      {children}
    </Th>
  );
}

function AdminTd({ children }: { children: React.ReactNode }) {
  return (
    <Td borderBottom="1px solid rgba(255,255,255,0.05)" px={3} py={3}>
      {children}
    </Td>
  );
}
