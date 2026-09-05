"use client";

import { Box, Button, Flex, HStack, Select, Spinner, Stack, Text, Textarea, useToast } from "@chakra-ui/react";
import { Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  PRIORITY_OPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  formatDateTime,
  formatResponseTime,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/support/shared";

interface TicketMessageRow {
  id: string;
  sender_type: "user" | "admin";
  sender_id: string | null;
  body: string;
  created_at: string;
}

interface AdminTicketDetailRow {
  id: string;
  subject: string;
  category: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  updated_at: string;
  userEmail: string;
  userName: string | null;
}

export function AdminTicketDetail({ ticketId }: { ticketId: string }) {
  const toast = useToast();
  const [ticket, setTicket] = useState<AdminTicketDetailRow | null>(null);
  const [messages, setMessages] = useState<TicketMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingPriority, setSavingPriority] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`);
      const json = (await res.json()) as {
        ok?: boolean;
        ticket?: AdminTicketDetailRow;
        messages?: TicketMessageRow[];
        error?: string;
      };
      if (!res.ok || !json.ok || !json.ticket) {
        setError(json.error ?? "Ticket konnte nicht geladen werden.");
        return;
      }
      setTicket(json.ticket);
      setMessages(json.messages ?? []);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateField = async (updates: { status?: string; priority?: string }) => {
    if (updates.status) setSavingStatus(true);
    if (updates.priority) setSavingPriority(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        toast({ title: "Änderung fehlgeschlagen", description: json.error, status: "error", duration: 4000 });
        return;
      }
      void load();
    } finally {
      setSavingStatus(false);
      setSavingPriority(false);
    }
  };

  const submitReply = async () => {
    const body = reply.trim();
    if (!body) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: TicketMessageRow; error?: string };
      if (!res.ok || !json.ok || !json.message) {
        toast({ title: "Antwort konnte nicht gesendet werden", description: json.error, status: "error", duration: 4000 });
        return;
      }
      setMessages((prev) => [...prev, json.message as TicketMessageRow]);
      setReply("");
      toast({ title: "Antwort gesendet", status: "success", duration: 2000 });
      void load();
    } finally {
      setSending(false);
    }
  };

  if (loading && !ticket) {
    return (
      <HStack py={10} justify="center">
        <Spinner size="sm" color="yellow.400" />
        <Text fontSize="sm" color="gray.400">
          Ticket wird geladen...
        </Text>
      </HStack>
    );
  }

  if (error || !ticket) {
    return (
      <Text color="red.300" fontSize="sm">
        {error ?? "Ticket nicht gefunden."}
      </Text>
    );
  }

  const response = formatResponseTime(ticket.created_at, ticket.first_response_at);

  return (
    <Stack gap={6}>
      <Box p={5} borderRadius="14px" borderWidth="1px" borderColor="whiteAlpha.200" bg="whiteAlpha.50">
        <Flex justify="space-between" align="flex-start" gap={4} flexWrap="wrap">
          <Stack spacing={1.5}>
            <Text className="inter-semibold" color="whiteAlpha.900" fontSize="lg">
              {ticket.subject}
            </Text>
            <Text fontSize="sm" color="gray.400">
              {ticket.userName ? `${ticket.userName} · ` : ""}
              {ticket.userEmail}
            </Text>
            <HStack spacing={2} fontSize="xs" color="gray.500" className="inter">
              {ticket.category ? (
                <>
                  <Text>{CATEGORY_LABELS[ticket.category as TicketCategory] ?? ticket.category}</Text>
                  <Text>·</Text>
                </>
              ) : null}
              <Text>Erstellt {formatDateTime(ticket.created_at)}</Text>
              <Text>·</Text>
              <Text color={response.isPending ? "var(--color-accent-gold-light)" : "gray.500"}>
                {response.isPending ? response.label : `Erste Antwort nach ${response.label}`}
              </Text>
            </HStack>
          </Stack>

          <HStack spacing={3}>
            <Box>
              <Text fontSize="10px" color="gray.500" mb={1} textTransform="uppercase" letterSpacing="0.06em">
                Status
              </Text>
              <Select
                size="sm"
                value={ticket.status}
                isDisabled={savingStatus}
                onChange={(e) => void updateField({ status: e.target.value })}
                bg="whiteAlpha.50"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Box>
            <Box>
              <Text fontSize="10px" color="gray.500" mb={1} textTransform="uppercase" letterSpacing="0.06em">
                Priorität
              </Text>
              <Select
                size="sm"
                value={ticket.priority}
                isDisabled={savingPriority}
                onChange={(e) => void updateField({ priority: e.target.value })}
                bg="whiteAlpha.50"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </Select>
            </Box>
          </HStack>
        </Flex>
      </Box>

      <Stack spacing={4}>
        {messages.map((m) => (
          <AdminMessageBubble key={m.id} message={m} />
        ))}
      </Stack>

      <Box p={5} borderRadius="14px" borderWidth="1px" borderColor="whiteAlpha.200" bg="whiteAlpha.50">
        <Stack spacing={3}>
          <Text className="inter-semibold" fontSize="sm" color="whiteAlpha.900">
            Antworten
          </Text>
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Deine Antwort an den Nutzer..."
            rows={5}
            bg="whiteAlpha.50"
          />
          <Text fontSize="xs" color="gray.500">
            Der Nutzer erhält automatisch eine E-Mail-Benachrichtigung.
          </Text>
          <Button
            alignSelf="flex-end"
            leftIcon={<Send size={16} />}
            onClick={() => void submitReply()}
            isLoading={sending}
            isDisabled={reply.trim().length === 0}
            colorScheme="yellow"
          >
            Antwort senden
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}

function AdminMessageBubble({ message }: { message: TicketMessageRow }) {
  const isAdmin = message.sender_type === "admin";
  return (
    <Flex justify={isAdmin ? "flex-end" : "flex-start"}>
      <Box
        maxW={{ base: "90%", md: "75%" }}
        p={4}
        borderRadius="14px"
        bg={isAdmin ? "rgba(212,175,55,0.08)" : "whiteAlpha.50"}
        borderWidth="1px"
        borderColor={isAdmin ? "rgba(212,175,55,0.28)" : "whiteAlpha.200"}
      >
        <HStack spacing={2} mb={2}>
          <Text
            fontSize="10px"
            letterSpacing="0.08em"
            textTransform="uppercase"
            className="inter-semibold"
            color={isAdmin ? "var(--color-accent-gold-light)" : "gray.400"}
          >
            {isAdmin ? "Admin" : "Nutzer"}
          </Text>
          <Text fontSize="10px" color="gray.500" className="inter">
            {formatDateTime(message.created_at)}
          </Text>
        </HStack>
        <Text className="inter" fontSize="sm" color="whiteAlpha.900" whiteSpace="pre-wrap">
          {message.body}
        </Text>
      </Box>
    </Flex>
  );
}
