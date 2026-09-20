"use client";

import { Box, Button, Flex, HStack, Stack, Text, Textarea, useToast } from "@chakra-ui/react";
import { Send } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashCard, Meta } from "@/components/platform/dashboard/primitives";
import { TicketStatusDot } from "@/components/support/TicketStatusDot";
import {
  CATEGORY_LABELS,
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

/** Eingabefeld auf Glas: Haarlinie, beim Hover Gold-Kante, Fokus in Gold. */
const FIELD_SX = {
  bg: "rgba(255, 255, 255, 0.03)",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(212, 176, 128, 0.4)" },
  _focusVisible: { borderColor: "var(--cc-gold)", boxShadow: "0 0 0 1px var(--cc-gold)" },
};

export function TicketThread({
  ticket,
  messages,
  sendeUrl,
  geschlossenHinweis = "Dieses Ticket ist geschlossen. Erstelle bei Bedarf ein neues Ticket.",
}: {
  ticket: TicketDetailRow;
  messages: TicketMessageRow[];
  /** Ziel für neue Nachrichten. Standard: die Route für angemeldete Mitglieder. */
  sendeUrl?: string;
  geschlossenHinweis?: string;
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
      const res = await fetch(sendeUrl ?? `/api/support/tickets/${ticket.id}/messages`, {
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
    <Stack spacing={5}>
      <Box className="cc-card cc-card--still cc-rise" style={{ animationDelay: "80ms" }} p={{ base: 5, md: 6 }}>
        <Stack spacing={2.5}>
          <HStack spacing={2}>
            <TicketStatusDot status={ticket.status} size={9} />
            <Text fontSize="15px" fontWeight={600} color="var(--cc-text)">
              {STATUS_LABELS[ticket.status]}
            </Text>
          </HStack>
          <Box overflow="hidden">
            <Flex className="cc-meta-row" wrap="wrap" rowGap={0.5} fontSize="13px" color="var(--cc-text-2)">
              {ticket.category ? (
                <Box as="span" className="cc-meta-item">
                  {CATEGORY_LABELS[ticket.category as TicketCategory] ?? ticket.category}
                </Box>
              ) : null}
              <Box as="span" className="cc-meta-item cc-num">
                Erstellt {formatDateTime(ticket.created_at)}
              </Box>
              <Box
                as="span"
                className="cc-meta-item cc-num"
                color={response.isPending ? "var(--cc-gold-light)" : undefined}
              >
                {response.isPending ? response.label : `Erste Antwort nach ${response.label}`}
              </Box>
            </Flex>
          </Box>
        </Stack>
      </Box>

      <Stack spacing={4} className="cc-rise" style={{ animationDelay: "150ms" }}>
        {localMessages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </Stack>

      {canReply ? (
        <DashCard
          label="Antworten"
          labelId="ticket-reply-label"
          className="cc-card--still cc-rise"
          style={{ animationDelay: "220ms" }}
        >
          <Stack spacing={3}>
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Deine Nachricht..."
              rows={4}
              aria-labelledby="ticket-reply-label"
              sx={FIELD_SX}
            />
            <Button
              alignSelf="flex-end"
              variant="gold"
              leftIcon={<Send size={16} aria-hidden />}
              onClick={() => void submit()}
              isLoading={sending}
              isDisabled={reply.trim().length === 0}
            >
              Senden
            </Button>
          </Stack>
        </DashCard>
      ) : (
        <Meta textAlign="center" color="var(--cc-text-3)">
          {geschlossenHinweis}
        </Meta>
      )}
    </Stack>
  );
}

/** Nachricht: Support in Gold-Hauch links, eigene Nachrichten neutral rechts. */
function MessageBubble({ message }: { message: TicketMessageRow }) {
  const isAdmin = message.sender_type === "admin";
  return (
    <Flex justify={isAdmin ? "flex-start" : "flex-end"}>
      <Box
        maxW={{ base: "90%", md: "75%" }}
        minW={0}
        p={4}
        borderRadius="12px"
        bg={isAdmin ? "var(--cc-gold-wash)" : "rgba(255, 255, 255, 0.04)"}
        border="1px solid"
        borderColor={isAdmin ? "rgba(212, 176, 128, 0.28)" : "var(--cc-line-strong)"}
      >
        <Flex wrap="wrap" align="baseline" columnGap={2} rowGap={0.5} mb={2}>
          <Text
            fontSize="12px"
            fontWeight={500}
            letterSpacing="0.12em"
            textTransform="uppercase"
            color={isAdmin ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
          >
            {isAdmin ? "Capital Circle Support" : "Du"}
          </Text>
          <Text className="cc-num" fontSize="12px" color="var(--cc-text-3)">
            {formatDateTime(message.created_at)}
          </Text>
        </Flex>
        <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text)" whiteSpace="pre-wrap" overflowWrap="anywhere">
          {message.body}
        </Text>
      </Box>
    </Flex>
  );
}
