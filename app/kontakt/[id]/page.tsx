import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";
import { RechtsLinks } from "@/components/legal/RechtsFusszeile";
import { TicketThread, type TicketDetailRow, type TicketMessageRow } from "@/components/support/TicketThread";
import { istUuid } from "@/lib/support/kontakt-shared";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dein Anliegen · Capital Circle",
  // Der Token steht in der Adresse: nicht indexieren, nicht als Verweis weitergeben.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * Verlauf eines Kontakt-Tickets ohne Anmeldung (`/kontakt/<id>?t=<token>`).
 *
 * Der Token aus der Bestätigungsmail ersetzt das Konto. Stimmt er nicht oder
 * gehört das Ticket einem Mitglied, ist die Antwort 404, nicht „falscher
 * Token": Von außen soll sich nicht erkennen lassen, welche IDs existieren.
 * Gelesen wird über den Service-Client; die RLS von `support_tickets` schließt
 * anonyme Zugriffe aus, und genau das soll so bleiben.
 */
export default async function KontaktVerlaufPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  const token = Array.isArray(t) ? t[0] : t;

  if (!istUuid(id) || !istUuid(token)) notFound();

  const service = createServiceClient();
  const { data: ticket } = await service
    .from("support_tickets")
    .select("id,subject,category,status,priority,created_at,first_response_at,resolved_at,updated_at")
    .eq("id", id)
    .eq("zugangs_token", token)
    .is("user_id", null)
    .maybeSingle();

  if (!ticket) notFound();

  const { data: nachrichten } = await service
    .from("support_ticket_messages")
    .select("id,sender_type,sender_id,body,created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const detail = ticket as TicketDetailRow;

  return (
    <Box
      position="relative"
      minH="100vh"
      bg="var(--cc-bg)"
      color="var(--cc-text)"
      px={{ base: 4, md: 8 }}
      py={{ base: 10, md: 16 }}
      overflowX="clip"
    >
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />

      <Stack position="relative" zIndex={1} maxW="800px" mx="auto" gap={{ base: 6, md: 8 }}>
        <Stack gap={4}>
          <Link href="/kontakt" style={{ width: "fit-content" }}>
            <Flex
              align="center"
              gap={2}
              fontSize="14px"
              color="var(--cc-text-2)"
              transition="color 180ms var(--cc-ease)"
              _hover={{ color: "var(--cc-text)" }}
            >
              <ArrowLeft size={16} strokeWidth={1.75} />
              Neue Nachricht schreiben
            </Flex>
          </Link>
          <Stack gap={2}>
            <Text
              fontSize="13px"
              lineHeight="18px"
              fontWeight={500}
              letterSpacing="0.12em"
              textTransform="uppercase"
              color="var(--cc-gold-light)"
            >
              Dein Anliegen
            </Text>
            <Box as="h1" fontSize={{ base: "26px", md: "34px" }} lineHeight={1.15} fontWeight={600} overflowWrap="anywhere">
              {detail.subject}
            </Box>
            <Text fontSize="13px" lineHeight={1.6} color="var(--cc-text-3)">
              Diese Seite ist nur mit deinem persönlichen Link erreichbar. Gib ihn bitte nicht weiter.
            </Text>
          </Stack>
        </Stack>

        <TicketThread
          ticket={detail}
          messages={(nachrichten as TicketMessageRow[] | null) ?? []}
          sendeUrl={`/api/kontakt/${id}/messages?t=${token}`}
          geschlossenHinweis="Dieses Anliegen ist geschlossen. Schreib uns bei Bedarf eine neue Nachricht."
        />

        <RechtsLinks maxW="720px" mx="auto" />
      </Stack>
    </Box>
  );
}
