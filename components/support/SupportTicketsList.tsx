"use client";

import { Box, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { NewTicketModal } from "@/components/support/NewTicketModal";
import {
  CATEGORY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  formatDateTime,
  formatResponseTime,
  type TicketCategory,
  type TicketStatus,
} from "@/lib/support/shared";

export interface SupportTicketRow {
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

export function SupportTicketsList({ tickets }: { tickets: SupportTicketRow[] }) {
  return (
    <Stack spacing={6}>
      <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Text className="inter" fontSize="sm" color="var(--color-text-secondary)">
          {tickets.length === 0
            ? "Du hast noch keine Support-Anfragen gestellt."
            : `${tickets.length} Ticket${tickets.length === 1 ? "" : "s"}`}
        </Text>
        <NewTicketModal />
      </Flex>

      {tickets.length === 0 ? (
        <GlassCard>
          <Stack spacing={2} align="center" py={8}>
            <MessageCircle size={28} color="var(--color-accent-gold-light)" />
            <Text className="inter" color="var(--color-text-secondary)" textAlign="center">
              Hast du eine Frage oder ein Problem? Erstelle ein Ticket — unser Team antwortet direkt hier.
            </Text>
          </Stack>
        </GlassCard>
      ) : (
        <Stack spacing={3}>
          {tickets.map((t) => {
            const response = formatResponseTime(t.created_at, t.first_response_at);
            return (
              <Box
                key={t.id}
                as={Link}
                href={`/support/${t.id}`}
                display="block"
                p={5}
                borderRadius="14px"
                border="1px solid rgba(255,255,255,0.09)"
                bg="rgba(255,255,255,0.03)"
                transition="all 150ms ease"
                _hover={{ borderColor: "rgba(212,175,55,0.45)", bg: "rgba(255,255,255,0.05)" }}
              >
                <Flex justify="space-between" align="flex-start" gap={4} flexWrap="wrap">
                  <Stack spacing={1.5} minW={0} flex={1}>
                    <HStack spacing={2}>
                      <Box w="8px" h="8px" borderRadius="full" bg={STATUS_COLORS[t.status]} flexShrink={0} />
                      <Text className="inter-semibold" color="var(--color-text-primary)" fontSize="md" isTruncated>
                        {t.subject}
                      </Text>
                    </HStack>
                    <HStack spacing={2} fontSize="xs" color="var(--color-text-tertiary)" className="inter">
                      <Text>{STATUS_LABELS[t.status]}</Text>
                      {t.category ? (
                        <>
                          <Text>·</Text>
                          <Text>{CATEGORY_LABELS[t.category as TicketCategory] ?? t.category}</Text>
                        </>
                      ) : null}
                      <Text>·</Text>
                      <Text>Erstellt {formatDateTime(t.created_at)}</Text>
                    </HStack>
                  </Stack>
                  <Text
                    fontFamily="var(--font-mono)"
                    fontSize="xs"
                    color={response.isPending ? "var(--color-accent-gold-light)" : "var(--color-text-secondary)"}
                    whiteSpace="nowrap"
                  >
                    {response.isPending ? response.label : `Antwort nach ${response.label}`}
                  </Text>
                </Flex>
              </Box>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
