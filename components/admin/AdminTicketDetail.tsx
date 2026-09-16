"use client";

import { Box, Button, Flex, HStack, Select, Spinner, Stack, Text, Textarea, useToast } from "@chakra-ui/react";
import { Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_CARD_CLASS,
  AdminCardTitle,
  AdminLabel,
  adminCardPadding,
  adminInputProps,
  adminOptionStyle,
} from "@/components/admin/adminUi";
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
        <Spinner size="sm" color="var(--cc-gold)" />
        <Text fontSize="sm" color="var(--cc-text-2)">
          Ticket wird geladen...
        </Text>
      </HStack>
    );
  }

  if (error || !ticket) {
    return (
      <Text color="var(--cc-danger)" fontSize="sm">
        {error ?? "Ticket nicht gefunden."}
      </Text>
    );
  }

  const response = formatResponseTime(ticket.created_at, ticket.first_response_at);

  return (
    <Stack gap={6}>
      <Box className={ADMIN_CARD_CLASS} p={adminCardPadding}>
        <Flex justify="space-between" align="flex-start" gap={4} flexWrap="wrap">
          <Stack spacing={1.5} minW={0}>
            <Text fontWeight={600} color="var(--cc-text)" fontSize="18px" lineHeight={1.3}>
              {ticket.subject}
            </Text>
            <Text fontSize="sm" color="var(--cc-text-2)">
              {ticket.userName ? `${ticket.userName} · ` : ""}
              {ticket.userEmail}
            </Text>
            <HStack spacing={2} fontSize="xs" color="var(--cc-text-3)" flexWrap="wrap">
              {ticket.category ? (
                <>
                  <Text>{CATEGORY_LABELS[ticket.category as TicketCategory] ?? ticket.category}</Text>
                  <Text>·</Text>
                </>
              ) : null}
              <Text className="cc-num">Erstellt {formatDateTime(ticket.created_at)}</Text>
              <Text>·</Text>
              <Text className="cc-num" color={response.isPending ? "var(--cc-gold-light)" : "var(--cc-text-3)"}>
                {response.isPending ? response.label : `Erste Antwort nach ${response.label}`}
              </Text>
            </HStack>
          </Stack>

          <HStack spacing={3}>
            <Box>
              <AdminLabel mb={1.5}>Status</AdminLabel>
              <Select
                size="sm"
                value={ticket.status}
                isDisabled={savingStatus}
                onChange={(e) => void updateField({ status: e.target.value })}
                {...adminInputProps}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} style={adminOptionStyle}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Box>
            <Box>
              <AdminLabel mb={1.5}>Priorität</AdminLabel>
              <Select
                size="sm"
                value={ticket.priority}
                isDisabled={savingPriority}
                onChange={(e) => void updateField({ priority: e.target.value })}
                {...adminInputProps}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p} style={adminOptionStyle}>
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

      <Box className={ADMIN_CARD_CLASS} p={adminCardPadding}>
        <Stack spacing={3}>
          <AdminCardTitle>Antworten</AdminCardTitle>
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Deine Antwort an den Nutzer..."
            rows={5}
            {...adminInputProps}
          />
          <Text fontSize="xs" color="var(--cc-text-2)">
            Der Nutzer erhält automatisch eine E-Mail-Benachrichtigung.
          </Text>
          <Button
            alignSelf="flex-end"
            variant="gold"
            leftIcon={<Send size={16} />}
            onClick={() => void submitReply()}
            isLoading={sending}
            isDisabled={reply.trim().length === 0}
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
        borderRadius="12px"
        bg={isAdmin ? "var(--cc-gold-wash)" : "rgba(255, 255, 255, 0.03)"}
        border="1px solid"
        borderColor={isAdmin ? "rgba(212, 176, 128, 0.22)" : "var(--cc-line)"}
      >
        <HStack spacing={2} mb={2}>
          <Text
            fontSize="11px"
            letterSpacing="0.08em"
            textTransform="uppercase"
            fontWeight={600}
            color={isAdmin ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
          >
            {isAdmin ? "Admin" : "Nutzer"}
          </Text>
          <Text className="cc-num" fontSize="11px" color="var(--cc-text-3)">
            {formatDateTime(message.created_at)}
          </Text>
        </HStack>
        <Text fontSize="sm" color="var(--cc-text)" whiteSpace="pre-wrap" lineHeight={1.6}>
          {message.body}
        </Text>
      </Box>
    </Flex>
  );
}
