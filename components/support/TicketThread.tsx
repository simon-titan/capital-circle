"use client";

import { Box, Button, Flex, HStack, Stack, Text, Textarea, useToast } from "@chakra-ui/react";
import { Send } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  CATEGORY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  formatDateTime,
  formatResponseTime,
  type TicketCategory,
  type TicketStatus,
} from "@/lib/support/shared";

export interface TicketMessageRow {
  id: string;
  sender_type: "user" | "admin";
  sender_id: string | null;
  body: string;
  created_at: string;
}

export interface TicketDetailRow {
  id: string;
  subject: string;
  category: string | null;
  status: TicketStatus;
  priority: string;
  created_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  updated_at: string;
}

export function TicketThread({
  ticket,
  messages,
}: {
  ticket: TicketDetailRow;
  messages: TicketMessageRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [localMessages, setLocalMessages] = useState(messages);
  const response = formatResponseTime(ticket.created_at, ticket.first_response_at);
  const canReply = ticket.status !== "closed";

  const submit = async () => {
    const body = reply.trim();
    if (!body) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: body }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: TicketMessageRow; error?: string };
      if (!res.ok || !json.ok || !json.message) {
        toast({ title: "Antwort konnte nicht gesendet werden", description: json.error, status: "error", duration: 4000 });
        return;
      }
      setLocalMessages((prev) => [...prev, json.message as TicketMessageRow]);
      setReply("");
      router.refresh();
    } catch {
      toast({ title: "Netzwerkfehler", description: "Bitte versuche es erneut.", status: "error", duration: 4000 });
    } finally {
      setSending(false);
    }
  };

  return (
    <Stack spacing={6}>
      <GlassCard>
        <Stack spacing={3}>
          <HStack spacing={2}>
            <Box w="9px" h="9px" borderRadius="full" bg={STATUS_COLORS[ticket.status]} flexShrink={0} />
            <Text className="inter-semibold" fontSize="sm" color="var(--color-text-primary)">
              {STATUS_LABELS[ticket.status]}
            </Text>
          </HStack>
          <HStack spacing={2} fontSize="xs" color="var(--color-text-tertiary)" className="inter" flexWrap="wrap">
            {ticket.category ? (
              <>
                <Text>{CATEGORY_LABELS[ticket.category as TicketCategory] ?? ticket.category}</Text>
                <Text>·</Text>
              </>
            ) : null}
            <Text>Erstellt {formatDateTime(ticket.created_at)}</Text>
            <Text>·</Text>
            <Text color={response.isPending ? "var(--color-accent-gold-light)" : undefined}>
              {response.isPending ? response.label : `Erste Antwort nach ${response.label}`}
            </Text>
          </HStack>
        </Stack>
      </GlassCard>

      <Stack spacing={4}>
        {localMessages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </Stack>

      {canReply ? (
        <GlassCard>
          <Stack spacing={3}>
            <Text className="inter-semibold" fontSize="sm" color="var(--color-text-primary)">
              Antworten
            </Text>
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Deine Nachricht..."
              rows={4}
            />
            <Button
              alignSelf="flex-end"
              leftIcon={<Send size={16} />}
              onClick={() => void submit()}
              isLoading={sending}
              isDisabled={reply.trim().length === 0}
              bg="linear-gradient(135deg, #D4AF37 0%, #A67C00 100%)"
              color="#0a0a0a"
              className="inter-semibold"
              _hover={{ filter: "brightness(1.08)" }}
            >
              Senden
            </Button>
          </Stack>
        </GlassCard>
      ) : (
        <Text fontSize="sm" color="var(--color-text-tertiary)" className="inter" textAlign="center">
          Dieses Ticket ist geschlossen. Erstelle bei Bedarf ein neues Ticket.
        </Text>
      )}
    </Stack>
  );
}

function MessageBubble({ message }: { message: TicketMessageRow }) {
  const isAdmin = message.sender_type === "admin";
  return (
    <Flex justify={isAdmin ? "flex-start" : "flex-end"}>
      <Box
        maxW={{ base: "90%", md: "75%" }}
        p={4}
        borderRadius="14px"
        bg={isAdmin ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.05)"}
        border="1px solid"
        borderColor={isAdmin ? "rgba(212,175,55,0.28)" : "rgba(255,255,255,0.10)"}
      >
        <HStack spacing={2} mb={2}>
          <Text
            fontSize="10px"
            letterSpacing="0.08em"
            textTransform="uppercase"
            className="inter-semibold"
            color={isAdmin ? "var(--color-accent-gold-light)" : "var(--color-text-tertiary)"}
          >
            {isAdmin ? "Capital Circle Support" : "Du"}
          </Text>
          <Text fontSize="10px" color="var(--color-text-tertiary)" className="inter">
            {formatDateTime(message.created_at)}
          </Text>
        </HStack>
        <Text className="inter" fontSize="sm" color="var(--color-text-primary)" whiteSpace="pre-wrap">
          {message.body}
        </Text>
      </Box>
    </Flex>
  );
}
