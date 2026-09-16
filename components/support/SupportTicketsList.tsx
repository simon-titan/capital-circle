"use client";

import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { IconTile, Meta } from "@/components/platform/dashboard/primitives";
import { NewTicketModal } from "@/components/support/NewTicketModal";
import { TicketStatusDot } from "@/components/support/TicketStatusDot";
import {
  CATEGORY_LABELS,
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

/** Gestaffelter Einstieg (80ms + 70ms je Schritt), gedeckelt, damit lange Listen nicht nachhinken. */
function riseDelay(i: number) {
  return { animationDelay: `${80 + Math.min(i, 10) * 70}ms` };
}

export function SupportTicketsList({ tickets }: { tickets: SupportTicketRow[] }) {
  return (
    <Stack spacing={5}>
      <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Meta className="cc-num">
          {tickets.length === 0
            ? "Du hast noch keine Support-Anfragen gestellt."
            : `${tickets.length} Ticket${tickets.length === 1 ? "" : "s"}`}
        </Meta>
        <NewTicketModal />
      </Flex>

      {tickets.length === 0 ? (
        <Box className="cc-card cc-card--still cc-rise" style={riseDelay(0)} p={{ base: 6, md: 8 }}>
          <Stack spacing={4} align="center" textAlign="center">
            <IconTile>
              <MessageCircle size={24} strokeWidth={1.75} />
            </IconTile>
            <Text fontSize="16px" lineHeight={1.6} color="var(--cc-text-soft)" maxW="30rem">
              Hast du eine Frage oder ein Problem? Erstelle ein Ticket — unser Team antwortet direkt hier.
            </Text>
          </Stack>
        </Box>
      ) : (
        <Stack as="ul" spacing={3} listStyleType="none">
          {tickets.map((t, i) => {
            const response = formatResponseTime(t.created_at, t.first_response_at);
            return (
              <Box as="li" key={t.id} className="cc-rise" style={riseDelay(i)}>
                <Box
                  as={Link}
                  href={`/support/${t.id}`}
                  display="block"
                  className="cc-card"
                  p={{ base: 4, md: 5 }}
                  _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
                >
                  <Flex
                    direction={{ base: "column", sm: "row" }}
                    justify="space-between"
                    align={{ base: "flex-start", sm: "center" }}
                    gap={{ base: 2, sm: 4 }}
                  >
                    <Stack spacing={1.5} minW={0} flex={1} w="100%">
                      <Flex align="center" gap={2} minW={0}>
                        <TicketStatusDot status={t.status} />
                        <Text fontSize="16px" fontWeight={600} lineHeight={1.35} color="var(--cc-text)" isTruncated>
                          {t.subject}
                        </Text>
                      </Flex>
                      <Box overflow="hidden">
                        <Flex className="cc-meta-row" wrap="wrap" rowGap={0.5} fontSize="13px" color="var(--cc-text-2)">
                          <Box as="span" className="cc-meta-item">
                            {STATUS_LABELS[t.status]}
                          </Box>
                          {t.category ? (
                            <Box as="span" className="cc-meta-item">
                              {CATEGORY_LABELS[t.category as TicketCategory] ?? t.category}
                            </Box>
                          ) : null}
                          <Box as="span" className="cc-meta-item cc-num">
                            Erstellt {formatDateTime(t.created_at)}
                          </Box>
                        </Flex>
                      </Box>
                    </Stack>
                    <Text
                      className="cc-num"
                      fontSize="13px"
                      color={response.isPending ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
                      whiteSpace="nowrap"
                    >
                      {response.isPending ? response.label : `Antwort nach ${response.label}`}
                    </Text>
                  </Flex>
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
