import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HStack, Stack, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { TicketThread, type TicketDetailRow, type TicketMessageRow } from "@/components/support/TicketThread";

export const metadata: Metadata = {
  title: "Ticket — Capital Circle Support",
};

export const dynamic = "force-dynamic";

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    redirect("/login");
  }

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id,subject,category,status,priority,created_at,first_response_at,resolved_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) {
    notFound();
  }

  const { data: messages } = await supabase
    .from("support_ticket_messages")
    .select("id,sender_type,sender_id,body,created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  return (
    <Stack spacing={{ base: 6, md: 8 }} maxW="800px" mx="auto" w="full">
      <Stack spacing={2}>
        <HStack
          as={Link}
          href="/support"
          spacing={2}
          fontSize="xs"
          color="var(--color-text-tertiary)"
          className="inter"
          _hover={{ color: "var(--color-accent-gold-light)" }}
        >
          <ArrowLeft size={14} />
          <Text>Zurück zur Übersicht</Text>
        </HStack>
        <Text
          as="h1"
          className="radley-regular"
          fontWeight={400}
          fontSize={{ base: "2xl", md: "3xl" }}
          lineHeight="1.2"
          color="var(--color-text-primary)"
        >
          {ticket.subject}
        </Text>
      </Stack>

      <TicketThread ticket={ticket as TicketDetailRow} messages={(messages as TicketMessageRow[] | null) ?? []} />
    </Stack>
  );
}
